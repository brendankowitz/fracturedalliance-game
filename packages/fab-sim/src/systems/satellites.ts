/**
 * Satellites & ODP system (spec §C.7, §C.4).
 *
 * Provides:
 *   • `handleLaunchSatellite` — validates a `launchSatellite` command. Source
 *     asteroid must own a `Satellite Silo` and the launching player must
 *     have credits ≥ launch cost. Mints a Satellite into `world.satellites`.
 *   • `satellitesPhase` — runs ODP intercept rolls against active missiles
 *     in flight. Each ODP within range may intercept one missile per tick
 *     with `ODP_INTERCEPT_PROBABILITY`. Removes intercepted missiles and
 *     emits `odp.intercepted`.
 *
 * Satellite destruction (e.g. by enemy missiles) is handled by `combatPhase`
 * via the existing missile→entity damage pipeline; we only set up the entity
 * & range parameters here. For now, satellites are immortal until shot down
 * — the integration with combat is wired by Stream D's snapshot adapter.
 */

import {
  asShipId,
  ODP_INTERCEPT_PROBABILITY,
  ODP_INTERCEPT_RANGE,
  type PlayerCommand,
  type PlayerId,
  SATELLITE_INITIAL_HP,
  SATELLITE_LAUNCH_COST,
  SATELLITE_RANGE,
  type Satellite,
  type ShipId,
  type World,
} from '@fab/domain';
import type { PrngRegistry } from '../rng/subGenerators';
import { emitEvent } from './events';

interface HandlerResult {
  readonly ok: boolean;
  readonly reason?: string;
}

const distance = (a: { x: number; y: number }, b: { x: number; y: number }): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export const handleLaunchSatellite = (
  world: World,
  cmd: Extract<PlayerCommand, { kind: 'launchSatellite' }>,
): HandlerResult => {
  const player = world.players.get(cmd.from);
  if (!player) return { ok: false, reason: 'player not found' };
  const source = world.asteroids.get(cmd.fromAsteroid);
  if (!source || source.ownerId !== cmd.from) return { ok: false, reason: 'source not owned' };
  const target = world.asteroids.get(cmd.target);
  if (!target) return { ok: false, reason: 'target not found' };

  const hasSilo = source.buildings.some((bid) => {
    const b = world.buildings.get(bid);
    return b?.active && b.defKind === 'bld.satellite-silo';
  });
  if (!hasSilo) return { ok: false, reason: 'no satellite silo' };

  const cost = SATELLITE_LAUNCH_COST[cmd.satellite];
  if (player.credits < cost) return { ok: false, reason: 'insufficient credits' };
  player.credits -= cost;

  if (!world.satellites) world.satellites = [];
  const satId: ShipId = asShipId(`sat-${world.nextShipId}`);
  world.nextShipId += 1;
  const sat: Satellite = {
    id: satId,
    ownerId: cmd.from,
    orbiting: cmd.target,
    kind: cmd.satellite,
    launchedTick: world.tick,
    hp: SATELLITE_INITIAL_HP[cmd.satellite],
    range: SATELLITE_RANGE[cmd.satellite],
  };
  world.satellites.push(sat);

  emitEvent(world, {
    kind: 'satellite.launched',
    severity: 'grey',
    ownerId: cmd.from,
    asteroidId: cmd.target,
    satelliteId: satId,
    kind_: cmd.satellite,
    tick: world.tick,
  });
  return { ok: true };
};

interface OdpAnchor {
  ownerId: PlayerId;
  position: { x: number; y: number };
}

const collectOdps = (world: World): OdpAnchor[] => {
  const out: OdpAnchor[] = [];
  for (const a of world.asteroids.values()) {
    if (!a.ownerId) continue;
    const hasOdp = a.buildings.some((bid) => {
      const b = world.buildings.get(bid);
      return b?.active && b.defKind === 'bld.orbital-defence-platform';
    });
    if (hasOdp) out.push({ ownerId: a.ownerId, position: a.position });
  }
  return out;
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: missile sweep visits each (missile × ODP) pair and emits intercept events; trivial to read, awkward to fragment.
export const satellitesPhase = (world: World, reg: PrngRegistry): void => {
  if (!world.missiles || world.missiles.length === 0) return;
  const odps = collectOdps(world);
  if (odps.length === 0) return;
  const rng = reg.get('combat');
  const survivors = [];
  for (const m of world.missiles) {
    let intercepted = false;
    for (const odp of odps) {
      if (odp.ownerId === m.ownerId) continue;
      // Approximate missile position by destination asteroid (basic detection cone).
      if (!m.targetAsteroid) continue;
      const targetAst = world.asteroids.get(m.targetAsteroid);
      if (!targetAst) continue;
      if (distance(odp.position, targetAst.position) > ODP_INTERCEPT_RANGE) continue;
      if (rng.next() < ODP_INTERCEPT_PROBABILITY) {
        intercepted = true;
        emitEvent(world, {
          kind: 'odp.intercepted',
          severity: 'grey',
          defenderId: odp.ownerId,
          attackerId: m.ownerId,
          tick: world.tick,
        });
        break;
      }
    }
    if (!intercepted) survivors.push(m);
  }
  world.missiles = survivors;
};
