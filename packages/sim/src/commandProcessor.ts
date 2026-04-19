import { getBuildingDef } from "@fa/content";
import type { World } from "@fa/domain";
import type { Command } from "./commands.ts";

export function applyCommand(world: World, command: Command): void {
  switch (command.kind) {
    case "placeBuilding": {
      const asteroid = world.asteroids.get(command.asteroidId);
      if (!asteroid) return;

      if (!asteroid.ownerId) return;
      const player = world.players.get(asteroid.ownerId);
      if (!player) return;

      const def = getBuildingDef(command.buildingKind);
      if (player.credits < def.costCredits) return;

      player.credits -= def.costCredits;
      asteroid.buildQueue.push({
        buildingKind: command.buildingKind,
        progressTicks: 0,
        totalTicks: def.buildTimeTicks,
        cell: command.cell,
      });
      break;
    }
    case "cancelBuildQueue": {
      const asteroid = world.asteroids.get(command.asteroidId);
      if (!asteroid) return;

      const item = asteroid.buildQueue[command.index];
      if (!item) return;

      if (asteroid.ownerId) {
        const player = world.players.get(asteroid.ownerId);
        if (player) {
          const def = getBuildingDef(item.buildingKind);
          player.credits += Math.floor(def.costCredits * 0.5);
        }
      }

      asteroid.buildQueue.splice(command.index, 1);
      break;
    }
  }
}
