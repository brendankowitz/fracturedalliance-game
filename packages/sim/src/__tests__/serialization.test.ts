import { describe, expect, it } from "vitest";
import { deserializeWorld, serializeWorld } from "../serialization.ts";
import { createWorld } from "../world.ts";

describe("world serialization", () => {
  it("round-trips tick and seed", () => {
    const world = createWorld({ seed: 42, humanPlayerRaceId: "helionCorp" });
    world.tick = 50;
    const snapshot = serializeWorld(world);
    const restored = deserializeWorld(snapshot, world.prng.state());
    expect(restored.tick).toBe(50);
    expect(restored.seed).toBe(42);
  });

  it("round-trips player credits and ore inventory", () => {
    const world = createWorld({ seed: 99, humanPlayerRaceId: "helionCorp" });
    const human = [...world.players.values()].find((p) => p.isHuman)!;
    human.credits = 12345;
    human.oreInventory["selenium"] = 99;
    const snapshot = serializeWorld(world);
    const restored = deserializeWorld(snapshot, world.prng.state());
    const restoredHuman = [...restored.players.values()].find((p) => p.isHuman);
    expect(restoredHuman?.credits).toBe(12345);
    expect(restoredHuman?.oreInventory["selenium"]).toBe(99);
  });

  it("round-trips asteroid count and deposits", () => {
    const world = createWorld({ seed: 7, humanPlayerRaceId: "helionCorp" });
    const snapshot = serializeWorld(world);
    const restored = deserializeWorld(snapshot, world.prng.state());
    expect(restored.asteroids.size).toBe(world.asteroids.size);
  });

  it("round-trips asteroid deposits values", () => {
    const world = createWorld({ seed: 7, humanPlayerRaceId: "helionCorp" });
    const firstAsteroid = [...world.asteroids.values()][0]!;
    const snapshot = serializeWorld(world);
    const restored = deserializeWorld(snapshot, world.prng.state());
    const restoredAsteroid = restored.asteroids.get(firstAsteroid.id);
    expect(restoredAsteroid?.deposits).toEqual(firstAsteroid.deposits);
  });

  it("round-trips player reputation Map", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const human = [...world.players.values()].find((p) => p.isHuman)!;
    const ai = [...world.players.values()].find((p) => !p.isHuman)!;
    human.reputation.set(ai.id, -20);
    const snapshot = serializeWorld(world);
    const restored = deserializeWorld(snapshot, world.prng.state());
    const restoredHuman = [...restored.players.values()].find((p) => p.isHuman);
    expect(restoredHuman?.reputation.get(ai.id)).toBe(-20);
  });

  it("round-trips blueprintsOwned Set", () => {
    const world = createWorld({ seed: 2, humanPlayerRaceId: "helionCorp" });
    const human = [...world.players.values()].find((p) => p.isHuman)!;
    human.blueprintsOwned.add("bp-advancedMining" as import("@fa/domain").BlueprintId);
    const snapshot = serializeWorld(world);
    const restored = deserializeWorld(snapshot, world.prng.state());
    const restoredHuman = [...restored.players.values()].find((p) => p.isHuman);
    expect(
      restoredHuman?.blueprintsOwned.has("bp-advancedMining" as import("@fa/domain").BlueprintId),
    ).toBe(true);
  });

  it("round-trips PRNG state", () => {
    const world = createWorld({ seed: 123, humanPlayerRaceId: "helionCorp" });
    // Advance PRNG several times
    for (let i = 0; i < 10; i++) world.prng.next();
    const savedState = world.prng.state();
    const savedNext = world.prng.next(); // sample the next value
    world.prng.restore(savedState); // reset to before the sample

    const snapshot = serializeWorld(world);
    const restored = deserializeWorld(snapshot, savedState);
    expect(restored.prng.next()).toBe(savedNext);
  });

  it("eventQueue is always empty after restore", () => {
    const world = createWorld({ seed: 5, humanPlayerRaceId: "helionCorp" });
    world.eventQueue.push({
      kind: "trader.arrived",
      priority: "amber",
      asteroidId: [...world.asteroids.keys()][0]!,
    });
    const snapshot = serializeWorld(world);
    const restored = deserializeWorld(snapshot, world.prng.state());
    expect(restored.eventQueue).toHaveLength(0);
  });

  it("round-trips schemaVersion and seq counters", () => {
    const world = createWorld({ seed: 11, humanPlayerRaceId: "helionCorp" });
    world.nextBuildingSeq = 5;
    world.nextShipSeq = 3;
    world.nextTreatySeq = 1;
    const snapshot = serializeWorld(world);
    const restored = deserializeWorld(snapshot, world.prng.state());
    expect(restored.schemaVersion).toBe(world.schemaVersion);
    expect(restored.nextBuildingSeq).toBe(5);
    expect(restored.nextShipSeq).toBe(3);
    expect(restored.nextTreatySeq).toBe(1);
  });

  it("round-trips gameEndState null", () => {
    const world = createWorld({ seed: 13, humanPlayerRaceId: "helionCorp" });
    const snapshot = serializeWorld(world);
    const restored = deserializeWorld(snapshot, world.prng.state());
    expect(restored.gameEndState).toBeNull();
  });

  it("round-trips gameEndState non-null", () => {
    const world = createWorld({ seed: 14, humanPlayerRaceId: "helionCorp" });
    world.gameEndState = "victory:military";
    const snapshot = serializeWorld(world);
    const restored = deserializeWorld(snapshot, world.prng.state());
    expect(restored.gameEndState).toBe("victory:military");
  });

  it("round-trips marketPrices", () => {
    const world = createWorld({ seed: 15, humanPlayerRaceId: "helionCorp" });
    world.marketPrices.selenium = 999;
    const snapshot = serializeWorld(world);
    const restored = deserializeWorld(snapshot, world.prng.state());
    expect(restored.marketPrices.selenium).toBe(999);
  });

  it("round-trips buildings map", () => {
    const world = createWorld({ seed: 20, humanPlayerRaceId: "helionCorp" });
    const snapshot = serializeWorld(world);
    const restored = deserializeWorld(snapshot, world.prng.state());
    expect(restored.buildings.size).toBe(world.buildings.size);
    for (const [id, building] of world.buildings) {
      const restoredBuilding = restored.buildings.get(id);
      expect(restoredBuilding?.defKind).toBe(building.defKind);
      expect(restoredBuilding?.hp).toBe(building.hp);
      expect(restoredBuilding?.maxHp).toBe(building.maxHp);
      expect(restoredBuilding?.active).toBe(building.active);
    }
  });

  it("round-trips player eventLog", () => {
    const world = createWorld({ seed: 30, humanPlayerRaceId: "helionCorp" });
    const ai = [...world.players.values()].find((p) => !p.isHuman)!;
    ai.eventLog.push({ tick: 10, kind: "expand", data: { target: "asteroid-n0" } });
    const snapshot = serializeWorld(world);
    const restored = deserializeWorld(snapshot, world.prng.state());
    const restoredAi = [...restored.players.values()].find((p) => !p.isHuman);
    expect(restoredAi?.eventLog).toHaveLength(1);
    expect(restoredAi?.eventLog[0]?.kind).toBe("expand");
    expect(restoredAi?.eventLog[0]?.tick).toBe(10);
  });
});
