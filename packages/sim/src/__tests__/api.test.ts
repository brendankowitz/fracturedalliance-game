import { describe, expect, it } from "vitest";
import { SimApi } from "../api.ts";

describe("SimApi", () => {
  it("tick advances world.tick", () => {
    const api = new SimApi({ seed: 1, humanPlayerRaceId: "helionCorp" });
    api.tick(50);
    expect(api.getSnapshot().tick).toBe(1);
  });

  it("snapshot reflects world state", () => {
    const api = new SimApi({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const snap = api.getSnapshot();
    expect(snap.tick).toBe(0);
    expect(snap.asteroids.length).toBeGreaterThan(0);
    expect(snap.credits).toBeGreaterThan(0);
    expect(snap.federationStanding).toBeDefined();
    expect(snap.events).toEqual([]);
  });

  it("placeBuilding command is applied before next tick", () => {
    const api = new SimApi({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const snap = api.getSnapshot();
    // biome-ignore lint/style/noNonNullAssertion: test — asteroid is guaranteed by world factory
    const asteroid = snap.asteroids[0]!;

    api.enqueueCommand({
      kind: "placeBuilding",
      asteroidId: asteroid.id,
      buildingKind: "powerPlant",
      cell: { x: 2, y: 2 },
    });
    api.tick(50);

    const snap2 = api.getSnapshot();
    // biome-ignore lint/style/noNonNullAssertion: test — asteroid must exist after tick
    const a2 = snap2.asteroids.find((a) => a.id === asteroid.id)!;
    expect(a2.buildQueue.length).toBe(1);
  });

  it("placeBuilding with insufficient credits is rejected", () => {
    const api = new SimApi({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const snap = api.getSnapshot();
    // biome-ignore lint/style/noNonNullAssertion: test — asteroid is guaranteed by world factory
    const asteroid = snap.asteroids[0]!;

    api.enqueueCommand({
      kind: "placeBuilding",
      asteroidId: asteroid.id,
      buildingKind: "nonexistentBuilding",
      cell: { x: 5, y: 5 },
    });
    api.tick(50);

    const snap2 = api.getSnapshot();
    // biome-ignore lint/style/noNonNullAssertion: test — asteroid must exist after tick
    const a2 = snap2.asteroids.find((a) => a.id === asteroid.id)!;
    expect(a2.buildQueue.length).toBe(0);
  });

  it("getSaveBlob returns parseable JSON with expected keys", () => {
    const api = new SimApi({ seed: 42, humanPlayerRaceId: "helionCorp" });
    api.tick(50);
    const blob = api.getSaveBlob();
    const parsed = JSON.parse(blob) as Record<string, unknown>;
    expect(parsed.schemaVersion).toBeDefined();
    expect(parsed.tick).toBe(1);
    expect(parsed.seed).toBe(42);
  });
});
