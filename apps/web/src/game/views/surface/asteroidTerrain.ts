/**
 * Deterministic terrain for one asteroid.
 *
 * The sim has no concept of terrain, so this is derived purely from the asteroid's id:
 * the same rock always generates the same craters and the same unbuildable cells, with no
 * state to persist and nothing to keep in sync. Craters are generated first and the
 * blocked-cell set falls out of them, so what the player sees is what the player can't
 * build on.
 */

import { type Cell, cellToScreen, TILE_H, TILE_W } from "./isoProjection.ts";

/**
 * A crater *is* the set of cells it has eaten. The renderer draws these cells, so the
 * depression a player sees and the ground the game refuses are the same object rather
 * than two shapes that have to be kept in agreement.
 */
export interface Crater {
  readonly cells: ReadonlyArray<Cell>;
  readonly depth: number;
}

/** A speck of surface relief — boulders and scree that break up the flat fill. */
export interface Mote {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly lit: boolean;
}

export interface Terrain {
  /** Irregular rock limb, in screen space, relative to the grid origin. */
  readonly limb: ReadonlyArray<{ x: number; y: number }>;
  readonly craters: ReadonlyArray<Crater>;
  readonly motes: ReadonlyArray<Mote>;
  /** `"x,y"` keys of cells a crater has eaten. */
  readonly blocked: ReadonlySet<string>;
  /** Per-cell brightness jitter, keyed `"x,y"`, roughly 0.85–1.15. */
  readonly cellShade: ReadonlyMap<string, number>;
}

function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Mulberry32 — small, fast, and stable across engines, which matters for determinism. */
function makeRng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function cellKey(cell: Cell): string {
  return `${cell.x},${cell.y}`;
}

/** How much of the surface craters may eat. Above this the colony stops being viable. */
const MAX_BLOCKED_FRACTION = 0.22;

export function generateTerrain(asteroidId: string, width: number, height: number): Terrain {
  const rng = makeRng(hashSeed(asteroidId));

  const centre = cellToScreen({ x: (width - 1) / 2, y: (height - 1) / 2 });
  const spanX = (width + height) * (TILE_W / 2);
  const spanY = (width + height) * (TILE_H / 2);

  // Rock limb: sample angles around the plateau and push each vertex out by a jittered
  // radius, so the silhouette reads as a lumpy body rather than a tile boundary.
  // Two frequencies of jitter: a slow one gives the rock an overall lopsided mass, a
  // fast one chips the edge. One frequency alone reads as a polygon, not a rock.
  const LIMB_POINTS = 44;
  const lobePhase = rng() * Math.PI * 2;
  const lobeCount = 2 + Math.floor(rng() * 2);
  const limb: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < LIMB_POINTS; i++) {
    const angle = (i / LIMB_POINTS) * Math.PI * 2;
    const lobe = 1 + 0.18 * Math.sin(angle * lobeCount + lobePhase);
    const chip = 0.9 + rng() * 0.2;
    const radius = lobe * chip;
    limb.push({
      x: centre.x + Math.cos(angle) * (spanX / 2 + TILE_W * 0.75) * radius,
      y: centre.y + Math.sin(angle) * (spanY / 2 + TILE_H * 1.4) * radius,
    });
  }

  const craterCount = 3 + Math.floor(rng() * 3);
  const craters: Crater[] = [];
  const blocked = new Set<string>();
  const cellBudget = Math.floor(width * height * MAX_BLOCKED_FRACTION);

  const rimCells: Cell[] = [];
  for (let gy = 0; gy < height; gy++) {
    for (let gx = 0; gx < width; gx++) {
      const edgeDist = Math.min(gx, gy, width - 1 - gx, height - 1 - gy);
      // Weight toward the rim so the middle of the colony stays workable.
      const weight = edgeDist === 0 ? 3 : edgeDist === 1 ? 2 : 1;
      for (let w = 0; w < weight; w++) rimCells.push({ x: gx, y: gy });
    }
  }

  for (let i = 0; i < craterCount; i++) {
    const seat = rimCells[Math.floor(rng() * rimCells.length)];
    if (!seat) continue;
    // Radius in cells, so the crater is defined on the same lattice it blocks.
    const radius = rng() < 0.45 ? 1 : rng() < 0.8 ? 1.5 : 2;
    const members: Cell[] = [];
    for (let gy = 0; gy < height; gy++) {
      for (let gx = 0; gx < width; gx++) {
        if (blocked.size + members.length >= cellBudget) break;
        const key = cellKey({ x: gx, y: gy });
        if (blocked.has(key)) continue;
        const dx = gx - seat.x;
        const dy = gy - seat.y;
        if (Math.sqrt(dx * dx + dy * dy) <= radius) members.push({ x: gx, y: gy });
      }
    }
    if (members.length === 0) continue;
    for (const cell of members) blocked.add(cellKey(cell));
    craters.push({ cells: members, depth: 0.3 + rng() * 0.4 });
  }

  // The CPU core spawns at the grid centre, so that cell must always be buildable — and
  // the crater that claimed it has to release it too, or the drawing would disagree again.
  const centreKey = cellKey({ x: Math.floor(width / 2), y: Math.floor(height / 2) });
  blocked.delete(centreKey);
  const releasedCraters = craters.map((crater) => ({
    ...crater,
    cells: crater.cells.filter((cell) => cellKey(cell) !== centreKey),
  }));

  // Scree scattered over the whole body, biased outside the buildable plateau so it
  // does not compete with the buildings for attention.
  const motes: Mote[] = [];
  for (let i = 0; i < 150; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = Math.sqrt(rng()) * 1.05;
    motes.push({
      x: centre.x + Math.cos(angle) * (spanX / 2) * dist,
      y: centre.y + Math.sin(angle) * (spanY / 2) * dist,
      r: 0.8 + rng() * 2.4,
      lit: rng() < 0.4,
    });
  }

  const cellShade = new Map<string, number>();
  for (let gy = 0; gy < height; gy++) {
    for (let gx = 0; gx < width; gx++) {
      cellShade.set(cellKey({ x: gx, y: gy }), 0.85 + rng() * 0.3);
    }
  }

  return { limb, craters: releasedCraters, motes, blocked, cellShade };
}
