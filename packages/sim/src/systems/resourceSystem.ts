import { getBuildingDef } from "@fa/content";
import type { AsteroidId, World } from "@fa/domain";

// Each population capacity unit demands this many life-support units per tick
const LIFE_SUPPORT_DEMAND_RATIO = 0.5;

export function computePowerBalance(world: World, asteroidId: AsteroidId): number {
  const asteroid = world.asteroids.get(asteroidId);
  if (!asteroid) return 0;

  let balance = 0;
  for (const buildingId of asteroid.buildings) {
    const building = world.buildings.get(buildingId);
    if (!building?.active || building.constructionProgress < 1) continue;
    const def = getBuildingDef(building.defKind);
    balance += def.powerDelta;
  }
  return balance;
}

export function tickResources(world: World): void {
  for (const asteroid of world.asteroids.values()) {
    if (!asteroid.ownerId) continue;

    const powerBalance = computePowerBalance(world, asteroid.id);
    if (powerBalance < 0) {
      asteroid.stability = Math.max(0, asteroid.stability - 0.1);
    }

    // Accumulate life-support, happiness, radiation, and repair from buildings
    let popCap = 0;
    let foodProd = 0;
    let waterProd = 0;
    let airProd = 0;
    let happinessDelta = 0;
    let radiationReduction = 0;
    let repairRate = 0;

    for (const buildingId of asteroid.buildings) {
      const building = world.buildings.get(buildingId);
      if (!building?.active || building.constructionProgress < 1) continue;
      const def = getBuildingDef(building.defKind);

      popCap += def.popCapDelta;
      foodProd += def.foodDelta;
      waterProd += def.waterDelta;
      airProd += def.airDelta;
      if (def.happinessDelta) happinessDelta += def.happinessDelta;
      if (def.radiationReduction) radiationReduction += def.radiationReduction;
      if (def.repairRate) repairRate += def.repairRate;
    }

    if (popCap > 0) {
      // Life-support satisfaction
      const demand = popCap * LIFE_SUPPORT_DEMAND_RATIO;
      if (foodProd < demand) happinessDelta -= 0.05;
      if (waterProd < demand) happinessDelta -= 0.05;
      if (airProd < demand) happinessDelta -= 0.05;
      // Baseline recovery when all life support is adequate
      if (foodProd >= demand && waterProd >= demand && airProd >= demand) {
        happinessDelta += 0.01;
      }

      // Radiation degrades happiness (skip on uninhabited asteroids to avoid pre-drift)
      happinessDelta -= asteroid.radiation * 0.001;
    }

    // Apply happiness delta, clamp [0, 100]
    asteroid.happiness = Math.max(0, Math.min(100, asteroid.happiness + happinessDelta));

    // Reduce radiation
    if (radiationReduction > 0) {
      asteroid.radiation = Math.max(0, asteroid.radiation - radiationReduction);
    }

    // Repair is distributed evenly across all damaged buildings per tick (not a shared budget)
    if (repairRate > 0) {
      for (const buildingId of asteroid.buildings) {
        const building = world.buildings.get(buildingId);
        if (!building || building.damage <= 0) continue;
        const repaired = Math.min(building.damage, repairRate * 0.01);
        building.damage = Math.max(0, building.damage - repaired);
      }
    }
  }
}
