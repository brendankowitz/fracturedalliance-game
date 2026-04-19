import { findBlueprintDef, findBuildingDef, getShipDef } from "@fa/content";
import type { AgentMissionKind, Treaty, TreatyKind, World } from "@fa/domain";
import { blueprintId, shipId, treatyId } from "@fa/domain";
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
        queuedAt: world.tick,
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
          // Flat 50% refund regardless of construction progress
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
    case "proposeTreaty": {
      const human = [...world.players.values()].find((p) => p.isHuman);
      if (!human) return;
      const target = world.players.get(command.targetPlayerId);
      if (!target || target.isHuman) return;

      const alreadyExists = world.treaties.some(
        (t) =>
          t.kind === command.treatyKind &&
          t.parties.includes(human.id) &&
          t.parties.includes(command.targetPlayerId),
      );
      if (alreadyExists) return;

      const TREATY_DURATIONS: Record<TreatyKind, number | null> = {
        nonAggression: 6000,
        peace: 1200,
        noCovert: 4000,
        trade: 4000,
        openBorders: 4000,
        defensivePact: null,
        jointWar: 3000,
      };

      const duration = TREATY_DURATIONS[command.treatyKind];
      const id = treatyId(`treaty-${world.nextTreatySeq++}`);
      const treaty: Treaty = {
        id,
        parties: [human.id, command.targetPlayerId],
        kind: command.treatyKind,
        signedTick: world.tick,
        ...(duration !== null ? { expiresTick: world.tick + duration } : {}),
      };
      world.treaties.push(treaty);

      if (!human.reputation.has(command.targetPlayerId)) {
        human.reputation.set(command.targetPlayerId, 0);
      }
      break;
    }
    case "buyBlueprint": {
      const human = [...world.players.values()].find((p) => p.isHuman);
      if (!human) return;

      const def = findBlueprintDef(command.blueprintId);
      if (!def) return;

      const bpId = blueprintId(command.blueprintId);
      if (human.blueprintsOwned.has(bpId)) return;
      if (human.credits < def.costCredits) return;
      if (def.prerequisiteId !== null && !human.blueprintsOwned.has(def.prerequisiteId)) return;

      human.credits -= def.costCredits;
      human.blueprintsOwned.add(bpId);
      break;
    }
    case "hireAgent": {
      const agent = world.agents.get(command.agentId);
      if (!agent || agent.ownerId !== null) return;
      const human = [...world.players.values()].find((p) => p.isHuman);
      if (!human || human.credits < agent.hireCost) return;
      human.credits -= agent.hireCost;
      agent.ownerId = human.id;
      break;
    }
    case "assignMission": {
      const agent = world.agents.get(command.agentId);
      if (!agent) return;
      const human = [...world.players.values()].find((p) => p.isHuman);
      if (!human || agent.ownerId !== human.id || agent.missionKind !== null) return;
      const target = world.asteroids.get(command.targetAsteroidId);
      if (!target) return;

      if (target.ownerId) {
        const noCovertIdx = world.treaties.findIndex(
          (t) =>
            t.kind === "noCovert" &&
            t.parties.includes(human.id) &&
            t.parties.includes(target.ownerId!),
        );
        if (noCovertIdx !== -1) {
          world.treaties.splice(noCovertIdx, 1);
          world.eventQueue.push({
            kind: "treaty.broken",
            priority: "amber",
            by: human.id,
            against: target.ownerId,
            treaty: "noCovert",
          });
          const rep = human.reputation.get(target.ownerId) ?? 0;
          human.reputation.set(target.ownerId, rep - 20);
        }
      }

      const MISSION_DURATIONS: Record<AgentMissionKind, number> = {
        recon: 200,
        techSteal: 400,
        sabotage: 300,
        blackmail: 350,
        liberate: 500,
      };

      agent.missionKind = command.missionKind;
      agent.missionTarget = command.targetAsteroidId;
      agent.missionCompleteTick = world.tick + MISSION_DURATIONS[command.missionKind];
      break;
    }
  }
}
