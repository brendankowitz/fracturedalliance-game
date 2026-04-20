import type { World } from "@fa/domain";
import { blueprintId, playerId } from "@fa/domain";
import type { PlayerId } from "@fa/domain";
import { findBlueprintDef } from "@fa/content";
import { describe, expect, it } from "vitest";
import { canPurchaseBlueprint } from "../commandProcessor.ts";
import { makePrng } from "../prng.ts";

// Actual IDs from blueprints.json:
//   tier-1 mining: blueprint.mineMk2
//   tier-2 mining: blueprint.deepBoreMine
//   tier-1 military: blueprint.turretBattery

function makeMinimalWorld(): World {
  const humanId: PlayerId = playerId("player-human");

  return {
    tick: 0,
    seed: 1,
    asteroids: new Map(),
    buildings: new Map(),
    ships: new Map(),
    players: new Map([
      [
        humanId,
        {
          id: humanId,
          raceId: "helionCorp",
          isHuman: true,
          credits: 100_000,
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
    difficulty: "manager" as const,
    expeditionFleet: { active: false, ticksRemaining: 0, fleetsLaunched: 0 },
  };
}

describe("canPurchaseBlueprint — tier-2 prerequisites", () => {
  it("returns false for tier-2 blueprint without owning any tier-1 of same discipline", () => {
    const world = makeMinimalWorld();
    const human = world.players.get(playerId("player-human"))!;
    const deepBore = findBlueprintDef("blueprint.deepBoreMine")!;

    expect(canPurchaseBlueprint(world, human, deepBore)).toBe(false);
  });

  it("returns true for tier-2 blueprint after owning a tier-1 of same discipline", () => {
    const world = makeMinimalWorld();
    const human = world.players.get(playerId("player-human"))!;
    human.blueprintsOwned.add(blueprintId("blueprint.mineMk2"));

    const deepBore = findBlueprintDef("blueprint.deepBoreMine")!;
    expect(canPurchaseBlueprint(world, human, deepBore)).toBe(true);
  });

  it("returns false when owning a tier-1 of a DIFFERENT discipline (military, not mining)", () => {
    const world = makeMinimalWorld();
    const human = world.players.get(playerId("player-human"))!;
    // turretBattery is tier-1 military, not mining
    human.blueprintsOwned.add(blueprintId("blueprint.turretBattery"));

    const deepBore = findBlueprintDef("blueprint.deepBoreMine")!;
    expect(canPurchaseBlueprint(world, human, deepBore)).toBe(false);
  });

  it("returns true for a tier-1 blueprint (no prereqs required)", () => {
    const world = makeMinimalWorld();
    const human = world.players.get(playerId("player-human"))!;

    const mineMk2 = findBlueprintDef("blueprint.mineMk2")!;
    expect(canPurchaseBlueprint(world, human, mineMk2)).toBe(true);
  });
});
