/**
 * Market system.
 *
 * Price drift: each tick every ore's price performs a bounded random walk
 * controlled by its `volatilityIndex` (ORES table). Prices are clamped to
 * `[baseValue × MARKET_MIN_MULT, baseValue × MARKET_MAX_MULT]`.
 *
 * All randomness flows through the `market` sub-generator (see
 * rng/subGenerators.ts); the PRNG state is serialised with the world.
 *
 * Federal Transporter: every `FED_TRANSPORTER_INTERVAL_TICKS` we drain
 * each player's queued `MarketOrder`s. Sell orders debit the originating
 * colony's ore stocks at `price × (1 − spread)` and credit the player.
 * Buy orders debit the player's credits at `price × (1 + spread)` and
 * credit the colony's ore stocks. Orders that cannot be fulfilled (no
 * stock / no credits) are dropped with an amber `command.rejected` event.
 *
 * Market shocks: every `MARKET_SHOCK_INTERVAL_TICKS` the event
 * sub-generator rolls (p = 0.25) a one-shot multiplier (0.6× / 1.4×)
 * against a random ore and emits a `market.shock` event.
 */

import { ORES } from '@fab/content';
import type { MarketOrder, MarketPrices, OreKind, Player, World } from '@fab/domain';
import { ORE_KINDS } from '@fab/domain';
import type { Prng } from '../rng/mulberry32';
import type { PrngRegistry } from '../rng/subGenerators';
import {
  FED_TRANSPORTER_INTERVAL_TICKS,
  FED_TRANSPORTER_SPREAD,
  MARKET_MAX_MULT,
  MARKET_MIN_MULT,
  MARKET_SHOCK_INTERVAL_TICKS,
} from '../time';
import { emitEvent } from './events';

const clampPrice = (kind: OreKind, price: number): number => {
  const base = ORES[kind].baseValue;
  return Math.max(base * MARKET_MIN_MULT, Math.min(base * MARKET_MAX_MULT, price));
};

/** Baseline drift step: mean-reverting random walk. */
export const driftPrices = (market: MarketPrices, rng: Prng): void => {
  market.phase += 1;
  for (const kind of ORE_KINDS) {
    const def = ORES[kind];
    const cur = market.current[kind];
    const noise = (rng.next() - 0.5) * 2 * def.volatilityIndex * def.baseValue * 0.05;
    const reversion = (def.baseValue - cur) * 0.002;
    market.current[kind] = clampPrice(kind, cur + reversion + noise);
  }
};

const rollShock = (market: MarketPrices, world: World, rng: Prng): void => {
  if (rng.next() > 0.25) return;
  const kind = rng.pick(ORE_KINDS);
  const mult = rng.next() < 0.5 ? 0.6 : 1.4;
  market.current[kind] = clampPrice(kind, market.current[kind] * mult);
  emitEvent(world, {
    kind: 'market.shock',
    severity: 'amber',
    ore: kind,
    multiplier: mult,
    tick: world.tick,
  });
};

/**
 * Stream E4 — supply/demand elasticity. After each Federal
 * Transporter cycle we sum tonnes bought vs. sold per ore and nudge
 * the spot price proportionally. Net buying inflates the price (demand
 * pressure), net selling deflates it (glut). Magnitude is intentionally
 * small (`ELASTICITY` and a `tanh` saturator) so a single ill-timed
 * order cannot crash an ore market — sustained one-sided flow is
 * required to move the price meaningfully.
 */
const SUPPLY_DEMAND_ELASTICITY = 0.04;
const SUPPLY_DEMAND_REFERENCE_TONNES = 200;

const applySupplyDemand = (
  market: MarketPrices,
  flow: ReadonlyMap<OreKind, { sold: number; bought: number }>,
): void => {
  for (const [kind, f] of flow) {
    const net = f.bought - f.sold;
    if (net === 0) continue;
    // Saturating signal; ±1 caps at >SUPPLY_DEMAND_REFERENCE_TONNES net flow.
    const signal = Math.tanh(net / SUPPLY_DEMAND_REFERENCE_TONNES);
    const factor = 1 + SUPPLY_DEMAND_ELASTICITY * signal;
    market.current[kind] = clampPrice(kind, market.current[kind] * factor);
  }
};

const resolveOrder = (
  world: World,
  player: Player,
  order: MarketOrder,
  flow: Map<OreKind, { sold: number; bought: number }>,
): 'ok' | string => {
  const asteroid = world.asteroids.get(order.asteroid);
  if (!asteroid) return 'asteroid missing';
  if (asteroid.ownerId !== player.id) return 'not owner';
  const price = world.market.current[order.ore];
  const bucket = flow.get(order.ore) ?? { sold: 0, bought: 0 };
  if (order.side === 'sell') {
    const have = asteroid.stocks.ores[order.ore] ?? 0;
    const sold = Math.min(order.tonnes, have);
    if (sold <= 0) return 'no stock';
    const revenue = Math.floor(sold * price * (1 - FED_TRANSPORTER_SPREAD));
    asteroid.stocks.ores[order.ore] = have - sold;
    player.credits += revenue;
    player.totalCreditsEarned += revenue;
    bucket.sold += sold;
    flow.set(order.ore, bucket);
    return 'ok';
  }
  const unitCost = price * (1 + FED_TRANSPORTER_SPREAD);
  const canAfford = Math.floor(player.credits / unitCost);
  const bought = Math.min(order.tonnes, Math.max(0, canAfford));
  if (bought <= 0) return 'insufficient credits';
  const cost = Math.ceil(bought * unitCost);
  player.credits -= cost;
  asteroid.stocks.ores[order.ore] = (asteroid.stocks.ores[order.ore] ?? 0) + bought;
  bucket.bought += bought;
  flow.set(order.ore, bucket);
  return 'ok';
};

const resolveFederalTransporter = (world: World): void => {
  const flow = new Map<OreKind, { sold: number; bought: number }>();
  for (const player of world.players.values()) {
    if (!player.alive) continue;
    for (const order of player.marketOrders) {
      const result = resolveOrder(world, player, order, flow);
      if (result !== 'ok') {
        emitEvent(world, {
          kind: 'command.rejected',
          severity: 'amber',
          reason: `federalTransporter: ${result}`,
          tick: world.tick,
        });
      }
    }
    player.marketOrders = [];
  }
  applySupplyDemand(world.market, flow);
};

/** Entry point invoked from the tick pipeline. */
export const marketPhase = (world: World, reg: PrngRegistry): void => {
  driftPrices(world.market, reg.get('market'));
  if (world.tick > 0 && world.tick % MARKET_SHOCK_INTERVAL_TICKS === 0) {
    rollShock(world.market, world, reg.get('event'));
  }
  if (world.tick > 0 && world.tick >= world.federalTransporterNextTick) {
    resolveFederalTransporter(world);
    world.federalTransporterNextTick = world.tick + FED_TRANSPORTER_INTERVAL_TICKS;
  }
};
