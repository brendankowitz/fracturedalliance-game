import { findBuildingDef } from "@fa/content";
import type { AsteroidId, World } from "@fa/domain";

export function tickAsteroidEngines(world: World): void {
  for (const asteroid of world.asteroids.values()) {
    if (asteroid.engines.count <= 0) continue;

    const { engines } = asteroid;

    // Charge phase: charge time reached, not yet in transit
    if (engines.chargeTick !== null && engines.etaTick === null && world.tick === engines.chargeTick) {
      const destId = engines.destinationId;
      if (!destId) continue;
      const destination = world.asteroids.get(destId);
      if (!destination) continue;

      const dx = destination.sector.x - asteroid.sector.x;
      const dy = destination.sector.y - asteroid.sector.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const travelTicks = Math.max(100, Math.round(distance * 20));

      engines.etaTick = world.tick + travelTicks;
      world.eventQueue.push({
        kind: "asteroid.engine_fired",
        priority: "red",
        asteroidName: asteroid.name,
        destinationName: destination.name,
      });
      continue;
    }

    // Arrival phase
    if (engines.etaTick !== null && world.tick >= engines.etaTick) {
      const destId = engines.destinationId;
      if (!destId) {
        engines.etaTick = null;
        engines.chargeTick = null;
        continue;
      }
      const destination = world.asteroids.get(destId);
      if (!destination) {
        engines.destinationId = null;
        engines.etaTick = null;
        engines.chargeTick = null;
        continue;
      }

      // Check for gravity nullifier deflection at destination before moving
      const hasNullifier = destination.buildings.some((bid) => {
        const b = world.buildings.get(bid);
        return b?.defKind === "gravityNullifier" && b.constructionProgress >= 1;
      });

      let landX = destination.sector.x;
      let landY = destination.sector.y;

      if (hasNullifier) {
        landX += 1;
        world.eventQueue.push({
          kind: "asteroid.deflected",
          priority: "amber",
          asteroidName: asteroid.name,
        });
      }

      // Move the asteroid
      (asteroid as { sector: { x: number; y: number } }).sector = { x: landX, y: landY };

      // Clear engine state
      engines.destinationId = null;
      engines.chargeTick = null;
      engines.etaTick = null;

      // Resolve collisions at the landing sector
      resolveCollisions(world, asteroid.id, landX, landY);
    }
  }
}

function resolveCollisions(world: World, movedId: AsteroidId, landX: number, landY: number): void {
  const colliders = [...world.asteroids.values()].filter(
    (a) => a.id !== movedId && a.sector.x === landX && a.sector.y === landY,
  );

  const moved = world.asteroids.get(movedId);
  if (!moved) return;

  for (const other of colliders) {
    // Destroy all buildings on both
    for (const bid of moved.buildings) {
      world.buildings.delete(bid);
    }
    moved.buildings = [];
    moved.buildQueue = [];

    for (const bid of other.buildings) {
      world.buildings.delete(bid);
    }
    other.buildings = [];
    other.buildQueue = [];

    // Remove all ships in orbit on both
    for (const sid of moved.inOrbit) {
      world.ships.delete(sid);
    }
    (moved as { inOrbit: readonly import("@fa/domain").ShipId[] }).inOrbit = [];

    for (const sid of other.inOrbit) {
      world.ships.delete(sid);
    }
    (other as { inOrbit: readonly import("@fa/domain").ShipId[] }).inOrbit = [];

    // Determine survivor: more engines count wins; tie goes to moved asteroid
    const movedWins = moved.engines.count >= other.engines.count;
    const loser = movedWins ? other : moved;
    const survivor = movedWins ? moved : other;

    // Handle ownership transfer via event
    const loserOwnerId = loser.ownerId;
    if (loserOwnerId) {
      const loserOwner = world.players.get(loserOwnerId);
      if (loserOwner?.isHuman) {
        world.eventQueue.push({
          kind: "asteroid.lost_in_collision",
          priority: "red",
          asteroidName: loser.name,
        });
      } else {
        world.eventQueue.push({
          kind: "asteroid.captured_in_collision",
          priority: "green",
          asteroidName: loser.name,
        });
        // Survivor takes ownership of the moving asteroid's original owner
        survivor.ownerId = moved.ownerId;
      }
    }

    // Park the loser off-map
    loser.name = `${loser.name} (destroyed)`;
    (loser as { sector: { x: number; y: number } }).sector = { x: -9999, y: -9999 };
  }
}
