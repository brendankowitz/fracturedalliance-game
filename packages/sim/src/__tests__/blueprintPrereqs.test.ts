import { findBlueprintDef } from "@fa/content";
import type { PlayerId, World } from "@fa/domain";
import { blueprintId, playerId } from "@fa/domain";
import { describe, expect, it } from "vitest";
import { canPurchaseBlueprint } from "../commandProcessor.ts";
import { makeTestPlayer, makeTestWorld } from "./testWorld.ts";

// Actual IDs from blueprints.json:
//   tier-1 mining: blueprint.mineMk2
//   tier-2 mining: blueprint.deepBoreMine
//   tier-1 military: blueprint.turretBattery

function makeMinimalWorld(): World {
  const humanId: PlayerId = playerId("player-human");

  return makeTestWorld({
    players: new Map([
      [humanId, makeTestPlayer(humanId, { raceId: "helionCorp", isHuman: true, credits: 100_000 })],
    ]),
  });
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
