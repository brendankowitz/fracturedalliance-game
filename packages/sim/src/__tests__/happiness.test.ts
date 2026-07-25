import type { AsteroidId, BuildingId, PlayerId, World } from "@fa/domain";
import { asteroidId, buildingId, playerId } from "@fa/domain";
import { describe, expect, it } from "vitest";
import { makePrng } from "../prng.ts";
import { getHappinessMultiplier, tickHappiness } from "../systems/happinessSystem.ts";
import { tickMining } from "../systems/miningSystem.ts";
import { makeTestAsteroid, makeTestBuilding, makeTestPlayer, makeTestWorld } from "./testWorld.ts";

function makeWorld(): World {
  const humanId: PlayerId = playerId("player-human");
  const astId: AsteroidId = asteroidId("asteroid-1");
  const cpuBid: BuildingId = buildingId("cpu-1");
  const mineBid: BuildingId = buildingId("mine-1");
  return makeTestWorld({
    difficulty: "director",
    asteroids: new Map([
      [
        astId,
        makeTestAsteroid(astId, {
          name: "TestBase",
          ownerId: humanId,
          deposits: { selenium: 10000 },
          happiness: 0.8,
          buildings: [cpuBid, mineBid],
        }),
      ],
    ]),
    buildings: new Map([
      [cpuBid, makeTestBuilding(cpuBid, astId)],
      [mineBid, makeTestBuilding(mineBid, astId, { defKind: "mineMk1", cell: { x: 2, y: 2 } })],
    ]),
    players: new Map([
      [humanId, makeTestPlayer(humanId, { raceId: "helionCorp", isHuman: true, credits: 10000 })],
    ]),
    prng: makePrng(42),
    nextBuildingSeq: 10,
  });
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
      if (world.eventQueue.some((e) => e.kind === "colony.seceded")) {
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
