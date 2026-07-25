/**
 * Phase 10 — Victory Conditions.
 *
 * Five conditions (spec §H):
 *   1. Economic   — control market price of ≥3 ores for 300 consecutive ticks.
 *   2. Military   — destroy all rival asteroids or eliminate all rival players.
 *   3. Diplomatic — hold active alliances/vassalages totalling ≥5 other races.
 *   4. Scientific — unlock all blueprints in CONTENT.
 *   5. Survival   — survive time limit with pop > 0 (scenario-specific).
 *
 * First player to meet any condition wins. Game continues in observation
 * mode; a red "command.rejected:gameOver" event is emitted once.
 */

import { BLUEPRINTS, SCENARIOS } from '@fab/content';
import type { BlueprintId, Player, PlayerId, VictoryCondition, VictoryKind, World } from '@fab/domain';
import { DEFAULT_DIFFICULTY, DIFFICULTY_MODIFIERS } from '@fab/domain';
import { TICKS_PER_SIM_DAY } from '../time';
import { emitEvent } from './events';

/**
 * Maps the human-facing `VictoryCondition` names used in scenario
 * definitions (spec §H) to the internal `VictoryKind` enum the sim uses
 * when recording an outcome. Exported so tests can assert the mapping
 * directly without hard-coding literals.
 */
export const VICTORY_CONDITION_TO_KIND: Readonly<Record<VictoryCondition, VictoryKind>> = {
  corporateLoyalty: 'economic',
  independence: 'diplomatic',
  scientificSupremacy: 'scientific',
  militaryDominance: 'military',
  survivor: 'survival',
};

/**
 * Set of victory kinds the current scenario allows. A `null` return means
 * the world's `scenarioId` is not registered in `SCENARIOS` (typical for
 * unit-test fixtures built via `makeMiniWorld`); in that case every kind
 * is eligible — i.e. the guard defaults to the pre-existing behaviour.
 */
const allowedVictoryKinds = (world: World): ReadonlySet<VictoryKind> | null => {
  const scenario = SCENARIOS[world.scenarioId as keyof typeof SCENARIOS];
  if (!scenario) return null;
  const kinds = new Set<VictoryKind>();
  for (const c of scenario.victoryConditions) kinds.add(VICTORY_CONDITION_TO_KIND[c]);
  return kinds;
};

const ECONOMIC_CONTROL_REQUIRED_ORES = 3;
const ECONOMIC_CONTROL_TICKS_REQUIRED = 300;
const DIPLOMATIC_PARTNERS_REQUIRED = 5;

const allBlueprintIds = Object.keys(BLUEPRINTS) as BlueprintId[];

/** Per-ore map of player → total tonnes across their colonies. */
const collectOreOwnership = (world: World): Map<string, Map<PlayerId, number>> => {
  const totals = new Map<string, Map<PlayerId, number>>();
  for (const a of world.asteroids.values()) {
    if (!a.ownerId) continue;
    for (const [ore, tonnes] of Object.entries(a.stocks.ores)) {
      const t = tonnes ?? 0;
      if (t <= 0) continue;
      let inner = totals.get(ore);
      if (!inner) {
        inner = new Map();
        totals.set(ore, inner);
      }
      inner.set(a.ownerId, (inner.get(a.ownerId) ?? 0) + t);
    }
  }
  return totals;
};

/** Player holding the largest positive reserves, or null on empty. */
const topHolder = (inner: Map<PlayerId, number>): PlayerId | null => {
  let topPid: PlayerId | null = null;
  let topVal = -1;
  for (const [pid, v] of inner) {
    if (v > topVal) {
      topVal = v;
      topPid = pid;
    }
  }
  return topVal > 0 ? topPid : null;
};

/** Count ore markets in which this player holds the largest colony reserves. */
const controlledOres = (world: World, playerId: PlayerId): number => {
  const totals = collectOreOwnership(world);
  let count = 0;
  for (const inner of totals.values()) {
    if (topHolder(inner) === playerId) count++;
  }
  return count;
};

const economic = (world: World, player: Player): boolean => {
  const owned = controlledOres(world, player.id);
  if (owned >= ECONOMIC_CONTROL_REQUIRED_ORES) {
    player.economicControlTicks += 1;
  } else {
    player.economicControlTicks = 0;
  }
  return player.economicControlTicks >= ECONOMIC_CONTROL_TICKS_REQUIRED;
};

const military = (world: World, player: Player): boolean => {
  if (world.asteroids.size === 0) return false;
  // Military is only meaningful when rivals existed at some point: a
  // single-seat scenario (e.g. the tutorial) must never declare the
  // human as "last standing" just because it spawned alone. Cheapest
  // proxy for "rivals ever existed" — the scenario seat count.
  if (world.players.size < 2) return false;
  const rivals = Array.from(world.players.values()).filter((p) => p.id !== player.id && p.alive);
  if (rivals.length === 0) return true;
  for (const a of world.asteroids.values()) {
    if (!a.ownerId) continue;
    if (a.ownerId !== player.id) return false;
  }
  return Array.from(world.asteroids.values()).some((a) => a.ownerId === player.id);
};

const diplomatic = (world: World, player: Player): boolean => {
  const partners = new Set<PlayerId>();
  for (const t of world.treaties) {
    if (t.kind !== 'defensivePact' && t.kind !== 'jointWar') continue;
    if (t.parties[0] === player.id) partners.add(t.parties[1]);
    else if (t.parties[1] === player.id) partners.add(t.parties[0]);
  }
  return partners.size >= DIPLOMATIC_PARTNERS_REQUIRED;
};

const scientific = (_world: World, player: Player): boolean => {
  if (allBlueprintIds.length === 0) return false;
  for (const id of allBlueprintIds) {
    if (!player.blueprintsOwned.has(id)) return false;
  }
  return true;
};

const survival = (world: World, player: Player): boolean => {
  const scenario = SCENARIOS[world.scenarioId as keyof typeof SCENARIOS];
  if (!scenario || scenario.timeLimitDays === null) return false;
  if (!scenario.victoryConditions.includes('survivor')) return false;
  // Stream E3 — easy mode lengthens the survival window (more time to
  // dig in), hard mode shortens it (faster pressure).
  const mod = DIFFICULTY_MODIFIERS[world.difficulty ?? DEFAULT_DIFFICULTY];
  const limitTicks = Math.round(scenario.timeLimitDays * mod.timeLimit) * TICKS_PER_SIM_DAY;
  if (world.tick < limitTicks) return false;
  if (!player.alive) return false;
  // Require at least some population.
  for (const a of world.asteroids.values()) {
    if (a.ownerId === player.id && a.population > 0) return true;
  }
  return false;
};

export interface VictoryCheck {
  player: Player;
  condition: VictoryKind;
}

/** Evaluate conditions in precedence order; first match wins. */
export const evaluateVictory = (world: World): VictoryCheck | null => {
  const players = Array.from(world.players.values()).filter((p) => p.alive);
  const allowed = allowedVictoryKinds(world);
  const conds: Array<[VictoryKind, (w: World, p: Player) => boolean]> = [
    ['military', military],
    ['scientific', scientific],
    ['diplomatic', diplomatic],
    ['economic', economic],
    ['survival', survival],
  ];
  for (const [cond, fn] of conds) {
    if (allowed && !allowed.has(cond)) continue;
    for (const player of players) {
      // economic has side-effects; always call to maintain the streak counter.
      const ok = fn(world, player);
      if (ok) return { player, condition: cond };
    }
  }
  return null;
};

export const victoryPhase = (world: World): void => {
  if (world.outcome) return;
  // Always run economic side-effect once per tick before short-circuiting.
  for (const p of world.players.values()) {
    economic(world, p);
  }
  // Short-circuit on tick 0 to avoid a bogus "military last-standing" victory
  // when rivals haven't spawned yet.
  if (world.tick < 2) return;
  const winner = evaluateVictory(world);
  if (!winner) return;
  world.outcome = {
    winnerId: winner.player.id,
    condition: winner.condition,
    atTick: world.tick,
  };
  emitEvent(world, {
    kind: 'game.over',
    severity: 'amber',
    winnerId: winner.player.id,
    condition: winner.condition,
    tick: world.tick,
  });
};
