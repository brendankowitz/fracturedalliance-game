import type { World } from "@fa/domain";
import {
  type AsteroidId,
  asteroidId,
  type BlueprintId,
  blueprintId,
  type BuildingId,
  buildingId,
  type PlayerId,
  playerId,
} from "@fa/domain";
import { describe, expect, it } from "vitest";
import { makePrng } from "../prng.ts";
import { checkVictory } from "../systems/victorySystem.ts";
import { DESTROYED_SECTOR_COORD } from "../systems/asteroidEngineSystem.ts";

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
    blueprintsOwned: new Set<BlueprintId>(),
    eventLog: [],
    alive: true,
    suspicion: 0,
    licenseRevoked: false,
  };

  const aiPlayer = {
    id: aiId,
    raceId: "kryllCollective",
    isHuman: false,
    credits: 8_000,
    oreInventory: {},
    reputation: new Map<PlayerId, number>(),
    federationStanding: 30,
    blueprintsOwned: new Set<BlueprintId>(),
    eventLog: [],
    alive: true,
    suspicion: 0,
    licenseRevoked: false,
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
    agents: new Map(),
    difficulty: "manager" as const,
    expeditionFleet: { active: false, ticksRemaining: 0, fleetsLaunched: 0 },
  };
}

describe("victorySystem", () => {
  it("is a no-op when gameEndState is already set", () => {
    const world = makeMinimalWorld();
    world.gameEndState = "defeat";

    checkVictory(world);

    expect(world.gameEndState).toBe("defeat");
    expect(world.eventQueue).toHaveLength(0);
  });

  it("sets defeat when human.alive is false", () => {
    const world = makeMinimalWorld();
    const human = world.players.get(playerId("player-human"))!;
    human.alive = false;

    checkVictory(world);

    expect(world.gameEndState).toBe("defeat");
  });

  it("fires game.ended event on defeat", () => {
    const world = makeMinimalWorld();
    const human = world.players.get(playerId("player-human"))!;
    human.alive = false;

    checkVictory(world);

    expect(world.eventQueue).toContainEqual({
      kind: "game.ended",
      priority: "red",
      state: "defeat",
    });
  });

  it("sets victory:military when all AI players are dead", () => {
    const world = makeMinimalWorld();
    const ai = world.players.get(playerId("player-ai"))!;
    ai.alive = false;

    checkVictory(world);

    expect(world.gameEndState).toBe("victory:military");
  });

  it("does not set military victory when some AI is still alive", () => {
    const world = makeMinimalWorld();

    checkVictory(world);

    expect(world.gameEndState).toBeNull();
  });

  it("fires game.ended event on military victory", () => {
    const world = makeMinimalWorld();
    const ai = world.players.get(playerId("player-ai"))!;
    ai.alive = false;

    checkVictory(world);

    expect(world.eventQueue).toContainEqual({
      kind: "game.ended",
      priority: "red",
      state: "victory:military",
    });
  });

  it("sets victory:economic when credits >= 1,000,000", () => {
    const world = makeMinimalWorld();
    const human = world.players.get(playerId("player-human"))!;
    human.credits = 1_000_000;

    checkVictory(world);

    expect(world.gameEndState).toBe("victory:economic");
  });

  it("does not set economic victory when credits < 1,000,000", () => {
    const world = makeMinimalWorld();
    const human = world.players.get(playerId("player-human"))!;
    human.credits = 999_999;

    checkVictory(world);

    expect(world.gameEndState).toBeNull();
  });

  it("sets victory:diplomatic when federationStanding >= 100", () => {
    const world = makeMinimalWorld();
    const human = world.players.get(playerId("player-human"))!;
    human.federationStanding = 100;

    checkVictory(world);

    expect(world.gameEndState).toBe("victory:diplomatic");
  });

  it("sets victory:science when blueprintsOwned.size >= 40", () => {
    const world = makeMinimalWorld();
    const human = world.players.get(playerId("player-human"))!;
    for (let i = 0; i < 40; i++) {
      human.blueprintsOwned.add(blueprintId(`bp-${i}`));
    }

    checkVictory(world);

    expect(world.gameEndState).toBe("victory:science");
  });

  it("sets victory:independence when human owns > 50% of non-destroyed asteroids", () => {
    const world = makeMinimalWorld();
    const humanId = playerId("player-human");
    // Human owns both asteroids, AI owns none — 2/2 = 100%
    const aiAsteroid = world.asteroids.get(asteroidId("asteroid-ai"))!;
    aiAsteroid.ownerId = humanId;

    checkVictory(world);

    expect(world.gameEndState).toBe("victory:independence");
  });

  it("excludes destroyed asteroids (sector -9999,-9999) from independence count", () => {
    const world = makeMinimalWorld();
    const humanId = playerId("player-human");
    // Move AI asteroid to destroyed sector
    const aiAsteroid = world.asteroids.get(asteroidId("asteroid-ai"))!;
    aiAsteroid.sector = { x: DESTROYED_SECTOR_COORD, y: DESTROYED_SECTOR_COORD };

    // Human owns 1 non-destroyed asteroid out of 1 — 100% > 50%
    checkVictory(world);

    // The sole remaining non-destroyed asteroid is human-owned
    const humanAsteroid = world.asteroids.get(asteroidId("asteroid-human"))!;
    expect(humanAsteroid.ownerId).toBe(humanId);
    expect(world.gameEndState).toBe("victory:independence");
  });

  it("does not trigger independence victory when human owns exactly 50% of asteroids", () => {
    const world = makeMinimalWorld();
    const humanId = playerId("player-human");
    // 1 human, 1 AI = 50%, not > 50%
    // (default setup already has this)

    checkVictory(world);

    expect(world.gameEndState).toBeNull();
  });

  it("does not trigger independence victory with zero human-owned asteroids", () => {
    const world = makeMinimalWorld();
    const aiId = playerId("player-ai");
    // Both asteroids owned by AI
    const humanAsteroid = world.asteroids.get(asteroidId("asteroid-human"))!;
    humanAsteroid.ownerId = aiId;

    checkVictory(world);

    expect(world.gameEndState).toBeNull();
  });
});
