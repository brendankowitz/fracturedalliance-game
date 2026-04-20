import { asteroidId, buildingId, playerId } from "@fa/domain";
import type { AsteroidId, BuildingId, PlayerId, World } from "@fa/domain";
import { describe, expect, it } from "vitest";
import { makePrng } from "../prng.ts";
import { tickBlackMarket } from "../systems/blackMarketSystem.ts";
import { tickTrader } from "../systems/traderSystem.ts";

function makeWorld(): World {
  const humanId: PlayerId = playerId("player-human");
  const astId: AsteroidId = asteroidId("asteroid-1");
  const cpuBid: BuildingId = buildingId("cpu-1");
  return {
    tick: 0,
    seed: 1,
    difficulty: "director",
    asteroids: new Map([
      [
        astId,
        {
          id: astId,
          name: "Base",
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
          asteroidId: astId,
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
          credits: 10000,
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
    expeditionFleet: { active: false, ticksRemaining: 0, fleetsLaunched: 0 },
  };
}

describe("Black Market Arc", () => {
  it("sets licenseRevoked when suspicion >= 100", () => {
    const world = makeWorld();
    const human = [...world.players.values()].find((p) => p.isHuman)!;
    human.suspicion = 100;
    tickBlackMarket(world);
    expect(human.licenseRevoked).toBe(true);
  });

  it("pushes federation.license_revoked event on revocation", () => {
    const world = makeWorld();
    const human = [...world.players.values()].find((p) => p.isHuman)!;
    human.suspicion = 100;
    tickBlackMarket(world);
    expect(world.eventQueue.some((e) => e.kind === "federation.license_revoked")).toBe(true);
  });

  it("initializes expeditionFleet with 1800 ticks when license revoked", () => {
    const world = makeWorld();
    const human = [...world.players.values()].find((p) => p.isHuman)!;
    human.suspicion = 100;
    tickBlackMarket(world);
    expect(world.expeditionFleet.active).toBe(true);
    expect(world.expeditionFleet.ticksRemaining).toBe(1800);
  });

  it("pushes victory.independence event after 1800 expedition ticks", () => {
    const world = makeWorld();
    world.expeditionFleet = { active: true, ticksRemaining: 1, fleetsLaunched: 0 };
    const human = [...world.players.values()].find((p) => p.isHuman)!;
    human.licenseRevoked = true;
    tickBlackMarket(world);
    expect(world.eventQueue.some((e) => e.kind === "victory.independence")).toBe(true);
    expect(world.expeditionFleet.active).toBe(false);
  });

  it("does not revoke license if suspicion < 100", () => {
    const world = makeWorld();
    const human = [...world.players.values()].find((p) => p.isHuman)!;
    human.suspicion = 99;
    tickBlackMarket(world);
    expect(human.licenseRevoked).toBe(false);
  });

  it("blocks trader arrivals when licenseRevoked is true", () => {
    const world = makeWorld();
    const human = [...world.players.values()].find((p) => p.isHuman)!;
    human.licenseRevoked = true;
    // Run ticks at multiples of TICKS_PER_MONTH (3000) to trigger trader arrival checks
    // Set tick to 3000 and run tickTrader to trigger the condition
    world.tick = 3_000;
    world.eventQueue = [];
    tickTrader(world);
    // Check no trader arrived events were pushed
    expect(world.eventQueue.some((e) => e.kind === "trader.arrived")).toBe(false);
  });
});
