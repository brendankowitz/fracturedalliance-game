import { describe, expect, it } from "vitest";
import { SimApi } from "../api.ts";
import type { HudSnapshot } from "../snapshot.ts";

function hashSnapshot(snap: HudSnapshot): string {
  const parts: string[] = [
    String(snap.tick),
    String(snap.credits),
    snap.asteroids.map((a) => `${a.id}:${a.ownerId}:${a.sector.x},${a.sector.y}`).join("|"),
    Object.entries(snap.marketPrices)
      .sort()
      .map(([k, v]) => `${k}=${v}`)
      .join(","),
    snap.players.map((p) => `${p.id}:${p.alive}:${p.credits}`).join("|"),
  ];
  return parts.join(";");
}

describe("deterministic replay", () => {
  it("save/restore preserves PRNG state across 300 ticks", () => {
    // Path A: advance 200 ticks, save/restore, then advance 100 more
    const apiA = new SimApi({ seed: 42, humanPlayerRaceId: "helionCorp", difficulty: "normal" });
    for (let i = 0; i < 200; i++) apiA.tick(50);
    apiA.restore(apiA.getSaveBlob());
    for (let i = 0; i < 100; i++) apiA.tick(50);
    const snapA = apiA.getSnapshot();

    // Path B: advance 300 ticks uninterrupted
    const apiB = new SimApi({ seed: 42, humanPlayerRaceId: "helionCorp", difficulty: "normal" });
    for (let i = 0; i < 300; i++) apiB.tick(50);
    const snapB = apiB.getSnapshot();

    if (hashSnapshot(snapA) !== hashSnapshot(snapB)) {
      console.error("Path A snapshot:", JSON.stringify(snapA, null, 2));
      console.error("Path B snapshot:", JSON.stringify(snapB, null, 2));
    }

    expect(hashSnapshot(snapA)).toBe(hashSnapshot(snapB));
  });

  it("command replay across save/restore boundary is deterministic", () => {
    // Path A: advance 50 ticks, issue command, advance to 100, save/restore, advance to 200
    const apiA = new SimApi({ seed: 123, humanPlayerRaceId: "helionCorp", difficulty: "normal" });
    for (let i = 0; i < 50; i++) apiA.tick(50);

    const snapAfter50A = apiA.getSnapshot();
    const ownedAsteroidA = snapAfter50A.asteroids.find(
      (a) => a.ownerId === snapAfter50A.humanPlayerId,
    );
    if (!ownedAsteroidA) throw new Error("expected human-owned asteroid at tick 50");

    apiA.enqueueCommand({
      kind: "placeBuilding",
      asteroidId: ownedAsteroidA.id,
      buildingKind: "airProcessor",
      cell: { x: 4, y: 4 },
    });
    for (let i = 0; i < 50; i++) apiA.tick(50);

    apiA.restore(apiA.getSaveBlob());
    for (let i = 0; i < 100; i++) apiA.tick(50);
    const snapA = apiA.getSnapshot();

    // Path B: same sequence from scratch — no interruption at tick 100
    const apiB = new SimApi({ seed: 123, humanPlayerRaceId: "helionCorp", difficulty: "normal" });
    for (let i = 0; i < 50; i++) apiB.tick(50);

    const snapAfter50B = apiB.getSnapshot();
    const ownedAsteroidB = snapAfter50B.asteroids.find(
      (a) => a.ownerId === snapAfter50B.humanPlayerId,
    );
    if (!ownedAsteroidB) throw new Error("expected human-owned asteroid at tick 50 (path B)");

    apiB.enqueueCommand({
      kind: "placeBuilding",
      asteroidId: ownedAsteroidB.id,
      buildingKind: "airProcessor",
      cell: { x: 4, y: 4 },
    });
    for (let i = 0; i < 150; i++) apiB.tick(50);
    const snapB = apiB.getSnapshot();

    if (hashSnapshot(snapA) !== hashSnapshot(snapB)) {
      console.error("Path A snapshot:", JSON.stringify(snapA, null, 2));
      console.error("Path B snapshot:", JSON.stringify(snapB, null, 2));
    }

    expect(hashSnapshot(snapA)).toBe(hashSnapshot(snapB));
  });
});
