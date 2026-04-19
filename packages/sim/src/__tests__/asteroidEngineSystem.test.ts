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
import { makePrng } from "../prng.ts";
import { applyCommand } from "../commandProcessor.ts";
import { tickAsteroidEngines } from "../systems/asteroidEngineSystem.ts";

function makeMinimalWorld(): World {
  const humanId: PlayerId = playerId("player-human");
  const aiId: PlayerId = playerId("player-ai");
  const humanAsteroidId: AsteroidId = asteroidId("asteroid-human");
  const aiAsteroidId: AsteroidId = asteroidId("asteroid-ai");
  const cpuBid: BuildingId = buildingId("cpu-1");

  const humanAsteroid = {
    id: humanAsteroidId,
    name: "Human Base",
    ownerId: humanId,
    sector: { x: 0, y: 0 },
    sizeClass: "M" as const,
    deposits: {},
    radiation: 0,
    stability: 100,
    happiness: 75,
    buildings: [cpuBid],
    buildQueue: [],
    inOrbit: [] as ShipId[],
    engines: { count: 3, destinationId: null, etaTick: null, chargeTick: null },
  };

  const aiAsteroid = {
    id: aiAsteroidId,
    name: "AI Base",
    ownerId: aiId,
    sector: { x: 3, y: 4 },
    sizeClass: "M" as const,
    deposits: {},
    radiation: 0,
    stability: 100,
    happiness: 75,
    buildings: [],
    buildQueue: [],
    inOrbit: [] as ShipId[],
    engines: { count: 0, destinationId: null, etaTick: null, chargeTick: null },
  };

  const humanPlayer = {
    id: humanId,
    raceId: "helionCorp",
    isHuman: true,
    credits: 10_000,
    oreInventory: {},
    reputation: new Map<PlayerId, number>(),
    federationStanding: 50,
    blueprintsOwned: new Set<import("@fa/domain").BlueprintId>(),
    eventLog: [],
    alive: true,
    suspicion: 0,
  };

  const aiPlayer = {
    id: aiId,
    raceId: "kryllCollective",
    isHuman: false,
    credits: 8_000,
    oreInventory: {},
    reputation: new Map<PlayerId, number>(),
    federationStanding: 30,
    blueprintsOwned: new Set<import("@fa/domain").BlueprintId>(),
    eventLog: [],
    alive: true,
    suspicion: 0,
  };

  const cpu = {
    id: cpuBid,
    defKind: "cpu",
    asteroidId: humanAsteroidId,
    cell: { x: 3, y: 3 },
    hp: 100,
    maxHp: 100,
    constructionProgress: 1,
    active: true,
    damage: 0,
  };

  return {
    tick: 0,
    seed: 1,
    asteroids: new Map([
      [humanAsteroidId, humanAsteroid],
      [aiAsteroidId, aiAsteroid],
    ]),
    buildings: new Map([[cpuBid, cpu]]),
    ships: new Map(),
    players: new Map([
      [humanId, humanPlayer],
      [aiId, aiPlayer],
    ]),
    treaties: [],
    marketPrices: {
      selenium: 100,
      asteros: 150,
      barium: 220,
      crystalite: 300,
      quazinc: 380,
      bytanium: 500,
      korellium: 650,
      dragonium: 820,
      traxium: 1100,
      nexos: 1500,
    },
    eventQueue: [],
    prng: makePrng(1),
    schemaVersion: 1,
    nextBuildingSeq: 0,
    nextShipSeq: 0,
    nextTreatySeq: 0,
    gameEndState: null,
    agents: new Map(),
  };
}

describe("setAsteroidDestination command", () => {
  it("sets chargeTick and fires asteroid.engine_charging event", () => {
    const world = makeMinimalWorld();
    const humanAsteroidId = asteroidId("asteroid-human");
    const aiAsteroidId = asteroidId("asteroid-ai");

    applyCommand(world, {
      kind: "setAsteroidDestination",
      asteroidId: humanAsteroidId,
      destinationId: aiAsteroidId,
    });

    const asteroid = world.asteroids.get(humanAsteroidId)!;
    expect(asteroid.engines.chargeTick).toBe(200);
    expect(asteroid.engines.destinationId).toBe(aiAsteroidId);
    expect(asteroid.engines.etaTick).toBeNull();

    const event = world.eventQueue.find((e) => e.kind === "asteroid.engine_charging");
    expect(event).toBeDefined();
    if (event?.kind === "asteroid.engine_charging") {
      expect(event.priority).toBe("amber");
      expect(event.asteroidName).toBe("Human Base");
      expect(event.destinationName).toBe("AI Base");
    }
  });

  it("ignores command when already charging", () => {
    const world = makeMinimalWorld();
    const humanAsteroidId = asteroidId("asteroid-human");
    const aiAsteroidId = asteroidId("asteroid-ai");

    const asteroid = world.asteroids.get(humanAsteroidId)!;
    asteroid.engines.chargeTick = 100;

    applyCommand(world, {
      kind: "setAsteroidDestination",
      asteroidId: humanAsteroidId,
      destinationId: aiAsteroidId,
    });

    // chargeTick unchanged, no new event
    expect(asteroid.engines.chargeTick).toBe(100);
    expect(world.eventQueue).toHaveLength(0);
  });

  it("ignores when already in transit (etaTick set, chargeTick null)", () => {
    const world = makeMinimalWorld();
    const humanAsteroidId = asteroidId("asteroid-human");
    const aiAsteroidId = asteroidId("asteroid-ai");

    const asteroid = world.asteroids.get(humanAsteroidId)!;
    asteroid.engines.etaTick = 150;
    asteroid.engines.chargeTick = null;

    applyCommand(world, {
      kind: "setAsteroidDestination",
      asteroidId: humanAsteroidId,
      destinationId: aiAsteroidId,
    });

    // etaTick unchanged, no new event
    expect(asteroid.engines.etaTick).toBe(150);
    expect(world.eventQueue).toHaveLength(0);
  });
});

describe("cancelAsteroidEngine command", () => {
  it("clears engine state", () => {
    const world = makeMinimalWorld();
    const humanAsteroidId = asteroidId("asteroid-human");
    const aiAsteroidId = asteroidId("asteroid-ai");

    const asteroid = world.asteroids.get(humanAsteroidId)!;
    asteroid.engines.destinationId = aiAsteroidId;
    asteroid.engines.chargeTick = 200;
    asteroid.engines.etaTick = null;

    applyCommand(world, { kind: "cancelAsteroidEngine", asteroidId: humanAsteroidId });

    expect(asteroid.engines.destinationId).toBeNull();
    expect(asteroid.engines.chargeTick).toBeNull();
    expect(asteroid.engines.etaTick).toBeNull();
  });
});

describe("tickAsteroidEngines — charge phase", () => {
  it("fires asteroid.engine_fired and sets etaTick at chargeTick", () => {
    const world = makeMinimalWorld();
    const humanAsteroidId = asteroidId("asteroid-human");
    const aiAsteroidId = asteroidId("asteroid-ai");

    const asteroid = world.asteroids.get(humanAsteroidId)!;
    asteroid.engines.destinationId = aiAsteroidId;
    asteroid.engines.chargeTick = 10;
    world.tick = 10;

    tickAsteroidEngines(world);

    expect(asteroid.engines.etaTick).not.toBeNull();
    const event = world.eventQueue.find((e) => e.kind === "asteroid.engine_fired");
    expect(event).toBeDefined();
    if (event?.kind === "asteroid.engine_fired") {
      expect(event.priority).toBe("red");
      expect(event.asteroidName).toBe("Human Base");
      expect(event.destinationName).toBe("AI Base");
    }

    // Distance from (0,0) to (3,4) = 5; travelTicks = max(100, round(5 * 20)) = 100
    expect(asteroid.engines.etaTick).toBe(10 + 100);
  });

  it("does not fire at wrong tick", () => {
    const world = makeMinimalWorld();
    const humanAsteroidId = asteroidId("asteroid-human");
    const aiAsteroidId = asteroidId("asteroid-ai");

    const asteroid = world.asteroids.get(humanAsteroidId)!;
    asteroid.engines.destinationId = aiAsteroidId;
    asteroid.engines.chargeTick = 10;
    world.tick = 9;

    tickAsteroidEngines(world);

    expect(asteroid.engines.etaTick).toBeNull();
    expect(world.eventQueue).toHaveLength(0);
  });
});

describe("tickAsteroidEngines — arrival phase", () => {
  it("moves asteroid sector to destination at etaTick", () => {
    const world = makeMinimalWorld();
    const humanAsteroidId = asteroidId("asteroid-human");
    const aiAsteroidId = asteroidId("asteroid-ai");

    const asteroid = world.asteroids.get(humanAsteroidId)!;
    asteroid.engines.destinationId = aiAsteroidId;
    asteroid.engines.chargeTick = 10;
    asteroid.engines.etaTick = 110;
    world.tick = 110;

    tickAsteroidEngines(world);

    expect(asteroid.sector.x).toBe(3);
    expect(asteroid.sector.y).toBe(4);
    expect(asteroid.engines.destinationId).toBeNull();
    expect(asteroid.engines.chargeTick).toBeNull();
    expect(asteroid.engines.etaTick).toBeNull();
  });

  it("fires early if world.tick > etaTick", () => {
    const world = makeMinimalWorld();
    const humanAsteroidId = asteroidId("asteroid-human");
    const aiAsteroidId = asteroidId("asteroid-ai");

    const asteroid = world.asteroids.get(humanAsteroidId)!;
    asteroid.engines.destinationId = aiAsteroidId;
    asteroid.engines.chargeTick = 10;
    asteroid.engines.etaTick = 110;
    world.tick = 115;

    tickAsteroidEngines(world);

    expect(asteroid.sector.x).toBe(3);
    expect(asteroid.sector.y).toBe(4);
  });
});

describe("tickAsteroidEngines — collision", () => {
  it("destroys buildings and ships, parks loser off-map", () => {
    const world = makeMinimalWorld();
    const humanAsteroidId = asteroidId("asteroid-human");
    const aiAsteroidId = asteroidId("asteroid-ai");

    // Place both asteroids at same sector via arriving
    const humanAsteroid = world.asteroids.get(humanAsteroidId)!;
    const aiAsteroid = world.asteroids.get(aiAsteroidId)!;

    // Give ai asteroid a building
    const aiBid = buildingId("ai-building-1");
    world.buildings.set(aiBid, {
      id: aiBid,
      defKind: "powerPlant",
      asteroidId: aiAsteroidId,
      cell: { x: 1, y: 1 },
      hp: 100,
      maxHp: 100,
      constructionProgress: 1,
      active: true,
      damage: 0,
    });
    aiAsteroid.buildings.push(aiBid);

    // Give human asteroid a ship in orbit
    const orbitShipId = shipId("ship-orbit-1");
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
    (humanAsteroid as unknown as { inOrbit: ShipId[] }).inOrbit = [orbitShipId];

    // Set up human asteroid to arrive at ai asteroid's sector
    humanAsteroid.engines.destinationId = aiAsteroidId;
    humanAsteroid.engines.chargeTick = 10;
    humanAsteroid.engines.etaTick = 110;
    world.tick = 110;

    tickAsteroidEngines(world);

    // AI asteroid loses (0 engines vs 3), should be parked
    expect(aiAsteroid.sector.x).toBe(-9999);
    expect(aiAsteroid.sector.y).toBe(-9999);
    expect(aiAsteroid.name).toContain("(destroyed)");

    // AI building removed from world
    expect(world.buildings.has(aiBid)).toBe(false);

    // Ship in orbit removed
    expect(world.ships.has(orbitShipId)).toBe(false);

    // Human asteroid (survivor) moved to destination
    expect(humanAsteroid.sector.x).toBe(3);
    expect(humanAsteroid.sector.y).toBe(4);
  });

  it("fires asteroid.captured_in_collision when AI asteroid is destroyed", () => {
    const world = makeMinimalWorld();
    const humanAsteroidId = asteroidId("asteroid-human");
    const aiAsteroidId = asteroidId("asteroid-ai");

    const humanAsteroid = world.asteroids.get(humanAsteroidId)!;
    humanAsteroid.engines.destinationId = aiAsteroidId;
    humanAsteroid.engines.chargeTick = 10;
    humanAsteroid.engines.etaTick = 110;
    world.tick = 110;

    tickAsteroidEngines(world);

    const event = world.eventQueue.find((e) => e.kind === "asteroid.captured_in_collision");
    expect(event).toBeDefined();
    if (event?.kind === "asteroid.captured_in_collision") {
      expect(event.priority).toBe("green");
    }
  });

  it("fires asteroid.lost_in_collision when human asteroid is the loser", () => {
    const world = makeMinimalWorld();
    const humanAsteroidId = asteroidId("asteroid-human");
    const aiAsteroidId = asteroidId("asteroid-ai");

    // Give AI asteroid more engines so it wins
    const aiAsteroid = world.asteroids.get(aiAsteroidId)!;
    aiAsteroid.engines.count = 5;

    // Move human asteroid (3 engines) into AI's sector manually via engine
    const humanAsteroid = world.asteroids.get(humanAsteroidId)!;
    humanAsteroid.engines.destinationId = aiAsteroidId;
    humanAsteroid.engines.chargeTick = 10;
    humanAsteroid.engines.etaTick = 110;
    world.tick = 110;

    tickAsteroidEngines(world);

    const event = world.eventQueue.find((e) => e.kind === "asteroid.lost_in_collision");
    expect(event).toBeDefined();
    if (event?.kind === "asteroid.lost_in_collision") {
      expect(event.priority).toBe("red");
    }
  });
});

describe("tickAsteroidEngines — gravity nullifier deflection", () => {
  it("deflects incoming asteroid by +1 x when target has completed gravityNullifier", () => {
    const world = makeMinimalWorld();
    const humanAsteroidId = asteroidId("asteroid-human");
    const aiAsteroidId = asteroidId("asteroid-ai");

    // Add a completed gravity nullifier on the AI asteroid
    const gnBid = buildingId("gn-1");
    world.buildings.set(gnBid, {
      id: gnBid,
      defKind: "gravityNullifier",
      asteroidId: aiAsteroidId,
      cell: { x: 2, y: 2 },
      hp: 100,
      maxHp: 100,
      constructionProgress: 1,
      active: true,
      damage: 0,
    });
    const aiAsteroid = world.asteroids.get(aiAsteroidId)!;
    aiAsteroid.buildings.push(gnBid);

    // Human asteroid aimed at AI (sector 3,4), should land at 4,4
    const humanAsteroid = world.asteroids.get(humanAsteroidId)!;
    humanAsteroid.engines.destinationId = aiAsteroidId;
    humanAsteroid.engines.chargeTick = 10;
    humanAsteroid.engines.etaTick = 110;
    world.tick = 110;

    tickAsteroidEngines(world);

    expect(humanAsteroid.sector.x).toBe(4);
    expect(humanAsteroid.sector.y).toBe(4);

    const deflectEvent = world.eventQueue.find((e) => e.kind === "asteroid.deflected");
    expect(deflectEvent).toBeDefined();
    if (deflectEvent?.kind === "asteroid.deflected") {
      expect(deflectEvent.priority).toBe("amber");
      expect(deflectEvent.asteroidName).toBe("Human Base");
    }
  });

  it("does not deflect when gravityNullifier is incomplete (constructionProgress < 1)", () => {
    const world = makeMinimalWorld();
    const humanAsteroidId = asteroidId("asteroid-human");
    const aiAsteroidId = asteroidId("asteroid-ai");

    const gnBid = buildingId("gn-incomplete");
    world.buildings.set(gnBid, {
      id: gnBid,
      defKind: "gravityNullifier",
      asteroidId: aiAsteroidId,
      cell: { x: 2, y: 2 },
      hp: 100,
      maxHp: 100,
      constructionProgress: 0.5,
      active: false,
      damage: 0,
    });
    const aiAsteroid = world.asteroids.get(aiAsteroidId)!;
    aiAsteroid.buildings.push(gnBid);

    const humanAsteroid = world.asteroids.get(humanAsteroidId)!;
    humanAsteroid.engines.destinationId = aiAsteroidId;
    humanAsteroid.engines.chargeTick = 10;
    humanAsteroid.engines.etaTick = 110;
    world.tick = 110;

    tickAsteroidEngines(world);

    // No deflection — lands at destination sector (3,4)
    expect(humanAsteroid.sector.x).toBe(3);
    expect(humanAsteroid.sector.y).toBe(4);
    expect(world.eventQueue.find((e) => e.kind === "asteroid.deflected")).toBeUndefined();
  });
});
