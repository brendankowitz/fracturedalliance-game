import type { World } from "@fa/domain";
import { asteroidId, buildingId, playerId } from "@fa/domain";
import type { AsteroidId, BuildingId, PlayerId } from "@fa/domain";
import { describe, expect, it } from "vitest";
import { applyCommand } from "../commandProcessor.ts";
import { makePrng } from "../prng.ts";
import { tickBlackMarket } from "../systems/blackMarketSystem.ts";

function makeMinimalWorld(): World {
  const humanId: PlayerId = playerId("player-human");
  const maunaId: PlayerId = playerId("player-mauna");
  const humanAstId: AsteroidId = asteroidId("asteroid-human");
  const cpuBid: BuildingId = buildingId("cpu-1");

  return {
    tick: 100,
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
          credits: 10_000,
          oreInventory: {},
          reputation: new Map([[maunaId, 0]]),
          federationStanding: 50,
          blueprintsOwned: new Set(),
          eventLog: [],
          alive: true,
          suspicion: 10,
          licenseRevoked: false,
        },
      ],
      [
        maunaId,
        {
          id: maunaId,
          raceId: "mauna",
          isHuman: false,
          credits: 5_000,
          oreInventory: {},
          reputation: new Map(),
          federationStanding: 30,
          blueprintsOwned: new Set(),
          eventLog: [],
          alive: true,
          suspicion: 0,
          licenseRevoked: false,
        },
      ],
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

describe("tickBlackMarket — suspicion decay", () => {
  it("decays suspicion by 1 per 100-tick call (min 0)", () => {
    const world = makeMinimalWorld();
    const human = world.players.get(playerId("player-human"))!;
    human.suspicion = 5;
    world.tick = 100;
    tickBlackMarket(world);
    expect(human.suspicion).toBe(4);
  });

  it("does not decay suspicion below 0", () => {
    const world = makeMinimalWorld();
    const human = world.players.get(playerId("player-human"))!;
    human.suspicion = 0;
    world.tick = 100;
    tickBlackMarket(world);
    expect(human.suspicion).toBe(0);
  });

  it("does not decay suspicion on non-100 ticks", () => {
    const world = makeMinimalWorld();
    const human = world.players.get(playerId("player-human"))!;
    human.suspicion = 5;
    world.tick = 99;
    tickBlackMarket(world);
    expect(human.suspicion).toBe(5);
  });
});

describe("blackMarketBuy — oreCache", () => {
  it("adds 200 iron and increases suspicion by 5", () => {
    const world = makeMinimalWorld();
    const human = world.players.get(playerId("player-human"))!;
    human.suspicion = 0;
    applyCommand(world, { kind: "blackMarketBuy", itemKind: "oreCache" });
    expect(human.oreInventory["iron"]).toBe(200);
    expect(human.suspicion).toBe(5);
    expect(human.credits).toBe(10_000 - 800);
  });

  it("fires blackmarket.purchase event", () => {
    const world = makeMinimalWorld();
    applyCommand(world, { kind: "blackMarketBuy", itemKind: "oreCache" });
    expect(world.eventQueue.some((e) => e.kind === "blackmarket.purchase")).toBe(true);
  });

  it("fails if insufficient credits", () => {
    const world = makeMinimalWorld();
    const human = world.players.get(playerId("player-human"))!;
    human.credits = 100;
    applyCommand(world, { kind: "blackMarketBuy", itemKind: "oreCache" });
    expect(human.oreInventory["iron"]).toBeUndefined();
    expect(world.eventQueue).toHaveLength(0);
  });
});

describe("blackMarketBuy — contraband", () => {
  it("increases suspicion by 20 and boosts federationStanding by 5", () => {
    const world = makeMinimalWorld();
    const human = world.players.get(playerId("player-human"))!;
    human.suspicion = 0;
    human.federationStanding = 40;
    applyCommand(world, { kind: "blackMarketBuy", itemKind: "contraband" });
    expect(human.suspicion).toBe(20);
    expect(human.federationStanding).toBe(45);
    expect(human.credits).toBe(10_000 - 500);
  });
});

describe("blackMarketBuy — Mauna dead/absent", () => {
  it("does nothing if Mauna is not alive", () => {
    const world = makeMinimalWorld();
    const mauna = world.players.get(playerId("player-mauna"))!;
    mauna.alive = false;
    const human = world.players.get(playerId("player-human"))!;
    const creditsBefore = human.credits;
    applyCommand(world, { kind: "blackMarketBuy", itemKind: "oreCache" });
    expect(human.credits).toBe(creditsBefore);
    expect(world.eventQueue).toHaveLength(0);
  });

  it("does nothing if Mauna player is absent from world", () => {
    const world = makeMinimalWorld();
    world.players.delete(playerId("player-mauna"));
    const human = world.players.get(playerId("player-human"))!;
    const creditsBefore = human.credits;
    applyCommand(world, { kind: "blackMarketBuy", itemKind: "oreCache" });
    expect(human.credits).toBe(creditsBefore);
    expect(world.eventQueue).toHaveLength(0);
  });
});

describe("bribeOfficial — success path", () => {
  it("deducts credits and increases reputation on success", () => {
    const world = makeMinimalWorld();
    // Force prng to return a value below mauna's bribeReceptiveness
    // mauna personality has bribeReceptiveness > 0, so seed to a low value
    let callCount = 0;
    world.prng = {
      ...world.prng,
      next() {
        callCount++;
        return 0.01; // always below receptiveness
      },
      state: () => 0,
      restore: () => {},
    };
    const human = world.players.get(playerId("player-human"))!;
    human.credits = 5_000;
    applyCommand(world, {
      kind: "bribeOfficial",
      targetPlayerId: playerId("player-mauna"),
      credits: 1000,
    });
    expect(human.credits).toBe(4_000);
    expect(human.reputation.get(playerId("player-mauna"))).toBeGreaterThan(0);
    expect(world.eventQueue.some((e) => e.kind === "bribe.accepted")).toBe(true);
  });
});

describe("bribeOfficial — fail path", () => {
  it("deducts credits, increases suspicion by 5, fires bribe.rejected on failure", () => {
    const world = makeMinimalWorld();
    world.prng = {
      ...world.prng,
      next() {
        return 0.99; // always above receptiveness
      },
      state: () => 0,
      restore: () => {},
    };
    const human = world.players.get(playerId("player-human"))!;
    human.credits = 5_000;
    human.suspicion = 0;
    applyCommand(world, {
      kind: "bribeOfficial",
      targetPlayerId: playerId("player-mauna"),
      credits: 1000,
    });
    expect(human.credits).toBe(4_000);
    expect(human.suspicion).toBe(5);
    expect(world.eventQueue.some((e) => e.kind === "bribe.rejected")).toBe(true);
  });
});

describe("asteroid independence arc", () => {
  it("triggers independence when happiness < 0.3 and roll < 0.05", () => {
    const world = makeMinimalWorld();
    const astId = asteroidId("asteroid-human");
    const asteroid = world.asteroids.get(astId)!;
    asteroid.happiness = 0.1;

    world.prng = {
      ...world.prng,
      next() {
        return 0.01; // below 0.05 threshold
      },
      state: () => 0,
      restore: () => {},
    };

    world.tick = 50;
    const human = world.players.get(playerId("player-human"))!;
    const standingBefore = human.federationStanding;
    tickBlackMarket(world);

    expect(asteroid.ownerId).toBeNull();
    expect(world.eventQueue.some((e) => e.kind === "asteroid.independence")).toBe(true);
    expect(human.federationStanding).toBe(standingBefore - 5);
  });

  it("does not trigger independence when happiness >= 0.3", () => {
    const world = makeMinimalWorld();
    const astId = asteroidId("asteroid-human");
    const asteroid = world.asteroids.get(astId)!;
    asteroid.happiness = 0.5;

    world.prng = {
      ...world.prng,
      next() {
        return 0.01;
      },
      state: () => 0,
      restore: () => {},
    };

    world.tick = 50;
    const humanId = playerId("player-human");
    tickBlackMarket(world);

    expect(asteroid.ownerId).toBe(humanId);
    expect(world.eventQueue.some((e) => e.kind === "asteroid.independence")).toBe(false);
  });

  it("does not trigger independence when roll >= 0.05", () => {
    const world = makeMinimalWorld();
    const astId = asteroidId("asteroid-human");
    const asteroid = world.asteroids.get(astId)!;
    asteroid.happiness = 0.1;

    world.prng = {
      ...world.prng,
      next() {
        return 0.9; // above 0.05
      },
      state: () => 0,
      restore: () => {},
    };

    world.tick = 50;
    const humanId = playerId("player-human");
    tickBlackMarket(world);

    expect(asteroid.ownerId).toBe(humanId);
    expect(world.eventQueue.some((e) => e.kind === "asteroid.independence")).toBe(false);
  });
});
