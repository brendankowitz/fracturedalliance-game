import { asteroidId, buildingId, playerId } from "@fa/domain";
import type { AsteroidId, BuildingId, PlayerId, World } from "@fa/domain";
import { describe, expect, it } from "vitest";
import { makePrng } from "../prng.ts";
import { getHappinessMultiplier, tickHappiness } from "../systems/happinessSystem.ts";
import { tickMining } from "../systems/miningSystem.ts";

function makeWorld(): World {
  const humanId: PlayerId = playerId("player-human");
  const astId: AsteroidId = asteroidId("asteroid-1");
  const cpuBid: BuildingId = buildingId("cpu-1");
  const mineBid: BuildingId = buildingId("mine-1");
  return {
    tick: 0,
    seed: 1,
    difficulty: "director",
    asteroids: new Map([[astId, {
      id: astId, name: "TestBase", ownerId: humanId,
      sector: { x: 0, y: 0 }, sizeClass: "M" as const,
      deposits: { selenium: 10000 }, radiation: 0, stability: 100, happiness: 0.8,
      buildings: [cpuBid, mineBid], buildQueue: [], inOrbit: [],
      engines: { count: 0, destinationId: null, etaTick: null, chargeTick: null },
    }]]),
    buildings: new Map([
      [cpuBid, { id: cpuBid, defKind: "cpu", asteroidId: astId, cell: { x: 3, y: 3 }, hp: 100, maxHp: 100, constructionProgress: 1, active: true, damage: 0 }],
      [mineBid, { id: mineBid, defKind: "mineMk1", asteroidId: astId, cell: { x: 2, y: 2 }, hp: 100, maxHp: 100, constructionProgress: 1, active: true, damage: 0 }],
    ]),
    ships: new Map(),
    players: new Map([[humanId, {
      id: humanId, raceId: "helionCorp", isHuman: true,
      credits: 10000, oreInventory: {}, reputation: new Map(),
      federationStanding: 50, blueprintsOwned: new Set(),
      eventLog: [], alive: true, suspicion: 0, licenseRevoked: false,
    }]]),
    treaties: [],
    marketPrices: { selenium: 100, asteros: 150, barium: 220, crystalite: 300, quazinc: 380, bytanium: 500, korellium: 650, dragonium: 820, traxium: 1100, nexos: 1500 },
    eventQueue: [],
    prng: makePrng(42),
    schemaVersion: 1,
    nextBuildingSeq: 10,
    nextShipSeq: 0,
    nextTreatySeq: 0,
    gameEndState: null,
    agents: new Map(),
    expeditionFleet: { active: false, ticksRemaining: 0, fleetsLaunched: 0 },
  };
}

describe("Happiness multiplier", () => {
  it("returns 1.0 when happiness >= 0.3", () => {
    expect(getHappinessMultiplier(0.3)).toBe(1.0);
    expect(getHappinessMultiplier(0.8)).toBe(1.0);
  });

  it("returns 0.5 when happiness < 0.3", () => {
    expect(getHappinessMultiplier(0.29)).toBe(0.5);
    expect(getHappinessMultiplier(0.0)).toBe(0.5);
  });
});

describe("Mining productivity", () => {
  it("halves ore production when happiness < 0.3", () => {
    const world = makeWorld();
    const asteroid = [...world.asteroids.values()][0]!;
    const player = [...world.players.values()][0]!;

    asteroid.happiness = 0.8;
    world.eventQueue = [];
    tickMining(world);
    const fullOutput = player.oreInventory.selenium ?? 0;

    // Reset
    player.oreInventory = {};
    asteroid.deposits.selenium = 10000;
    asteroid.happiness = 0.25;
    tickMining(world);
    const reducedOutput = player.oreInventory.selenium ?? 0;

    expect(reducedOutput).toBeCloseTo(fullOutput * 0.5, 1);
  });
});

describe("Colony secession", () => {
  it("secedes when happiness < 0.1 on 100-tick boundary (deterministic seed)", () => {
    const world = makeWorld();
    const asteroid = [...world.asteroids.values()][0]!;
    asteroid.happiness = 0.05;

    // Run 2000 ticks — with 5% chance per 100-tick boundary, expect secession to occur
    let seceeded = false;
    for (let i = 0; i < 2000; i++) {
      world.tick = i;
      world.eventQueue = [];
      tickHappiness(world);
      if (world.eventQueue.some(e => e.kind === "colony.seceded")) {
        seceeded = true;
        break;
      }
    }
    expect(seceeded).toBe(true);
  });

  it("does not secede when happiness >= 0.1", () => {
    const world = makeWorld();
    const asteroid = [...world.asteroids.values()][0]!;
    asteroid.happiness = 0.1;

    for (let i = 0; i < 10000; i++) {
      world.tick = i;
      world.eventQueue = [];
      tickHappiness(world);
    }
    // Asteroid should still be owned
    expect(asteroid.ownerId).not.toBeNull();
  });
});
