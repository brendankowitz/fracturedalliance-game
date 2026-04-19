import { getBuildingDef } from "@fa/content";
import type { World } from "@fa/domain";

export function tickMining(world: World): void {
  for (const asteroid of world.asteroids.values()) {
    if (!asteroid.ownerId) continue;

    const player = world.players.get(asteroid.ownerId);
    if (!player) continue;

    for (const buildingId of asteroid.buildings) {
      const building = world.buildings.get(buildingId);
      if (!building?.active || building.constructionProgress < 1) continue;

      const def = getBuildingDef(building.defKind);
      if (!def.oreProduction) continue;

      for (const [ore, ratePerTick] of Object.entries(def.oreProduction) as [string, number][]) {
        const available = asteroid.deposits[ore as keyof typeof asteroid.deposits] ?? 0;
        if (available <= 0) continue;

        const extracted = Math.min(ratePerTick, available);
        (asteroid.deposits as Record<string, number>)[ore] = available - extracted;

        const price = world.marketPrices[ore as keyof typeof world.marketPrices] ?? 0;
        player.credits += extracted * price * 0.7;
      }
    }
  }
}
