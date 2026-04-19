import { blueprintId } from "@fa/domain";
import { describe, expect, it } from "vitest";
import { applyCommand } from "../commandProcessor.ts";
import { createWorld } from "../world.ts";

function makeWorld() {
  return createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
}

function getHuman(world: ReturnType<typeof makeWorld>) {
  return [...world.players.values()].find((p) => p.isHuman)!;
}

describe("buyBlueprint command", () => {
  it("grants blueprint to human player", () => {
    const world = makeWorld();
    const human = getHuman(world);
    human.credits = 10_000;
    applyCommand(world, { kind: "buyBlueprint", blueprintId: "blueprint.mineMk2" });
    expect(human.blueprintsOwned.has(blueprintId("blueprint.mineMk2"))).toBe(true);
  });

  it("deducts credits", () => {
    const world = makeWorld();
    const human = getHuman(world);
    human.credits = 10_000;
    applyCommand(world, { kind: "buyBlueprint", blueprintId: "blueprint.mineMk2" });
    expect(human.credits).toBe(6_000); // 10000 - 4000
  });

  it("rejects if insufficient credits", () => {
    const world = makeWorld();
    const human = getHuman(world);
    human.credits = 100;
    applyCommand(world, { kind: "buyBlueprint", blueprintId: "blueprint.mineMk2" });
    expect(human.blueprintsOwned.has(blueprintId("blueprint.mineMk2"))).toBe(false);
    expect(human.credits).toBe(100);
  });

  it("rejects if prerequisite not owned", () => {
    const world = makeWorld();
    const human = getHuman(world);
    human.credits = 50_000;
    applyCommand(world, { kind: "buyBlueprint", blueprintId: "blueprint.deepBoreMine" });
    expect(human.blueprintsOwned.has(blueprintId("blueprint.deepBoreMine"))).toBe(false);
  });

  it("allows purchase when prerequisite is owned", () => {
    const world = makeWorld();
    const human = getHuman(world);
    human.credits = 50_000;
    applyCommand(world, { kind: "buyBlueprint", blueprintId: "blueprint.mineMk2" });
    applyCommand(world, { kind: "buyBlueprint", blueprintId: "blueprint.deepBoreMine" });
    expect(human.blueprintsOwned.has(blueprintId("blueprint.deepBoreMine"))).toBe(true);
  });

  it("rejects duplicate purchase", () => {
    const world = makeWorld();
    const human = getHuman(world);
    human.credits = 20_000;
    applyCommand(world, { kind: "buyBlueprint", blueprintId: "blueprint.mineMk2" });
    const creditsAfterFirst = human.credits;
    applyCommand(world, { kind: "buyBlueprint", blueprintId: "blueprint.mineMk2" });
    expect(human.credits).toBe(creditsAfterFirst); // no second deduction
  });

  it("ignores unknown blueprintId", () => {
    const world = makeWorld();
    const human = getHuman(world);
    human.credits = 10_000;
    expect(() =>
      applyCommand(world, { kind: "buyBlueprint", blueprintId: "blueprint.nonexistent" }),
    ).not.toThrow();
    expect(human.credits).toBe(10_000);
  });
});
