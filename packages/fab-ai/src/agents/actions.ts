/**
 * Utility action catalogue. Each action exposes:
 *   • `kind` — slot into the personality-weight table.
 *   • `score(ctx)` — raw utility in [0, 1].
 *   • `build(ctx)` — emits a PlayerCommand, or null if preconditions fail.
 *
 * The runtime (`runtime.ts`) multiplies each score by the race personality
 * weight and picks top-k deterministically per tick.
 */

import { BLUEPRINTS, BUILDINGS, MISSILES, SHIPS } from '@fab/content';
import type { AsteroidId, OreKind, PlayerCommand, PlayerId, ShipId, ShipKind } from '@fab/domain';
import type { AiContext } from '../context';
import { curves } from '../utility';
import { type ActionKind, personalityWeight } from './personality';

export interface Action {
  kind: ActionKind;
  name: string;
  score: (ctx: AiContext) => number;
  build: (ctx: AiContext) => PlayerCommand | null;
}

const ownedAsteroids = (ctx: AiContext): AsteroidId[] => {
  const out: AsteroidId[] = [];
  for (const a of ctx.world.asteroids.values()) {
    if (a.ownerId === ctx.player) out.push(a.id);
  }
  return out;
};

const firstOwnedAsteroid = (ctx: AiContext): AsteroidId | null => ownedAsteroids(ctx)[0] ?? null;

const enemyAsteroid = (ctx: AiContext): AsteroidId | null => {
  for (const a of ctx.world.asteroids.values()) {
    if (a.ownerId && a.ownerId !== ctx.player) return a.id;
  }
  return null;
};

// Used by DispatchAgentAction (Stream B) and reserved for future
// diplomacy-aware targeting paths.
const enemyPlayer = (ctx: AiContext): PlayerId | null => {
  for (const p of ctx.world.players.values()) {
    if (p.id === ctx.player) continue;
    if (!p.alive) continue;
    return p.id;
  }
  return null;
};

/* ------------------------------------------------------------------------ */

/** Ordered build priorities — first matching gap wins. Includes life-support,
 *  power, mining, research, military production and missile defence so the
 *  AI eventually unlocks every downstream action. Stream E1 retune. */
const BUILD_PRIORITY: readonly string[] = [
  'bld.oxygen-generator',
  'bld.water-recycler',
  'bld.hydroponics-farm',
  'bld.solar-array',
  'bld.mine',
  'bld.research-lab',
  'bld.shipyard',
  'bld.missile-silo',
];

const hasBuilding = (ctx: AiContext, asteroidId: AsteroidId, kind: string): boolean => {
  const a = ctx.world.asteroids.get(asteroidId);
  if (!a) return false;
  return a.buildings.some((bid) => ctx.world.buildings.get(bid)?.defKind === kind);
};

const hasQueuedBuilding = (ctx: AiContext, asteroidId: AsteroidId, kind: string): boolean => {
  const a = ctx.world.asteroids.get(asteroidId);
  if (!a) return false;
  return a.buildQueue.some((q) => q.kind === kind);
};

type BuildingDef = {
  costCredits: number;
  blueprintRequired?: string;
  oreCost?: Record<string, number>;
};

const getBuildingDef = (kind: string): BuildingDef | undefined =>
  BUILDINGS[kind as keyof typeof BUILDINGS] as BuildingDef | undefined;

const hasOreForBuild = (
  asteroid: NonNullable<ReturnType<AiContext['world']['asteroids']['get']>>,
  oreCost: Record<string, number> | undefined,
): boolean => {
  if (!oreCost) return true;
  for (const [ore, need] of Object.entries(oreCost)) {
    const have = asteroid.stocks.ores[ore as keyof typeof asteroid.stocks.ores] ?? 0;
    if (have < need) return false;
  }
  return true;
};

const findFreeBuildCell = (
  ctx: AiContext,
  asteroid: NonNullable<ReturnType<AiContext['world']['asteroids']['get']>>,
): { x: number; y: number } | null => {
  const used = new Set(asteroid.buildQueue.map((q) => `${q.cell.x},${q.cell.y}`));
  for (const b of asteroid.buildings) {
    const built = ctx.world.buildings.get(b);
    if (built) used.add(`${built.cell.x},${built.cell.y}`);
  }
  for (let y = 0; y < asteroid.grid.height; y++) {
    for (let x = 0; x < asteroid.grid.width; x++) {
      if (!used.has(`${x},${y}`)) return { x, y };
    }
  }
  return null;
};

const canBuildKind = (
  ctx: AiContext,
  player: NonNullable<ReturnType<AiContext['world']['players']['get']>>,
  asteroidId: AsteroidId,
  asteroid: NonNullable<ReturnType<AiContext['world']['asteroids']['get']>>,
  kind: string,
): BuildingDef | null => {
  if (hasBuilding(ctx, asteroidId, kind) || hasQueuedBuilding(ctx, asteroidId, kind)) return null;
  const def = getBuildingDef(kind);
  if (!def) return null;
  if (def.blueprintRequired && !player.blueprintsOwned.has(def.blueprintRequired as never)) return null;
  if (player.credits < def.costCredits) return null;
  if (!hasOreForBuild(asteroid, def.oreCost)) return null;
  return def;
};

const tryBuildOnAsteroid = (
  ctx: AiContext,
  player: NonNullable<ReturnType<AiContext['world']['players']['get']>>,
  asteroidId: AsteroidId,
): PlayerCommand | null => {
  const asteroid = ctx.world.asteroids.get(asteroidId);
  if (!asteroid) return null;
  if (asteroid.buildQueue.length >= 2) return null;
  for (const k of BUILD_PRIORITY) {
    if (!canBuildKind(ctx, player, asteroidId, asteroid, k)) continue;
    const cell = findFreeBuildCell(ctx, asteroid);
    if (cell) return { kind: 'queueBuild', asteroid: asteroidId, building: k, cell };
  }
  return null;
};

export const BuildBuildingAction: Action = {
  kind: 'buildBuilding',
  name: 'BuildBuilding',
  score(ctx) {
    const a = firstOwnedAsteroid(ctx);
    if (!a) return 0;
    const asteroid = ctx.world.asteroids.get(a);
    if (!asteroid) return 0;
    // Higher when queue is empty; lower when queue is full.
    return curves.inverseLinear(asteroid.buildQueue.length / 3);
  },
  build(ctx) {
    const player = ctx.world.players.get(ctx.player);
    if (!player) return null;
    for (const a of ownedAsteroids(ctx)) {
      const cmd = tryBuildOnAsteroid(ctx, player, a);
      if (cmd) return cmd;
    }
    return null;
  },
};

export const ResearchAction: Action = {
  kind: 'research',
  name: 'Research',
  score(ctx) {
    const p = ctx.world.players.get(ctx.player);
    if (!p || p.activeResearch) return 0;
    return 0.5;
  },
  build(ctx) {
    const p = ctx.world.players.get(ctx.player);
    if (!p || p.activeResearch) return null;
    for (const def of Object.values(BLUEPRINTS)) {
      if (p.blueprintsOwned.has(def.id)) continue;
      if (def.requires.some((r) => !p.blueprintsOwned.has(r))) continue;
      if (p.credits < def.costCredits) continue;
      return { kind: 'startResearch', playerId: ctx.player, blueprint: def.id };
    }
    return null;
  },
};

export const ProduceShipAction: Action = {
  kind: 'produceShip',
  name: 'ProduceShip',
  score(ctx) {
    const p = ctx.world.players.get(ctx.player);
    if (!p) return 0;
    // High when we have shipyards and credits.
    let yards = 0;
    for (const a of ctx.world.asteroids.values()) {
      if (a.ownerId !== ctx.player) continue;
      for (const bid of a.buildings) {
        const b = ctx.world.buildings.get(bid);
        if (b?.defKind === 'bld.shipyard') yards++;
      }
    }
    if (yards === 0) return 0;
    return curves.smoothstep(Math.min(1, p.credits / 5_000));
  },
  build(ctx) {
    const p = ctx.world.players.get(ctx.player);
    if (!p) return null;
    // Pick the cheapest hull we can afford. Scout is the cheapest.
    let pick: ShipKind = SHIPS.scout.kind;
    if (p.credits >= SHIPS.assault.costCredits) pick = SHIPS.assault.kind;
    for (const a of ownedAsteroids(ctx)) {
      const asteroid = ctx.world.asteroids.get(a);
      if (!asteroid) continue;
      const hasYard = asteroid.buildings.some(
        (bid) => ctx.world.buildings.get(bid)?.defKind === 'bld.shipyard',
      );
      if (!hasYard) continue;
      return { kind: 'produceShip', from: ctx.player, asteroid: a, ship: pick };
    }
    return null;
  },
};

export const DispatchFleetAction: Action = {
  kind: 'dispatchFleet',
  name: 'DispatchFleet',
  score(ctx) {
    // Requires at least one owned ship + enemy asteroid.
    let myShips = 0;
    for (const s of ctx.world.ships.values()) if (s.ownerId === ctx.player) myShips++;
    if (myShips === 0) return 0;
    return enemyAsteroid(ctx) ? 0.6 : 0;
  },
  build(ctx) {
    const src = firstOwnedAsteroid(ctx);
    const dst = enemyAsteroid(ctx);
    if (!src || !dst) return null;
    const ships: ShipId[] = [];
    for (const s of ctx.world.ships.values()) {
      if (s.ownerId === ctx.player) ships.push(s.id);
    }
    if (ships.length === 0) return null;
    return {
      kind: 'launchFleet',
      from: ctx.player,
      sourceAsteroid: src,
      targetAsteroid: dst,
      ships,
    };
  },
};

export const LaunchMissileAction: Action = {
  kind: 'launchMissile',
  name: 'LaunchMissile',
  score(ctx) {
    // Has silo, has blueprint missing nothing fancy, enemy exists.
    const hasSilo = Array.from(ctx.world.asteroids.values()).some(
      (a) =>
        a.ownerId === ctx.player &&
        a.buildings.some((bid) => ctx.world.buildings.get(bid)?.defKind === 'bld.missile-silo'),
    );
    if (!hasSilo || !enemyAsteroid(ctx)) return 0;
    return 0.5;
  },
  build(ctx) {
    const src = firstOwnedAsteroid(ctx);
    const dst = enemyAsteroid(ctx);
    if (!src || !dst) return null;
    const a = ctx.world.asteroids.get(src);
    const hasSilo = !!a?.buildings.some(
      (bid) => ctx.world.buildings.get(bid)?.defKind === 'bld.missile-silo',
    );
    if (!hasSilo) return null;
    // Prefer unbriefed (no blueprint) basic missile.
    return {
      kind: 'launchMissile',
      from: ctx.player,
      fromAsteroid: src,
      target: dst,
      missile: MISSILES.basic.kind,
    };
  },
};

/** Returns the list of alive non-self players we don't already have *any*
 *  active treaty with. Stream E1 — prevents the "100 proposeTreaty" spam
 *  observed in the rev1 sanity report. Also applies a 500-tick cooldown
 *  per pair after a treaty.broken event so we don't immediately re-offer
 *  to a partner who just tore up their last agreement. */
const TREATY_COOLDOWN_TICKS = 500;
const collectTreatyCooling = (ctx: AiContext): Set<string> => {
  const cooling = new Set<string>();
  const cutoff = ctx.tick - TREATY_COOLDOWN_TICKS;
  for (let i = ctx.world.eventQueue.length - 1; i >= 0; i--) {
    const ev = ctx.world.eventQueue[i];
    if (!ev || ev.tick < cutoff) break;
    if (ev.kind === 'treaty.broken') {
      const broken = ev as { by: PlayerId; against: PlayerId };
      if (broken.by === ctx.player) cooling.add(broken.against);
      else if (broken.against === ctx.player) cooling.add(broken.by);
    }
    // command.rejected: no per-partner metadata, handled by score()'s
    // global cooldown rather than this per-pair set.
  }
  return cooling;
};

const hasExistingTreatyWith = (ctx: AiContext, other: PlayerId): boolean =>
  ctx.world.treaties.some(
    (t) =>
      (t.parties[0] === ctx.player && t.parties[1] === other) ||
      (t.parties[1] === ctx.player && t.parties[0] === other),
  );

const treatyCandidates = (ctx: AiContext): PlayerId[] => {
  const out: PlayerId[] = [];
  const me = ctx.world.players.get(ctx.player);
  if (!me) return out;
  const cooling = collectTreatyCooling(ctx);
  for (const other of ctx.world.players.values()) {
    if (other.id === ctx.player || !other.alive) continue;
    // Exclude humans: handleProposeTreaty leaves human-targeted proposals
    // pending forever (no auto-response) so re-proposing every tick is
    // pure spam. Human players initiate treaties via UI instead.
    if (other.isHuman) continue;
    const rep = me.reputation[other.id] ?? 0;
    if (rep <= -30) continue;
    if (cooling.has(other.id)) continue;
    if (hasExistingTreatyWith(ctx, other.id)) continue;
    out.push(other.id);
  }
  return out;
};

export const ProposeTreatyAction: Action = {
  kind: 'proposeTreaty',
  name: 'ProposeTreaty',
  score(ctx) {
    // Rate-limit: if our last proposal was rejected within the cooldown
    // window, hold off. We can't tell which partner rejected (the
    // command.rejected event has no playerId), so we apply a global
    // per-AI cooldown of 500 ticks. Stream E1 — drops the federation-war
    // sanity report from ~100 proposeTreaty per AI down to ~20.
    const cutoff = ctx.tick - TREATY_COOLDOWN_TICKS;
    for (let i = ctx.world.eventQueue.length - 1; i >= 0; i--) {
      const ev = ctx.world.eventQueue[i];
      if (!ev || ev.tick < cutoff) break;
      if (ev.kind === 'command.rejected' && ev.reason?.startsWith('treaty.rejected')) return 0;
    }
    const viable = treatyCandidates(ctx);
    if (viable.length === 0) return 0;
    return curves.linear(Math.min(1, viable.length / 4));
  },
  build(ctx) {
    const candidates = treatyCandidates(ctx);
    if (candidates.length === 0) return null;
    // Rotate target by tick so the same race doesn't get spammed.
    const idx = Math.abs(ctx.tick) % candidates.length;
    const target = candidates[idx];
    if (!target) return null;
    // Trade if the target has decent rep, else fall back to non-aggression.
    const me = ctx.world.players.get(ctx.player);
    const rep = me?.reputation[target] ?? 0;
    const treaty = rep >= 20 ? 'trade' : 'nonAggression';
    return { kind: 'proposeTreaty', from: ctx.player, with: target, treaty };
  },
};

export const DeclareWarAction: Action = {
  kind: 'declareWar',
  name: 'DeclareWar',
  score(ctx) {
    const p = ctx.world.players.get(ctx.player);
    if (!p) return 0;
    let worst: PlayerId | null = null;
    let worstRep = 0;
    for (const k of Object.keys(p.reputation)) {
      const v = p.reputation[k] ?? 0;
      if (v < worstRep) {
        worstRep = v;
        worst = k as PlayerId;
      }
    }
    if (!worst) return 0;
    // Cooldown: skip if we already declared war on this target within the
    // last ~2000 ticks (≈ 1.7 sim-days). Without this kryll spams 79
    // redundant declareWar commands at the human throughout the
    // federation-war scenario.
    const cutoff = ctx.tick - 2000;
    for (let i = ctx.world.eventQueue.length - 1; i >= 0; i--) {
      const ev = ctx.world.eventQueue[i];
      if (!ev || ev.tick < cutoff) break;
      if (ev.kind === 'treaty.broken' && ev.by === ctx.player && ev.against === worst) return 0;
    }
    // Suspicion proxy: rival rep <= -50 is a strong war trigger.
    return Math.min(1, Math.max(0, -worstRep / 100));
  },
  build(ctx) {
    const p = ctx.world.players.get(ctx.player);
    if (!p) return null;
    let worst: PlayerId | null = null;
    let worstRep = 0;
    for (const k of Object.keys(p.reputation)) {
      const v = p.reputation[k] ?? 0;
      if (v < worstRep) {
        worstRep = v;
        worst = k as PlayerId;
      }
    }
    if (!worst) return null;
    return { kind: 'declareWar', from: ctx.player, against: worst };
  },
};

export const TradeOnMarketAction: Action = {
  kind: 'tradeOnMarket',
  name: 'TradeOnMarket',
  score(ctx) {
    // Stream E1: skip when we already have a pending market order — the
    // marketPhase will fill orders gradually and we don't need to spam
    // the queue with new ones each strategic tick.
    const me = ctx.world.players.get(ctx.player);
    if (me && me.marketOrders.length > 0) return 0;
    // Has surplus ore.
    for (const a of ctx.world.asteroids.values()) {
      if (a.ownerId !== ctx.player) continue;
      for (const [, tonnes] of Object.entries(a.stocks.ores)) {
        if ((tonnes ?? 0) >= 5) return 0.4;
      }
    }
    return 0;
  },
  build(ctx) {
    for (const a of ctx.world.asteroids.values()) {
      if (a.ownerId !== ctx.player) continue;
      for (const [ore, tonnes] of Object.entries(a.stocks.ores)) {
        const t = tonnes ?? 0;
        if (t < 5) continue;
        return {
          kind: 'queueSellOrder',
          playerId: ctx.player,
          asteroid: a.id,
          ore: ore as OreKind,
          tonnes: Math.floor(t / 2),
        };
      }
    }
    return null;
  },
};

export const ScoutAction: Action = {
  kind: 'scout',
  name: 'Scout',
  score(ctx) {
    // Want at least one scout; if we already have one, drop interest.
    let owned = 0;
    for (const s of ctx.world.ships.values()) {
      if (s.ownerId === ctx.player && s.defKind === 'scout') owned++;
    }
    if (owned >= 2) return 0;
    // Need a shipyard to build it.
    const hasYard = Array.from(ctx.world.asteroids.values()).some(
      (a) =>
        a.ownerId === ctx.player &&
        a.buildings.some((bid) => ctx.world.buildings.get(bid)?.defKind === 'bld.shipyard'),
    );
    return hasYard ? 0.65 : 0;
  },
  build(ctx) {
    for (const a of ownedAsteroids(ctx)) {
      const asteroid = ctx.world.asteroids.get(a);
      if (!asteroid) continue;
      const hasYard = asteroid.buildings.some(
        (bid) => ctx.world.buildings.get(bid)?.defKind === 'bld.shipyard',
      );
      if (!hasYard) continue;
      return { kind: 'produceShip', from: ctx.player, asteroid: a, ship: 'scout' };
    }
    return null;
  },
};

export const ActivateAsteroidEngineAction: Action = {
  kind: 'activateAsteroidEngine',
  name: 'ActivateAsteroidEngine',
  score(ctx) {
    for (const a of ctx.world.asteroids.values()) {
      if (a.ownerId !== ctx.player) continue;
      const eng = a.buildings.some((bid) => ctx.world.buildings.get(bid)?.defKind === 'bld.asteroid-engine');
      if (eng) return 0.3;
    }
    return 0;
  },
  build(ctx) {
    for (const a of ctx.world.asteroids.values()) {
      if (a.ownerId !== ctx.player) continue;
      const eng = a.buildings.some((bid) => ctx.world.buildings.get(bid)?.defKind === 'bld.asteroid-engine');
      if (!eng) continue;
      // Aim at an enemy asteroid if any; otherwise abort.
      const tgt = enemyAsteroid(ctx);
      if (!tgt) return null;
      const t = ctx.world.asteroids.get(tgt);
      if (!t) return null;
      return {
        kind: 'setAsteroidCourse',
        from: ctx.player,
        asteroid: a.id,
        targetX: t.position.x,
        targetY: t.position.y,
        thrust: 1,
      };
    }
    return null;
  },
};

/**
 * DispatchAgentAction (Stream B / spec §C.7).
 *
 * Picks a free named operative from the espionage pool and lobs them at the
 * highest-suspicion enemy. Falls through to `null` if no agent is available.
 * The actual employer/credit deduction happens in `handleDispatchAgent`.
 */
export const DispatchAgentAction: Action = {
  kind: 'dispatchAgent',
  name: 'DispatchAgent',
  score(ctx) {
    if (!enemyPlayer(ctx)) return 0;
    const free = ctx.world.espionage?.agents.some((a) => !a.captured && a.employer === null) ?? true;
    return free ? 0.4 : 0;
  },
  build(ctx) {
    const target = enemyPlayer(ctx);
    if (!target) return null;
    // Pick the first available agent — espionage state may not yet exist.
    const liveAgents = ctx.world.espionage?.agents;
    const candidate = liveAgents
      ? liveAgents.find((a) => !a.captured && a.employer === null)
      : { id: 'agt.copper-runt' }; // fall back to weakest agent
    if (!candidate) return null;
    return {
      kind: 'dispatchAgent',
      agentId: candidate.id,
      targetPlayer: target,
      mission: 'intelGather',
    };
  },
};

export const ACTIONS: readonly Action[] = [
  BuildBuildingAction,
  ResearchAction,
  ProduceShipAction,
  DispatchFleetAction,
  LaunchMissileAction,
  ProposeTreatyAction,
  DeclareWarAction,
  TradeOnMarketAction,
  ScoutAction,
  ActivateAsteroidEngineAction,
  DispatchAgentAction,
];

export type { ActionKind };
export { personalityWeight };
