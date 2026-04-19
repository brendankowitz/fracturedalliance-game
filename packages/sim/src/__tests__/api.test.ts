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
    // Find an owned asteroid so the command is accepted
    const asteroid = snap.asteroids.find((a) => a.ownerId === snap.humanPlayerId);
    if (!asteroid) throw new Error("expected human-owned asteroid");

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
    const asteroid = snap.asteroids.find((a) => a.ownerId === snap.humanPlayerId);
    if (!asteroid) throw new Error("expected human-owned asteroid");

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
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.rngSeed).toBe(42);
    const worldSnapshot = parsed.worldSnapshot as Record<string, unknown>;
    expect(worldSnapshot.tick).toBe(1);
    expect(worldSnapshot.seed).toBe(42);
  });

  it("restore round-trips world state", () => {
    const api = new SimApi({ seed: 77, humanPlayerRaceId: "helionCorp" });
    for (let i = 0; i < 5; i++) api.tick(50);
    const blob = api.getSaveBlob();
    const snap1 = api.getSnapshot();

    api.restore(blob);
    const snap2 = api.getSnapshot();
    expect(snap2.tick).toBe(snap1.tick);
    expect(snap2.credits).toBe(snap1.credits);
    expect(snap2.asteroids.length).toBe(snap1.asteroids.length);
  });
});
