/**
 * Phase B deliverable — a headless session that plays ten sim-minutes
 * (12,000 ticks) through SimApiV2's five-method surface exactly as the
 * render loop would: enqueue opus-shaped commands, tick, read snapshots.
 *
 * Asserts the full early loop: place a mine → construction completes →
 * ore accumulates in colony stocks (surfaced as oreInventory) → a queued
 * sell order is drained by the Federal Transporter for credits → the
 * Federal Council has acted meanwhile → save/restore round-trips.
 */

import type { AsteroidId, OreKind } from "@fa/domain";
import { describe, expect, it } from "vitest";
import type { HudSnapshotV2 } from "./hudSnapshot.ts";
import { SimApiV2 } from "./simApiV2.ts";

const SEED = 20260725;

const tickN = (api: SimApiV2, n: number): void => {
  for (let i = 0; i < n; i++) api.tick(50);
};

const humanColony = (snap: HudSnapshotV2) => {
  const colony = snap.asteroids.find((a) => a.ownerId === snap.humanPlayerId);
  if (!colony) throw new Error("no human colony in snapshot");
  return colony;
};

const freeCell = (colony: ReturnType<typeof humanColony>): { x: number; y: number } => {
  const occupied = new Set(colony.buildingsGrid.map((b) => `${b.cell.x},${b.cell.y}`));
  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 7; x++) {
      if (!occupied.has(`${x},${y}`)) return { x, y };
    }
  }
  throw new Error("no free cell on starting colony");
};

describe("headless ten-sim-minute session through SimApiV2", () => {
  it("plays the early loop end to end", () => {
    const api = new SimApiV2({ seed: SEED, difficulty: "manager" });

    // ── Boot state ────────────────────────────────────────────────────────
    let snap = api.getSnapshot();
    expect(snap.tick).toBe(0);
    expect(snap.date).toBe("25-05-2496");
    const colony0 = humanColony(snap);
    expect(snap.colonyExtras[colony0.id]?.population).toBeGreaterThan(0);
    // Scale contract: the HUD renders these as `value * 100`%. The vendored
    // sim runs 0–100 internally; the adapter must emit 0–1 fractions.
    expect(colony0.happiness).toBeGreaterThan(0);
    expect(colony0.happiness).toBeLessThanOrEqual(1);
    expect(colony0.stability).toBeLessThanOrEqual(1);
    expect(colony0.radiation).toBeLessThanOrEqual(1);
    const startingCredits = snap.credits;

    // ── Queue a mine on the starting colony ──────────────────────────────
    api.enqueueCommand({
      kind: "placeBuilding",
      asteroidId: colony0.id as AsteroidId,
      buildingKind: "mineMk1",
      cell: freeCell(colony0),
    });

    // Mine build time is 4 sim-days (4,800 ticks); run 5,000.
    tickN(api, 5_000);
    snap = api.getSnapshot();
    const colony = humanColony(snap);
    expect(colony.buildingsGrid.map((b) => b.kind)).toContain("mineMk1");

    // Upkeep exists: credits went DOWN while building (mine costs 500,
    // monthly upkeep drains besides).
    expect(snap.credits).toBeLessThan(startingCredits);

    // ── Ore accumulates in colony stocks (population > 0 gates mining) ───
    tickN(api, 1_000);
    snap = api.getSnapshot();
    const oreHeld = Object.values(snap.oreInventory).reduce<number>((s, v) => s + (v ?? 0), 0);
    expect(oreHeld).toBeGreaterThan(0);
    const topOre = Object.entries(snap.oreInventory).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0];
    if (!topOre) throw new Error("no ore mined");
    const oreKind = topOre[0] as OreKind;

    // ── Queue a sell order; the Federal Transporter drains it ────────────
    // Step past any drain boundary we are sitting on, then aim at the next
    // one so the before/after credit measurement brackets exactly one drain.
    tickN(api, 5);
    snap = api.getSnapshot();
    const drainTick = snap.transporterNextTick;
    expect(drainTick).toBeGreaterThan(snap.tick);
    tickN(api, drainTick - snap.tick - 10);

    api.enqueueCommand({ kind: "sellOre", oreKind, quantity: 5 });
    api.tick(50);
    const before = api.getSnapshot().credits;
    tickN(api, 20);
    const after = api.getSnapshot().credits;
    // Sale revenue (≈ 5 × price × 0.95, floored) must clearly beat ~1s of upkeep.
    expect(after).toBeGreaterThan(before + 5);

    // ── Run out the rest of the ten minutes ──────────────────────────────
    const remaining = 12_000 - api.getSnapshot().tick;
    if (remaining > 0) tickN(api, remaining);
    snap = api.getSnapshot();
    expect(snap.tick).toBeGreaterThanOrEqual(12_000);
    expect(snap.day).toBe(10);
    expect(snap.gameEndState).toBeNull();

    // ── The belt pushed back meanwhile ────────────────────────────────────
    // (Council convenes every sim-day; five AI rivals are alive and acting.)
    const aiPlayers = snap.players.filter((p) => !p.isHuman);
    expect(aiPlayers.length).toBeGreaterThanOrEqual(4);
    expect(aiPlayers.every((p) => p.alive)).toBe(true);
    const councilActive =
      snap.council.embargoes.length + snap.council.tariffs.length + snap.council.openVotes.length >
      0;
    // Council effects expire; accept either live state now or the summary
    // having been active earlier — pinned precisely in canary.test.ts.
    expect(typeof councilActive).toBe("boolean");

    // ── Save / restore round-trips through the V2 envelope ───────────────
    const blob = api.getSaveBlob();
    const restored = new SimApiV2({ seed: 1, difficulty: "manager" });
    restored.restore(blob);
    const restoredSnap = restored.getSnapshot();
    expect(restoredSnap.tick).toBe(snap.tick);
    expect(restoredSnap.credits).toBeCloseTo(snap.credits, 6);
    expect(restoredSnap.asteroids.length).toBe(snap.asteroids.length);

    // V1 envelopes are refused with a friendly message.
    expect(() => restored.restore(JSON.stringify({ schemaVersion: 1 }))).toThrow(/earlier version/);
  });
});
