/**
 * Ship orders — opus Stage-1 delta (upstream treated `issueShipOrder` as a
 * legacy no-op; fleets moved only via `launchFleet`).
 *
 * opus's UI drives individual ships ("send this scout to that rock"), and
 * the settlement command requires a scout parked near the target, so direct
 * ship orders must work. `moveFleets` in combat.ts already processes
 * `moveTo`, `dock` and `attackAsteroid` orders; this handler simply
 * validates and assigns them.
 */

import type { PlayerCommand, World } from '@fab/domain';

interface HandlerResult {
  readonly ok: boolean;
  readonly reason?: string;
}

const ALLOWED_ORDER_KINDS = new Set(['idle', 'moveTo', 'dock', 'attackAsteroid', 'defend']);

export const handleIssueShipOrder = (
  world: World,
  cmd: Extract<PlayerCommand, { kind: 'issueShipOrder' }>,
): HandlerResult => {
  const ship = world.ships.get(cmd.ship);
  if (!ship) return { ok: false, reason: 'ship missing' };
  if (ship.hullHp <= 0) return { ok: false, reason: 'ship destroyed' };
  if (!ALLOWED_ORDER_KINDS.has(cmd.order.kind)) {
    return { ok: false, reason: `unsupported order kind: ${cmd.order.kind}` };
  }
  if (
    (cmd.order.kind === 'dock' || cmd.order.kind === 'attackAsteroid' || cmd.order.kind === 'defend') &&
    !world.asteroids.has(cmd.order.target)
  ) {
    return { ok: false, reason: 'target asteroid missing' };
  }

  // Leaving orbit: forget any docked registration so inOrbit stays honest.
  for (const asteroid of world.asteroids.values()) {
    const idx = asteroid.inOrbit.indexOf(ship.id);
    if (idx >= 0) asteroid.inOrbit.splice(idx, 1);
  }

  ship.order = cmd.order;
  return { ok: true };
};
