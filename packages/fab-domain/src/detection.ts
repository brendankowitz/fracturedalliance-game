/**
 * Detection — per-player visibility / fog-of-war (spec §A.6, §B).
 *
 * The DetectionState records which asteroids each player can see this tick.
 * It is recomputed every tick by `detectionPhase`. Render and snapshot
 * consumers (Stream D) read this through the snapshot adapter; the sim
 * itself uses it only to gate certain commands (e.g. you cannot bombard
 * what you cannot see).
 *
 * Detection sources:
 *   • Owned asteroids — always visible.
 *   • Recon missions in flight — reveal the target asteroid for the mission
 *     window plus a 200-tick afterglow.
 *   • Spy satellites — reveal the asteroid they orbit while alive.
 *   • Radar Towers (`bld.radar-tower`) — reveal asteroids within 24 grid
 *     units of any owned asteroid hosting a powered radar.
 */

import type { AsteroidId, PlayerId } from './ids';

export interface DetectionState {
  /** Per-player set of currently-visible asteroid ids. */
  readonly visible: Readonly<Record<PlayerId, readonly AsteroidId[]>>;
  /** Tick on which a recon afterglow expires, keyed by `${playerId}:${asteroidId}`. */
  readonly reconAfterglow: Readonly<Record<string, number>>;
}

export const RADAR_RANGE_GRID = 24;
export const RECON_AFTERGLOW_TICKS = 200;

export const initialDetectionState = (): DetectionState => ({
  visible: {},
  reconAfterglow: {},
});
