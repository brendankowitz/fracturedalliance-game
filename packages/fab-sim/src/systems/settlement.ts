/**
 * Settlement — opus Stage-1 delta (not present upstream in copilot-opus).
 *
 * Ports opus's `settleAsteroid` command: claiming an unowned asteroid costs
 * SETTLE_COST credits and requires one of the player's scouts to be within
 * SETTLE_RADIUS of the rock. On success the asteroid flips to the player,
 * a CPU core is installed on the centre cell (colonies are inert without
 * one), and a grey `asteroid.settled` event is emitted.
 *
 * Deliberately minimal: population arrives through the normal population
 * phase once housing exists; no free life-support is seeded, unlike
 * scenario starting colonies. Federal-Transporter colonisation (the
 * original game's model) is a later Stage-1 content task.
 */

import type { AsteroidId, PlayerCommand, World } from '@fab/domain';
import { asBuildingId } from '@fab/domain';
import { BUILDINGS } from '@fab/content';
import { emitEvent } from './events';

export const SETTLE_COST = 3000;
/** World-position units; half the combat engagement radius. */
export const SETTLE_RADIUS = 10;

interface HandlerResult {
  readonly ok: boolean;
  readonly reason?: string;
}

const hasScoutInRange = (world: World, cmd: { from: string }, asteroidId: AsteroidId): boolean => {
  const asteroid = world.asteroids.get(asteroidId);
  if (!asteroid) return false;
  for (const ship of world.ships.values()) {
    if (ship.ownerId !== cmd.from) continue;
    if (ship.defKind !== 'scout') continue;
    if (ship.hullHp <= 0) continue;
    const dx = ship.position.x - asteroid.position.x;
    const dy = ship.position.y - asteroid.position.y;
    if (Math.hypot(dx, dy) <= SETTLE_RADIUS) return true;
  }
  return false;
};

export const handleSettleAsteroid = (
  world: World,
  cmd: Extract<PlayerCommand, { kind: 'settleAsteroid' }>,
): HandlerResult => {
  const asteroid = world.asteroids.get(cmd.asteroid);
  if (!asteroid) return { ok: false, reason: 'asteroid missing' };
  if (asteroid.ownerId !== null) return { ok: false, reason: 'already owned' };

  const player = world.players.get(cmd.from);
  if (!player || !player.alive) return { ok: false, reason: 'player missing' };
  if (player.credits < SETTLE_COST) return { ok: false, reason: 'insufficient credits' };
  if (!hasScoutInRange(world, cmd, cmd.asteroid)) {
    return { ok: false, reason: 'no scout in range' };
  }

  player.credits -= SETTLE_COST;
  asteroid.ownerId = player.id;

  // Install the mandatory CPU core on the centre cell if it is free.
  const cx = Math.floor(asteroid.grid.width / 2);
  const cy = Math.floor(asteroid.grid.height / 2);
  const centreTaken = asteroid.buildings.some((bid) => {
    const b = world.buildings.get(bid);
    return b !== undefined && b.cell.x === cx && b.cell.y === cy;
  });
  if (!centreTaken) {
    const def = BUILDINGS['bld.cpu-core'];
    const id = asBuildingId(`bldg-${world.nextBuildingId}`);
    world.nextBuildingId += 1;
    const maxHp = 100 + Math.round(def.costCredits / 50);
    world.buildings.set(id, {
      id,
      defKind: def.kind,
      asteroidId: asteroid.id,
      cell: { x: cx, y: cy },
      hp: maxHp,
      maxHp,
      constructionProgress: 1,
      active: true,
      damage: 0,
    });
    asteroid.buildings.push(id);
  }

  emitEvent(world, {
    kind: 'asteroid.settled',
    severity: 'grey',
    asteroidId: asteroid.id,
    playerId: player.id,
    tick: world.tick,
  });
  return { ok: true };
};
