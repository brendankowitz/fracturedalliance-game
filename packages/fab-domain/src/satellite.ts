/**
 * Satellites & Orbital Defence Platforms (spec §C.7, §C.4).
 *
 * Satellites are launched from a `Satellite Silo` (1500 cr base, 2500 cr for
 * spy variant) and orbit a target asteroid until destroyed. ODP buildings
 * (`bld.orbital-defence-platform`) have a per-tick chance to intercept
 * incoming missiles within range; this is resolved in the Satellite/ODP
 * combat phase (B4) before the existing `combatPhase` impact roll.
 */

import type { AsteroidId, PlayerId, ShipId } from './ids';

export type SatelliteKind = 'spy' | 'comms' | 'weapons';

export interface Satellite {
  readonly id: ShipId;
  readonly ownerId: PlayerId;
  readonly orbiting: AsteroidId;
  readonly kind: SatelliteKind;
  /** Tick on which the satellite was launched. */
  readonly launchedTick: number;
  /** Remaining structural hp. Spy satellites are fragile; weapons sats tougher. */
  hp: number;
  /** Sensor / weapon range in grid units. */
  readonly range: number;
}

export const SATELLITE_LAUNCH_COST: Record<SatelliteKind, number> = {
  spy: 2500,
  comms: 1800,
  weapons: 4000,
};

export const SATELLITE_INITIAL_HP: Record<SatelliteKind, number> = {
  spy: 60,
  comms: 80,
  weapons: 200,
};

export const SATELLITE_RANGE: Record<SatelliteKind, number> = {
  spy: 14,
  comms: 20,
  weapons: 10,
};

/** Per-tick probability an ODP (within range) intercepts a single missile. */
export const ODP_INTERCEPT_PROBABILITY = 0.35;

/** Maximum range in grid units within which an ODP can attempt an intercept. */
export const ODP_INTERCEPT_RANGE = 18;
