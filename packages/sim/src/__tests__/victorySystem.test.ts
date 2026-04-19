import type { World } from "@fa/domain";
import {
  type AsteroidId,
  asteroidId,
  type BuildingId,
  buildingId,
  type PlayerId,
  playerId,
} from "@fa/domain";
import { describe, expect, it } from "vitest";
import { makePrng } from "../prng.ts";
import { tickVictory } from "../systems/victorySystem.ts";

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
    inOrbit: [],
    engines: { count: 0, destinationId: null, etaTick: null, chargeTick: null },
  };

  const aiAsteroid = {
    id: aiAsteroidId,
    name: "AI Base",
    ownerId: aiId,
    sector: { x: 10, y: 10 },
    sizeClass: "M" as const,
    deposits: {},
    radiation: 0,
    stability: 100,
    happiness: 75,
    buildings: [],
    buildQueue: [],
    inOrbit: [],
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
    tick: 100,
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
  };
}

describe("victorySystem", () => {
  it("does nothing before 30 sim-days when human has asteroid", () => {
    const world = makeMinimalWorld();
    // tick = 100, well below 3000
    tickVictory(world);
    expect(world.gameEndState).toBeNull();
  });

  it("sets victory.survivor at tick 3000", () => {
    const world = makeMinimalWorld();
    world.tick = 3_000;
    tickVictory(world);
    expect(world.gameEndState).toBe("victory.survivor");
  });

  it("sets defeat when human has no asteroids", () => {
    const world = makeMinimalWorld();
    // Remove human ownership of their asteroid
    const humanId = playerId("player-human");
    const humanAsteroid = world.asteroids.get(asteroidId("asteroid-human"));
    if (humanAsteroid) humanAsteroid.ownerId = null;

    tickVictory(world);

    expect(world.gameEndState).toBe("defeat");
    // Ensure the human player is still alive (defeat is asteroid-based, not player-alive)
    expect(world.players.get(humanId)?.alive).toBe(true);
  });

  it("sets defeat when human is not alive", () => {
    const world = makeMinimalWorld();
    const humanId = playerId("player-human");
    const human = world.players.get(humanId);
    if (human) human.alive = false;

    tickVictory(world);

    expect(world.gameEndState).toBe("defeat");
  });

  it("sets victory.militaryDominance when AI owns no asteroids", () => {
    const world = makeMinimalWorld();
    // Remove AI ownership of their asteroid
    const aiAsteroid = world.asteroids.get(asteroidId("asteroid-ai"));
    if (aiAsteroid) aiAsteroid.ownerId = null;

    tickVictory(world);

    expect(world.gameEndState).toBe("victory.militaryDominance");
  });

  it("does not change gameEndState once set", () => {
    const world = makeMinimalWorld();
    world.gameEndState = "defeat";
    world.tick = 3_000;

    tickVictory(world);

    // Still "defeat", survivor check is skipped
    expect(world.gameEndState).toBe("defeat");
  });

  it("prefers defeat over survivor when human loses asteroid at tick 3000", () => {
    const world = makeMinimalWorld();
    world.tick = 3_000;
    // Human still alive but owns no asteroid
    const humanAsteroid = world.asteroids.get(asteroidId("asteroid-human"));
    if (humanAsteroid) humanAsteroid.ownerId = null;

    tickVictory(world);

    // Defeat is checked before survivor win
    expect(world.gameEndState).toBe("defeat");
  });
});
