import { ORES } from '@fab/content';
import { ORE_KINDS } from '@fab/domain';
import { describe, expect, it } from 'vitest';
import { PrngRegistry } from '../rng/subGenerators';
import { makeMiniWorld } from '../test-utils/worlds';
import { MARKET_MAX_MULT, MARKET_MIN_MULT } from '../time';
import { marketPhase } from './market';

describe('market', () => {
  it('keeps prices within [MIN, MAX]×baseValue across 10 000 ticks', () => {
    const { world } = makeMiniWorld({ seed: 42 });
    const reg = PrngRegistry.restore(world.rng);
    for (let i = 0; i < 10_000; i++) {
      marketPhase(world, reg);
      world.tick += 1;
    }
    for (const kind of ORE_KINDS) {
      const base = ORES[kind].baseValue;
      const cur = world.market.current[kind];
      expect(cur).toBeGreaterThanOrEqual(base * MARKET_MIN_MULT - 1e-6);
      expect(cur).toBeLessThanOrEqual(base * MARKET_MAX_MULT + 1e-6);
    }
  });

  it('is deterministic for the same seed', () => {
    const a = makeMiniWorld({ seed: 7 });
    const b = makeMiniWorld({ seed: 7 });
    const regA = PrngRegistry.restore(a.world.rng);
    const regB = PrngRegistry.restore(b.world.rng);
    for (let i = 0; i < 500; i++) {
      marketPhase(a.world, regA);
      marketPhase(b.world, regB);
      a.world.tick += 1;
      b.world.tick += 1;
    }
    for (const kind of ORE_KINDS) {
      expect(a.world.market.current[kind]).toBe(b.world.market.current[kind]);
    }
  });

  it('Stream E4 — net selling deflates the spot price; net buying inflates', () => {
    const sellSide = makeMiniWorld({ seed: 99, credits: 10_000 });
    const buySide = makeMiniWorld({ seed: 99, credits: 10_000_000 });
    const sellAst = sellSide.world.asteroids.get(sellSide.asteroidId);
    const buyAst = buySide.world.asteroids.get(buySide.asteroidId);
    if (!sellAst || !buyAst) throw new Error('asteroid missing');
    sellAst.stocks.ores = { asteros: 5_000 };
    buyAst.stocks.ores = { asteros: 0 };
    const startPrice = sellSide.world.market.current.asteros;
    expect(buySide.world.market.current.asteros).toBe(startPrice);

    const sellPlayer = sellSide.world.players.get(sellSide.playerId);
    const buyPlayer = buySide.world.players.get(buySide.playerId);
    if (!sellPlayer || !buyPlayer) throw new Error('player missing');
    sellPlayer.marketOrders = [
      {
        id: 'mo.sell.1',
        placedTick: 0,
        side: 'sell',
        ore: 'asteros',
        tonnes: 1_000,
        asteroid: sellSide.asteroidId,
      },
    ];
    buyPlayer.marketOrders = [
      {
        id: 'mo.buy.1',
        placedTick: 0,
        side: 'buy',
        ore: 'asteros',
        tonnes: 1_000,
        asteroid: buySide.asteroidId,
      },
    ];

    const regA = PrngRegistry.restore(sellSide.world.rng);
    const regB = PrngRegistry.restore(buySide.world.rng);
    const nextCycle = sellSide.world.federalTransporterNextTick + 1;
    for (let i = 0; i < nextCycle; i++) {
      marketPhase(sellSide.world, regA);
      marketPhase(buySide.world, regB);
      sellSide.world.tick += 1;
      buySide.world.tick += 1;
    }

    // Identical RNG-driven drift in both worlds — the only differentiator
    // is the supply/demand nudge. Sell-side must finish cheaper.
    expect(sellSide.world.market.current.asteros).toBeLessThan(buySide.world.market.current.asteros);
  });
});
