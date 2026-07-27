/**
 * Mining system.
 *
 * Deterministic per-tick ore extraction. For every operational mining
 * building on a player-owned asteroid we apply:
 *
 *   extracted = min(def.oreProduction[kind] × productivity, deposits[kind])
 *
 * where `productivity` is halved under unrest (§C.4) and further reduced
 * by radiation saturation on the colony. Extracted tonnage is credited
 * to the asteroid's `stocks.ores` and subtracted from `deposits`.
 *
 * Radiation-risk ores (ORES[kind].radiationRisk > 0) bump the asteroid's
 * `radiation` counter, which feeds the population system's happiness
 * penalty on the same tick.
 *
 * Mining is always deterministic: no RNG is consulted here.
 */

import type { BuildingKind } from '@fab/content';
import { BUILDINGS, ORES } from '@fab/content';
import type { Asteroid, Building, BuildingDef, OreKind, World } from '@fab/domain';
import { HAPPINESS_UNREST, UNREST_PRODUCTIVITY_MULT } from '../time';

const getDef = (kind: string): BuildingDef | undefined =>
  (BUILDINGS as Readonly<Record<string, BuildingDef>>)[kind as BuildingKind];

/** Compute the productivity multiplier for an asteroid (0..1). */
export const productivityOf = (asteroid: Asteroid): number => {
  let mult = 1;
  if (asteroid.happiness < HAPPINESS_UNREST) mult *= UNREST_PRODUCTIVITY_MULT;
  // Radiation saturation > 80 slows workers another 25%.
  if (asteroid.radiation > 80) mult *= 0.75;
  return mult;
};

/** Extract a single mine's output into its asteroid's stocks, mutating both. */
export const extractFromBuilding = (asteroid: Asteroid, building: Building): void => {
  if (!building.active || building.constructionProgress < 1) return;
  const def = getDef(building.defKind);
  if (!def?.oreProduction) return;
  const productivity = productivityOf(asteroid);
  for (const [kind, ratePerTick] of Object.entries(def.oreProduction) as [OreKind, number][]) {
    const reserve = asteroid.deposits[kind] ?? 0;
    if (reserve <= 0) continue;
    const amount = Math.min(ratePerTick * productivity, reserve);
    if (amount <= 0) continue;
    asteroid.deposits[kind] = reserve - amount;
    asteroid.stocks.ores[kind] = (asteroid.stocks.ores[kind] ?? 0) + amount;
    const risk = ORES[kind].radiationRisk;
    if (risk > 0) asteroid.radiation = Math.min(100, asteroid.radiation + risk * amount * 0.1);
  }
};

export const miningPhase = (world: World): void => {
  for (const asteroid of world.asteroids.values()) {
    if (asteroid.ownerId === null) continue;
    if (asteroid.population <= 0) continue;
    for (const buildingId of asteroid.buildings) {
      const b = world.buildings.get(buildingId);
      if (!b) continue;
      extractFromBuilding(asteroid, b);
    }
  }
};
