/**
 * Build queue system.
 *
 * Two responsibilities:
 *   1. `enqueueBuilding(world, cmd)` validates a queue-build command:
 *        • asteroid exists and is owned by the commanding player;
 *        • building kind exists in CONTENT;
 *        • all `blueprintsRequired` are owned;
 *        • `maxPerColony` is respected (counts both finished and queued);
 *        • player can afford `costCredits` + any `oreCost` on the
 *          owning asteroid's stocks;
 *        • cell fits within the build grid.
 *      On success it deducts costs and appends a `BuildQueueItem`.
 *
 *   2. `advanceBuildQueue(world)` (called by the tick pipeline) advances
 *      every queued item by 1 tick. When `progressTicks >= totalTicks`,
 *      a `Building` is instantiated using `world.nextBuildingId` (a
 *      monotonic counter — deterministic, no RNG needed).
 *
 * Cancellation refunds 50 % of the remaining unspent cost fraction.
 */

import type { BuildingKind } from '@fab/content';
import { BUILDINGS } from '@fab/content';
import {
  type Asteroid,
  asBuildingId,
  type BuildingDef,
  type BuildingId,
  type BuildQueueItem,
  type Player,
  type PlayerCommand,
  type PlayerId,
  type World,
} from '@fab/domain';
import { emitEvent } from './events';

const getDef = (kind: string): BuildingDef | undefined =>
  (BUILDINGS as Readonly<Record<string, BuildingDef>>)[kind as BuildingKind];

export interface EnqueueResult {
  ok: boolean;
  reason?: string;
}

const countOnColony = (asteroid: Asteroid, world: World, kind: string): number => {
  let n = 0;
  for (const id of asteroid.buildings) {
    const b = world.buildings.get(id);
    if (b?.defKind === kind) n++;
  }
  for (const item of asteroid.buildQueue) {
    if (item.kind === kind) n++;
  }
  return n;
};

const checkBlueprintGate = (def: BuildingDef, player: Player): EnqueueResult | null => {
  const required = def.blueprintsRequired ?? (def.blueprintRequired ? [def.blueprintRequired] : []);
  for (const bp of required) {
    if (!player.blueprintsOwned.has(bp)) {
      return { ok: false, reason: `missing blueprint ${bp}` };
    }
  }
  return null;
};

const checkMaxPerColony = (def: BuildingDef, asteroid: Asteroid, world: World): EnqueueResult | null => {
  if (def.maxPerColony === undefined) return null;
  if (countOnColony(asteroid, world, def.kind) >= def.maxPerColony) {
    return { ok: false, reason: `max ${def.maxPerColony} per colony reached` };
  }
  return null;
};

const checkGridBounds = (
  def: BuildingDef,
  cell: { x: number; y: number },
  asteroid: Asteroid,
): EnqueueResult | null => {
  const fp = def.footprint ?? { width: 1, height: 1 };
  if (
    cell.x < 0 ||
    cell.y < 0 ||
    cell.x + fp.width > asteroid.grid.width ||
    cell.y + fp.height > asteroid.grid.height
  ) {
    return { ok: false, reason: 'footprint exceeds grid' };
  }
  return null;
};

const checkOreCost = (def: BuildingDef, asteroid: Asteroid): EnqueueResult | null => {
  if (!def.oreCost) return null;
  for (const [kind, tonnes] of Object.entries(def.oreCost)) {
    if ((asteroid.stocks.ores[kind as keyof typeof asteroid.stocks.ores] ?? 0) < tonnes) {
      return { ok: false, reason: `insufficient ore ${kind}` };
    }
  }
  return null;
};

const deductOreCost = (def: BuildingDef, asteroid: Asteroid): void => {
  if (!def.oreCost) return;
  for (const [kind, tonnes] of Object.entries(def.oreCost)) {
    const k = kind as keyof typeof asteroid.stocks.ores;
    asteroid.stocks.ores[k] = (asteroid.stocks.ores[k] ?? 0) - tonnes;
  }
};

/** Validate + accept a queueBuild command. Mutates world on success. */
export const enqueueBuilding = (
  world: World,
  cmd: Extract<PlayerCommand, { kind: 'queueBuild' }>,
  playerId: PlayerId,
): EnqueueResult => {
  const asteroid = world.asteroids.get(cmd.asteroid);
  if (!asteroid) return { ok: false, reason: 'asteroid not found' };
  if (asteroid.ownerId !== playerId) return { ok: false, reason: 'asteroid not owned by player' };
  const def = getDef(cmd.building);
  if (!def) return { ok: false, reason: `unknown building '${cmd.building}'` };
  const player = world.players.get(playerId);
  if (!player) return { ok: false, reason: 'player not found' };

  const failure =
    checkBlueprintGate(def, player) ??
    checkMaxPerColony(def, asteroid, world) ??
    checkGridBounds(def, cmd.cell, asteroid) ??
    (player.credits < def.costCredits ? { ok: false, reason: 'insufficient credits' } : null) ??
    checkOreCost(def, asteroid);
  if (failure) return failure;

  // Deduct.
  player.credits -= def.costCredits;
  deductOreCost(def, asteroid);

  const item: BuildQueueItem = {
    kind: def.kind,
    cell: { x: cmd.cell.x, y: cmd.cell.y },
    progressTicks: 0,
    totalTicks: Math.max(1, def.buildTimeTicks),
    paidCredits: def.costCredits,
  };
  asteroid.buildQueue.push(item);
  return { ok: true };
};

/** Cancel a queued build; 50% of the paid cost is refunded. */
export const cancelBuild = (
  world: World,
  cmd: Extract<PlayerCommand, { kind: 'cancelBuild' }>,
  playerId: PlayerId,
): EnqueueResult => {
  const asteroid = world.asteroids.get(cmd.asteroid);
  if (!asteroid) return { ok: false, reason: 'asteroid not found' };
  if (asteroid.ownerId !== playerId) return { ok: false, reason: 'not owner' };
  const item = asteroid.buildQueue[cmd.index];
  if (!item) return { ok: false, reason: 'queue index out of range' };
  const player = world.players.get(playerId);
  if (!player) return { ok: false, reason: 'player not found' };
  const remainingFrac = 1 - item.progressTicks / item.totalTicks;
  const refund = Math.floor(item.paidCredits * remainingFrac * 0.5);
  player.credits += refund;
  asteroid.buildQueue.splice(cmd.index, 1);
  return { ok: true };
};

const mintBuildingId = (world: World): BuildingId => {
  const id = asBuildingId(`bldg-${world.nextBuildingId}`);
  world.nextBuildingId += 1;
  return id;
};

/** Advance every queue by one tick, instantiating finished buildings. */
export const buildQueuePhase = (world: World): void => {
  for (const asteroid of world.asteroids.values()) {
    if (asteroid.buildQueue.length === 0) continue;
    // Advance the *first* queue entry only — colonies build serially per
    // spec §C.4 (drag-and-drop priority preserved). This keeps behaviour
    // predictable; multi-slot queues can be added in Phase 5.
    const head = asteroid.buildQueue[0];
    if (!head) continue;
    head.progressTicks += 1;
    if (head.progressTicks >= head.totalTicks) {
      const def = getDef(head.kind);
      if (!def) {
        asteroid.buildQueue.shift();
        continue;
      }
      const id = mintBuildingId(world);
      const maxHp = 100 + Math.round(def.costCredits / 50);
      world.buildings.set(id, {
        id,
        defKind: def.kind,
        asteroidId: asteroid.id,
        cell: head.cell,
        hp: maxHp,
        maxHp,
        constructionProgress: 1,
        active: true,
        damage: 0,
      });
      asteroid.buildings.push(id);
      asteroid.buildQueue.shift();
      emitEvent(world, {
        kind: 'buildQueue.completed',
        severity: 'grey',
        asteroidId: asteroid.id,
        buildingKind: def.kind,
        tick: world.tick,
      });
    }
  }
};
