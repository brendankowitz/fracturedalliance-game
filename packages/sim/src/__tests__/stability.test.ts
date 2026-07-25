import type { World } from "@fa/domain";
import {
  type AsteroidId,
  asteroidId,
  type BuildingId,
  buildingId,
  type PlayerId,
  playerId,
  type ShipId,
  shipId,
} from "@fa/domain";
import { describe, expect, it } from "vitest";
import { tickAsteroidEngines } from "../systems/asteroidEngineSystem.ts";
import { makeTestAsteroid, makeTestBuilding, makeTestPlayer, makeTestWorld } from "./testWorld.ts";

function makeMinimalWorld(): World {
  const humanId: PlayerId = playerId("player-human");
  const aiId: PlayerId = playerId("player-ai");
  const humanAsteroidId: AsteroidId = asteroidId("asteroid-human");
  const aiAsteroidId: AsteroidId = asteroidId("asteroid-ai");
  const cpuBid: BuildingId = buildingId("cpu-1");

  return makeTestWorld({
    asteroids: new Map([
      [
        humanAsteroidId,
        makeTestAsteroid(humanAsteroidId, {
          name: "Human Base",
          ownerId: humanId,
          buildings: [cpuBid],
          engines: { count: 3, destinationId: null, etaTick: null, chargeTick: null },
        }),
      ],
      [
        aiAsteroidId,
        makeTestAsteroid(aiAsteroidId, {
          name: "AI Base",
          ownerId: aiId,
          sector: { x: 3, y: 4 },
        }),
      ],
    ]),
    buildings: new Map([[cpuBid, makeTestBuilding(cpuBid, humanAsteroidId)]]),
    players: new Map([
      [humanId, makeTestPlayer(humanId, { raceId: "helionCorp", isHuman: true, credits: 10_000 })],
      [
        aiId,
        makeTestPlayer(aiId, {
          raceId: "kryllCollective",
          isHuman: false,
          credits: 8_000,
          federationStanding: 30,
        }),
      ],
    ]),
  });
}

describe("asteroid stability — decay on engine fire", () => {
  it("decreases stability when engine fires (chargeTick reached)", () => {
    const world = makeMinimalWorld();
    const humanAsteroidId = asteroidId("asteroid-human");
    const aiAsteroidId = asteroidId("asteroid-ai");

    const asteroid = world.asteroids.get(humanAsteroidId)!;
    asteroid.stability = 100;
    asteroid.engines.destinationId = aiAsteroidId;
    asteroid.engines.chargeTick = 10;
    world.tick = 10;

    tickAsteroidEngines(world);

    expect(asteroid.stability).toBeLessThan(100);
  });

  it("does not decrease stability when engine has not yet fired", () => {
    const world = makeMinimalWorld();
    const humanAsteroidId = asteroidId("asteroid-human");
    const aiAsteroidId = asteroidId("asteroid-ai");

    const asteroid = world.asteroids.get(humanAsteroidId)!;
    asteroid.stability = 100;
    asteroid.engines.destinationId = aiAsteroidId;
    asteroid.engines.chargeTick = 10;
    world.tick = 9;

    tickAsteroidEngines(world);

    expect(asteroid.stability).toBe(100);
  });
});

describe("asteroid stability — destruction at zero", () => {
  it("clears buildings and ships, sets ownerId to null when stability reaches 0", () => {
    const world = makeMinimalWorld();
    const humanAsteroidId = asteroidId("asteroid-human");
    const aiAsteroidId = asteroidId("asteroid-ai");

    const orbitShipId: ShipId = shipId("ship-orbit-1");
    world.ships.set(orbitShipId, {
      id: orbitShipId,
      defKind: "assaultCraft",
      ownerId: playerId("player-human"),
      hullHp: 80,
      shieldHp: 0,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      order: { kind: "idle" },
      cargo: {},
    });

    const asteroid = world.asteroids.get(humanAsteroidId)!;
    // Set stability just above 0 so one engine fire destroys it
    asteroid.stability = 0.05;
    asteroid.inOrbit = [orbitShipId];
    asteroid.engines.destinationId = aiAsteroidId;
    asteroid.engines.chargeTick = 10;
    world.tick = 10;

    tickAsteroidEngines(world);

    expect(asteroid.ownerId).toBeNull();
    expect(asteroid.buildings).toHaveLength(0);
    expect(asteroid.inOrbit).toHaveLength(0);
    expect(world.buildings.has(buildingId("cpu-1"))).toBe(false);
    expect(world.ships.has(orbitShipId)).toBe(false);
  });

  it("pushes asteroid.destroyed event for human-owned asteroids on destruction", () => {
    const world = makeMinimalWorld();
    const humanAsteroidId = asteroidId("asteroid-human");
    const aiAsteroidId = asteroidId("asteroid-ai");

    const asteroid = world.asteroids.get(humanAsteroidId)!;
    asteroid.stability = 0.05;
    asteroid.engines.destinationId = aiAsteroidId;
    asteroid.engines.chargeTick = 10;
    world.tick = 10;

    tickAsteroidEngines(world);

    const event = world.eventQueue.find((e) => e.kind === "asteroid.destroyed");
    expect(event).toBeDefined();
    if (event?.kind === "asteroid.destroyed") {
      expect(event.priority).toBe("red");
      expect(event.asteroidName).toBe("Human Base");
    }
  });

  it("does not push asteroid.destroyed event for AI-owned asteroids on destruction", () => {
    const world = makeMinimalWorld();
    const _humanAsteroidId = asteroidId("asteroid-human");
    const aiAsteroidId = asteroidId("asteroid-ai");

    // Move the low-stability asteroid to the AI-owned one
    const aiAsteroid = world.asteroids.get(aiAsteroidId)!;
    aiAsteroid.engines.count = 2;
    aiAsteroid.stability = 0.05;

    // Give AI asteroid a destination (create a third asteroid to aim at)
    const thirdId: AsteroidId = asteroidId("asteroid-third");
    world.asteroids.set(thirdId, {
      id: thirdId,
      name: "Third Rock",
      ownerId: null,
      sector: { x: 6, y: 8 },
      sizeClass: "S" as const,
      deposits: {},
      radiation: 0,
      stability: 100,
      happiness: 0,
      buildings: [],
      buildQueue: [],
      inOrbit: [] as ShipId[],
      engines: { count: 0, destinationId: null, etaTick: null, chargeTick: null },
    });

    aiAsteroid.engines.destinationId = thirdId;
    aiAsteroid.engines.chargeTick = 10;
    world.tick = 10;

    tickAsteroidEngines(world);

    const event = world.eventQueue.find((e) => e.kind === "asteroid.destroyed");
    expect(event).toBeUndefined();
  });
});
