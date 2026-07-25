import type { AsteroidId, BuildingId, PlayerId, World } from "@fa/domain";
import { asteroidId, buildingId, playerId } from "@fa/domain";
import { describe, expect, it } from "vitest";
import { EXPEDITION_DURATION_TICKS, tickBlackMarket } from "../systems/blackMarketSystem.ts";
import { tickTrader } from "../systems/traderSystem.ts";
import { makeTestAsteroid, makeTestBuilding, makeTestPlayer, makeTestWorld } from "./testWorld.ts";

function makeWorld(): World {
  const humanId: PlayerId = playerId("player-human");
  const astId: AsteroidId = asteroidId("asteroid-1");
  const cpuBid: BuildingId = buildingId("cpu-1");
  return makeTestWorld({
    difficulty: "director",
    asteroids: new Map([
      [
        astId,
        makeTestAsteroid(astId, {
          name: "Base",
          ownerId: humanId,
          buildings: [cpuBid],
          happiness: 0.8,
        }),
      ],
    ]),
    buildings: new Map([[cpuBid, makeTestBuilding(cpuBid, astId)]]),
    players: new Map([
      [humanId, makeTestPlayer(humanId, { raceId: "helionCorp", isHuman: true, credits: 10000 })],
    ]),
  });
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
    expect(world.expeditionFleet.ticksRemaining).toBe(EXPEDITION_DURATION_TICKS);
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
