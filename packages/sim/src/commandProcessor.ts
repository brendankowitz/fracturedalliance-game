import { findBuildingDef, getShipDef } from "@fa/content";
import type { World } from "@fa/domain";
import { shipId } from "@fa/domain";
import type { Command } from "./commands.ts";
import { isTraderActive } from "./systems/traderSystem.ts";

export function applyCommand(world: World, command: Command): void {
  switch (command.kind) {
    case "placeBuilding": {
      const asteroid = world.asteroids.get(command.asteroidId);
      if (!asteroid) return;

      if (!asteroid.ownerId) return;
      const player = world.players.get(asteroid.ownerId);
      if (!player) return;

      const def = findBuildingDef(command.buildingKind);
      if (!def) return;
      if (player.credits < def.costCredits) return;
      if (def.blueprintRequired && !player.blueprintsOwned.has(def.blueprintRequired)) return;

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

      const def = findBuildingDef(item.buildingKind);
      if (!def) return;

      asteroid.buildQueue.splice(command.index, 1);

      if (asteroid.ownerId) {
        const player = world.players.get(asteroid.ownerId);
        if (player) {
          // Flat 50% refund regardless of progress — intentional game design
          player.credits += def.costCredits * 0.5;
        }
      }
      break;
    }
    case "launchShip": {
      const asteroid = world.asteroids.get(command.asteroidId);
      if (!asteroid?.ownerId) return;
      const player = world.players.get(asteroid.ownerId);
      if (!player) return;

      // ShipYard must be present and complete
      const hasYard = asteroid.buildings.some((bid) => {
        const b = world.buildings.get(bid);
        return b?.defKind === "shipYard" && b.constructionProgress >= 1;
      });
      if (!hasYard) return;

      const def = getShipDef(command.shipKind);
      if (!def) return;
      if (player.credits < def.costCredits) return;

      player.credits -= def.costCredits;

      const id = shipId(`ship-${world.nextShipSeq++}`);
      world.ships.set(id, {
        id,
        defKind: def.kind,
        ownerId: asteroid.ownerId,
        hullHp: def.hullHp,
        shieldHp: def.shieldHp,
        position: { x: asteroid.sector.x, y: asteroid.sector.y },
        velocity: { x: 0, y: 0 },
        order: { kind: "idle" },
        cargo: {},
      });
      break;
    }
    case "orderShip": {
      const ship = world.ships.get(command.shipId);
      if (!ship) return;
      ship.order = command.order;
      break;
    }
    case "sellOre": {
      const human = world.players.get(command.playerId);
      if (!human?.isHuman) return;
      if (!isTraderActive(world.tick)) return;

      const oreKind = command.oreKind;
      const amount = human.oreInventory[oreKind] ?? 0;
      if (amount <= 0) return;

      human.oreInventory[oreKind] = 0;
      const price = world.marketPrices[oreKind] ?? 0;
      human.credits += amount * price * 0.7;
      break;
    }
  }
}
