/**
 * Detection system (spec §A.6, §B).
 *
 * Recompute per-player visibility every tick:
 *   • own asteroids — always visible.
 *   • radar towers — within RADAR_RANGE_GRID of any owned asteroid.
 *   • spy satellites — the orbiting asteroid.
 *   • recon afterglow — afterglow window from past espionage missions.
 *
 * The output `world.detection.visible[player]` is the union of all sources.
 * UI / Stream-D snapshot consumers project this into the render layer's
 * fog-of-war mask.
 */

import {
  type AsteroidId,
  type DetectionState,
  initialDetectionState,
  type PlayerId,
  RADAR_RANGE_GRID,
  type World,
} from '@fab/domain';

const ensureState = (world: World): DetectionState => {
  if (!world.detection) {
    world.detection = initialDetectionState();
  }
  return world.detection;
};

const distance = (a: { x: number; y: number }, b: { x: number; y: number }): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: per-player visibility scan over (asteroids × signals × buildings) is naturally branchy; splitting hurts readability.
export const detectionPhase = (world: World): void => {
  const state = ensureState(world);
  const visible: Record<PlayerId, AsteroidId[]> = {};

  // Initialise empty sets per player.
  for (const p of world.players.values()) {
    visible[p.id] = [];
  }

  // Owned asteroids + radar coverage.
  for (const owner of Object.keys(visible) as PlayerId[]) {
    const ownedRadarAnchors: { x: number; y: number }[] = [];
    for (const a of world.asteroids.values()) {
      if (a.ownerId === owner) {
        visible[owner]?.push(a.id);
        const hasRadar = a.buildings.some((bid) => {
          const b = world.buildings.get(bid);
          return b?.active && b.defKind === 'bld.radar-tower';
        });
        if (hasRadar) ownedRadarAnchors.push(a.position);
      }
    }
    if (ownedRadarAnchors.length === 0) continue;
    for (const a of world.asteroids.values()) {
      if (a.ownerId === owner) continue;
      for (const anchor of ownedRadarAnchors) {
        if (distance(a.position, anchor) <= RADAR_RANGE_GRID) {
          visible[owner]?.push(a.id);
          break;
        }
      }
    }
  }

  // Spy satellites.
  for (const sat of world.satellites ?? []) {
    if (sat.kind === 'spy' && sat.hp > 0) {
      visible[sat.ownerId]?.push(sat.orbiting);
    }
  }

  // Recon afterglow — drop expired entries, add still-active ones.
  const afterglow = state.reconAfterglow as Record<string, number>;
  for (const key of Object.keys(afterglow)) {
    const expires = afterglow[key];
    if (expires === undefined || expires <= world.tick) {
      delete afterglow[key];
      continue;
    }
    const [playerId, asteroidId] = key.split(':') as [PlayerId, AsteroidId];
    visible[playerId]?.push(asteroidId);
  }

  // Dedupe each list.
  const dedupe: Record<PlayerId, AsteroidId[]> = {};
  for (const [player, ids] of Object.entries(visible)) {
    dedupe[player as PlayerId] = Array.from(new Set(ids));
  }
  (state as unknown as { visible: Record<PlayerId, AsteroidId[]> }).visible = dedupe;
};
