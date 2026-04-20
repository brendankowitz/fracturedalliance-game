import { asteroidId, buildingId, playerId, type World, type AsteroidId, type BuildingId, type PlayerId } from "@fa/domain";
import { describe, expect, it } from "vitest";
import { applyCommand } from "../commandProcessor.ts";
import { makePrng } from "../prng.ts";
import { BASE_PRICES, tickEconomy } from "../systems/economySystem.ts";

function makeMinimalWorld(): World {
  const humanId: PlayerId = playerId("player-human");
  const humanAstId: AsteroidId = asteroidId("asteroid-human");
  const cpuBid: BuildingId = buildingId("cpu-1");

  return {
    tick: 0,
    seed: 1,
    asteroids: new Map([
      [
        humanAstId,
        {
          id: humanAstId,
          name: "Human Base",
          ownerId: humanId,
          sector: { x: 0, y: 0 },
          sizeClass: "M" as const,
          deposits: {},
          radiation: 0,
          stability: 100,
          happiness: 0.8,
          buildings: [cpuBid],
          buildQueue: [],
          inOrbit: [],
          engines: { count: 0, destinationId: null, etaTick: null, chargeTick: null },
        },
      ],
    ]),
    buildings: new Map([
      [
        cpuBid,
        {
          id: cpuBid,
          defKind: "cpu",
          asteroidId: humanAstId,
          cell: { x: 3, y: 3 },
          hp: 100,
          maxHp: 100,
          constructionProgress: 1,
          active: true,
          damage: 0,
        },
      ],
    ]),
    ships: new Map(),
    players: new Map([
      [
        humanId,
        {
          id: humanId,
          raceId: "helionCorp",
          isHuman: true,
          credits: 50_000,
          oreInventory: {},
          reputation: new Map(),
          federationStanding: 50,
          blueprintsOwned: new Set(),
          eventLog: [],
          alive: true,
          suspicion: 0,
          licenseRevoked: false,
        },
      ],
    ]),
    treaties: [],
    marketPrices: { ...BASE_PRICES },
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

function makeMockPrng(value: number) {
  return {
    next: () => value,
    state: () => 0,
    restore: () => {},
  };
}

describe("tickEconomy — drift", () => {
  it("does not mutate prices when tick is not a multiple of 60", () => {
    const world = makeMinimalWorld();
    world.tick = 59;
    const before = { ...world.marketPrices };
    tickEconomy(world);
    expect(world.marketPrices).toEqual(before);
  });

  it("drifts prices at tick % 60 === 0", () => {
    const world = makeMinimalWorld();
    world.tick = 60;
    // prng returns 1.0 → drift = 1 + (1.0 - 0.5) * 0.1 = 1.05 (upward)
    world.prng = makeMockPrng(1.0);
    const seleniumBefore = world.marketPrices.selenium;
    tickEconomy(world);
    expect(world.marketPrices.selenium).toBeGreaterThan(seleniumBefore);
  });

  it("prices drift downward when prng returns 0.0", () => {
    const world = makeMinimalWorld();
    world.tick = 60;
    world.prng = makeMockPrng(0.0);
    const seleniumBefore = world.marketPrices.selenium;
    tickEconomy(world);
    expect(world.marketPrices.selenium).toBeLessThan(seleniumBefore);
  });
});

describe("tickEconomy — clamp ceiling (base * 2.0)", () => {
  it("clamps prices at base * 2.0 with maximum upward drift", () => {
    const world = makeMinimalWorld();
    // Pre-inflate all prices to just below the ceiling
    for (const key of Object.keys(world.marketPrices) as Array<keyof typeof world.marketPrices>) {
      world.marketPrices[key] = BASE_PRICES[key] * 2.0;
    }
    world.tick = 60;
    world.prng = makeMockPrng(1.0); // always maximum upward
    tickEconomy(world);

    for (const key of Object.keys(BASE_PRICES) as Array<keyof typeof BASE_PRICES>) {
      expect(world.marketPrices[key]).toBeLessThanOrEqual(BASE_PRICES[key] * 2.0);
    }
  });
});

describe("tickEconomy — clamp floor (base * 0.5)", () => {
  it("clamps prices at base * 0.5 with maximum downward drift", () => {
    const world = makeMinimalWorld();
    // Pre-deflate all prices to the floor
    for (const key of Object.keys(world.marketPrices) as Array<keyof typeof world.marketPrices>) {
      world.marketPrices[key] = BASE_PRICES[key] * 0.5;
    }
    world.tick = 60;
    world.prng = makeMockPrng(0.0); // always maximum downward
    tickEconomy(world);

    for (const key of Object.keys(BASE_PRICES) as Array<keyof typeof BASE_PRICES>) {
      expect(world.marketPrices[key]).toBeGreaterThanOrEqual(BASE_PRICES[key] * 0.5);
    }
  });
});

describe("sellOre command", () => {
  it("deducts ore, adds credits, reduces market price", () => {
    const world = makeMinimalWorld();
    const human = world.players.get(playerId("player-human"))!;
    human.oreInventory["selenium"] = 20;
    const creditsBefore = human.credits;
    const priceBefore = world.marketPrices.selenium;

    applyCommand(world, { kind: "sellOre", oreKind: "selenium", quantity: 10 });

    expect(human.oreInventory["selenium"]).toBe(10);
    expect(human.credits).toBeCloseTo(creditsBefore + 10 * priceBefore, 1);
    expect(world.marketPrices.selenium).toBeLessThan(priceBefore);
  });

  it("fails when inventory is insufficient", () => {
    const world = makeMinimalWorld();
    const human = world.players.get(playerId("player-human"))!;
    human.oreInventory["selenium"] = 5;
    const creditsBefore = human.credits;

    applyCommand(world, { kind: "sellOre", oreKind: "selenium", quantity: 10 });

    expect(human.credits).toBe(creditsBefore);
    expect(human.oreInventory["selenium"]).toBe(5);
  });

  it("fails when quantity is 0", () => {
    const world = makeMinimalWorld();
    const human = world.players.get(playerId("player-human"))!;
    human.oreInventory["selenium"] = 20;
    const creditsBefore = human.credits;

    applyCommand(world, { kind: "sellOre", oreKind: "selenium", quantity: 0 });

    expect(human.credits).toBe(creditsBefore);
  });

  it("fails when ore kind is not in marketPrices", () => {
    const world = makeMinimalWorld();
    const human = world.players.get(playerId("player-human"))!;
    human.oreInventory["iron"] = 50;
    const creditsBefore = human.credits;

    applyCommand(world, { kind: "sellOre", oreKind: "iron", quantity: 10 });

    expect(human.credits).toBe(creditsBefore);
  });
});

describe("buyOre command", () => {
  it("deducts credits, adds ore, raises market price", () => {
    const world = makeMinimalWorld();
    const human = world.players.get(playerId("player-human"))!;
    const priceBefore = world.marketPrices.selenium;
    const creditsBefore = human.credits;

    applyCommand(world, { kind: "buyOre", oreKind: "selenium", quantity: 10 });

    expect(human.oreInventory["selenium"]).toBe(10);
    expect(human.credits).toBeCloseTo(creditsBefore - 10 * priceBefore, 1);
    expect(world.marketPrices.selenium).toBeGreaterThan(priceBefore);
  });

  it("fails when credits are insufficient", () => {
    const world = makeMinimalWorld();
    const human = world.players.get(playerId("player-human"))!;
    // nexos = 1500/unit, 10 units = 15000, but human only has 50000 credits — set lower
    human.credits = 100;
    const oreBefore = human.oreInventory["nexos"] ?? 0;

    applyCommand(world, { kind: "buyOre", oreKind: "nexos", quantity: 10 });

    expect(human.credits).toBe(100);
    expect(human.oreInventory["nexos"] ?? 0).toBe(oreBefore);
  });

  it("fails when quantity is 0", () => {
    const world = makeMinimalWorld();
    const human = world.players.get(playerId("player-human"))!;
    const creditsBefore = human.credits;

    applyCommand(world, { kind: "buyOre", oreKind: "selenium", quantity: 0 });

    expect(human.credits).toBe(creditsBefore);
  });
});
