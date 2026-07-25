import { describe, expect, it } from "vitest";
import { cellKey, generateTerrain } from "../game/views/surface/asteroidTerrain.ts";
import { cellToScreen, gridExtent, screenToCell } from "../game/views/surface/isoProjection.ts";

describe("isoProjection", () => {
  it("round-trips every cell of a grid", () => {
    for (let x = 0; x < 7; x++) {
      for (let y = 0; y < 7; y++) {
        expect(screenToCell(cellToScreen({ x, y }))).toEqual({ x, y });
      }
    }
  });

  it("reports an extent that spans both diagonals", () => {
    const extent = gridExtent(7, 7);
    expect(extent.width).toBeGreaterThan(extent.height);
    expect(extent.originX).toBeGreaterThan(0);
  });
});

describe("generateTerrain", () => {
  it("is deterministic for a given asteroid", () => {
    const a = generateTerrain("a3", 7, 7);
    const b = generateTerrain("a3", 7, 7);
    expect([...a.blocked].sort()).toEqual([...b.blocked].sort());
    expect(a.craters).toEqual(b.craters);
    expect(a.limb).toEqual(b.limb);
  });

  it("gives different asteroids different terrain", () => {
    const a = generateTerrain("a1", 7, 7);
    const b = generateTerrain("a2", 7, 7);
    expect(a.limb).not.toEqual(b.limb);
  });

  it("never blocks so much that the colony is unbuildable", () => {
    for (const id of ["a1", "a2", "a3", "a11", "a19"]) {
      const t = generateTerrain(id, 7, 7);
      expect(t.blocked.size).toBeLessThanOrEqual(Math.floor(49 * 0.22));
    }
  });

  it("keeps the centre cell clear, because the CPU core spawns there", () => {
    for (const id of ["a1", "a2", "a3", "a11", "a19"]) {
      expect(generateTerrain(id, 7, 7).blocked.has(cellKey({ x: 3, y: 3 }))).toBe(false);
    }
  });

  it("blocks only cells that exist on the grid", () => {
    const t = generateTerrain("a7", 5, 5);
    for (const key of t.blocked) {
      const [x, y] = key.split(",").map(Number);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(5);
      expect(y).toBeLessThan(5);
    }
  });
});
