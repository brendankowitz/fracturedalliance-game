/**
 * Command dispatcher.
 *
 * The pipeline's `commandPhase` drains `world.commandQueue` and hands each
 * command here via `applyCommand`. Invalid commands produce an amber
 * `command.rejected` event but never throw — the sim must never crash on
 * bad input, because UI hot-reload or AI bugs would otherwise kill a match.
 *
 * Commands that require a player id but don't carry one (e.g. `queueBuild`)
 * are resolved against `world.asteroids.get(cmd.asteroid).ownerId` — if
 * the asteroid has no owner the command is rejected.
 */

import type { AsteroidId, PlayerCommand, PlayerId, World } from '@fab/domain';
import { handleSetAsteroidCourse } from './asteroidMotion';
import { cancelBuild, enqueueBuilding } from './buildQueue';
import {
  handleBombard,
  handleLaunchFleet,
  handleLaunchMissile,
  handleProduceShip,
  handleRecallFleet,
} from './combat';
import { handleBreakTreaty, handleDeclareWar, handleProposeTreaty, handleRespondTreaty } from './diplomacy';
import { handleDispatchAgent } from './espionage';
import { emitEvent } from './events';
import { handleCouncilVoteRespond } from './federalCouncil';
import { startResearch } from './research';
import { handleLaunchSatellite } from './satellites';

interface HandlerResult {
  readonly ok: boolean;
  readonly reason?: string;
}

const reject = (world: World, reason: string): void => {
  emitEvent(world, {
    kind: 'command.rejected',
    severity: 'amber',
    reason,
    tick: world.tick,
  });
};

const ownerOfAsteroid = (world: World, aid: AsteroidId): PlayerId | null => {
  const a = world.asteroids.get(aid);
  return a?.ownerId ?? null;
};

/** Apply a handler result, emitting an amber rejection on failure. */
const dispatch = (world: World, name: string, result: HandlerResult): void => {
  if (!result.ok) reject(world, `${name}: ${result.reason ?? 'unknown'}`);
};

/** Dispatch commands that require a resolved owner (asteroid-scoped builds). */
const dispatchOwned = (
  world: World,
  asteroid: AsteroidId,
  name: string,
  run: (owner: PlayerId) => HandlerResult,
): void => {
  const owner = ownerOfAsteroid(world, asteroid);
  if (!owner) {
    reject(world, `${name}: asteroid has no owner`);
    return;
  }
  dispatch(world, name, run(owner));
};

/** Validate + queue a market order (shared by queueSell / queueBuy). */
const queueMarketOrder = (
  world: World,
  cmd: Extract<PlayerCommand, { kind: 'queueSellOrder' | 'queueBuyOrder' }>,
): void => {
  const name = cmd.kind;
  const player = world.players.get(cmd.playerId);
  if (!player) {
    reject(world, `${name}: player not found`);
    return;
  }
  const asteroid = world.asteroids.get(cmd.asteroid);
  if (!asteroid || asteroid.ownerId !== cmd.playerId) {
    reject(world, `${name}: asteroid not owned`);
    return;
  }
  if (cmd.tonnes <= 0) {
    reject(world, `${name}: non-positive tonnes`);
    return;
  }
  player.marketOrders.push({
    id: `order-${world.tick}-${player.marketOrders.length}`,
    side: cmd.kind === 'queueSellOrder' ? 'sell' : 'buy',
    ore: cmd.ore,
    tonnes: cmd.tonnes,
    asteroid: cmd.asteroid,
    placedTick: world.tick,
  });
};

/** Legacy / stubbed command kinds that the sim intentionally ignores. */
const LEGACY_NOOP_KINDS = new Set<PlayerCommand['kind']>([
  'purchaseBlueprint',
  'issueShipOrder',
  'sellOres',
  'launchMission',
  'launchEngine',
  'abortEngine',
  'demolishBuilding',
  'setSpeed',
]);

export const applyCommand = (world: World, cmd: PlayerCommand): void => {
  switch (cmd.kind) {
    case 'queueBuild':
      dispatchOwned(world, cmd.asteroid, 'queueBuild', (owner) => enqueueBuilding(world, cmd, owner));
      return;
    case 'cancelBuild':
      dispatchOwned(world, cmd.asteroid, 'cancelBuild', (owner) => cancelBuild(world, cmd, owner));
      return;
    case 'startResearch':
      dispatch(world, 'startResearch', startResearch(world, cmd));
      return;
    case 'queueSellOrder':
    case 'queueBuyOrder':
      queueMarketOrder(world, cmd);
      return;
    // ── Phase 6 combat ────────────────────────────────────────────────────
    case 'launchMissile':
      dispatch(world, 'launchMissile', handleLaunchMissile(world, cmd));
      return;
    case 'bombardAsteroid':
      dispatch(world, 'bombardAsteroid', handleBombard(world, cmd));
      return;
    case 'launchFleet':
      dispatch(world, 'launchFleet', handleLaunchFleet(world, cmd));
      return;
    case 'recallFleet':
      dispatch(world, 'recallFleet', handleRecallFleet(world, cmd));
      return;
    case 'produceShip':
      dispatch(world, 'produceShip', handleProduceShip(world, cmd));
      return;
    // ── Phase 8 diplomacy ────────────────────────────────────────────────
    case 'proposeTreaty':
      dispatch(world, 'proposeTreaty', handleProposeTreaty(world, cmd));
      return;
    case 'respondTreaty':
      dispatch(world, 'respondTreaty', handleRespondTreaty(world, cmd));
      return;
    case 'breakTreaty':
      dispatch(world, 'breakTreaty', handleBreakTreaty(world, cmd));
      return;
    case 'declareWar':
      dispatch(world, 'declareWar', handleDeclareWar(world, cmd));
      return;
    // ── Phase 9 asteroid engine ──────────────────────────────────────────
    case 'setAsteroidCourse':
      dispatch(world, 'setAsteroidCourse', handleSetAsteroidCourse(world, cmd));
      return;
    // ── Phase 0.2 — Stream B ──
    case 'dispatchAgent':
      dispatch(world, 'dispatchAgent', handleDispatchAgent(world, cmd));
      return;
    case 'launchSatellite':
      dispatch(world, 'launchSatellite', handleLaunchSatellite(world, cmd));
      return;
    case 'councilVoteRespond':
      dispatch(world, 'councilVoteRespond', handleCouncilVoteRespond(world, cmd));
      return;
    default:
      // Legacy / stubbed commands — intentionally silent.
      if (!LEGACY_NOOP_KINDS.has(cmd.kind)) {
        reject(world, `unknown command kind: ${String((cmd as { kind: string }).kind)}`);
      }
      return;
  }
};

export const commandPhase = (world: World): void => {
  // Reset the per-tick command trace used by the tutorial runner.
  world.commandTrace = [];
  const queue = world.commandQueue;
  if (queue.length === 0) return;
  // Drain up to 1024 commands per tick to bound worst-case CPU if a
  // malfunctioning UI spams the queue.
  const LIMIT = 1024;
  const n = Math.min(queue.length, LIMIT);
  // Snapshot the event queue length so we can detect per-command rejections.
  for (let i = 0; i < n; i++) {
    const cmd = queue[i];
    if (!cmd) continue;
    const beforeEvents = world.eventQueue.length;
    try {
      applyCommand(world, cmd);
    } catch (err) {
      reject(world, `exception: ${(err as Error).message}`);
      continue;
    }
    // If no new `command.rejected` event was appended for this command we
    // treat it as successfully applied and record the kind.
    const rejected = world.eventQueue.slice(beforeEvents).some((e) => e.kind === 'command.rejected');
    if (!rejected) world.commandTrace.push(cmd.kind);
  }
  queue.splice(0, n);
};
