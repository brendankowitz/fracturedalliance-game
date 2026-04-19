import type { Building, BuildingId, World } from "@fa/domain";
import { buildingId } from "@fa/domain";

let _counter = 0;

export function tickConstruction(world: World): void {
  for (const asteroid of world.asteroids.values()) {
    const item = asteroid.buildQueue[0];
    if (!item) continue;

    item.progressTicks += 1;

    if (item.progressTicks >= item.totalTicks) {
      asteroid.buildQueue.shift();

      const id: BuildingId = buildingId(`building-${world.tick}-${_counter++}`);
      const building: Building = {
        id,
        defKind: item.buildingKind,
        asteroidId: asteroid.id,
        cell: item.cell,
        hp: 100,
        maxHp: 100,
        constructionProgress: 1,
        active: true,
        damage: 0,
      };

      world.buildings.set(id, building);
      (asteroid.buildings as unknown as BuildingId[]).push(id);

      world.eventQueue.push({
        kind: "construction.done",
        priority: "grey",
        asteroidId: asteroid.id,
        buildingKind: item.buildingKind,
      });
    }
  }
}
