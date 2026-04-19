import { getBuildingDef } from "@fa/content";
import type { AsteroidId, World } from "@fa/domain";

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
  }
}
