/**
 * Isometric drawing primitives.
 *
 * Buildings are drawn as shaded solids rather than textured sprites: the silhouette is
 * the readable part, and geometry stays crisp at any zoom with no atlas to keep in sync.
 * The three-tone scheme (lit top, near-side, far-side) and the palette come from the
 * project's design handoff bundle, so the surface matches the rest of the console.
 *
 * All primitives take a ground anchor — the bottom-centre of the volume — and grow
 * upward, so a caller stacks parts by subtracting heights.
 */

import type { Graphics } from "pixi.js";
import { TILE_W } from "./isoProjection.ts";

export const SURFACE_PALETTE = {
  top: 0x3f4858,
  topLit: 0x4f5867,
  sideNear: 0x2a3140,
  sideFar: 0x1c212c,
  edge: 0x0c0f17,
  pad: 0x161b25,
  rock: 0x4a4136,
  rockLit: 0x6b5f4e,
  rockDark: 0x2b251d,
  glow: 0xe8a04a,
  glowDim: 0xa87530,
  water: 0x5c9bb8,
  plant: 0x79c188,
  danger: 0xcc3322,
} as const;

/**
 * Half-width of one cell footprint, in screen pixels. A base drawn to this extent
 * exactly inscribes its diamond.
 */
export const CELL_HALF = TILE_W / 2;

/**
 * Forms are authored against a nominal half-extent and scaled by {@link FORM_UNIT} at
 * paint time, so every footprint is a fraction of the cell rather than a loose pixel
 * count. Keeping a form's horizontal extents within FORM_NOMINAL_HALF is what makes it
 * provably fit; height is deliberately unbounded, since height is what carries
 * legibility at this scale.
 */
export const FORM_NOMINAL_HALF = 15;
export const FORM_UNIT = CELL_HALF / FORM_NOMINAL_HALF;

export interface Anchor {
  readonly x: number;
  readonly y: number;
}

function shade(color: number, factor: number): number {
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.round(((color >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.round((color & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}

/** Flat ground plate under a structure. */
export function drawPad(g: Graphics, at: Anchor, w: number, d: number, color: number): void {
  g.poly([
    at.x,
    at.y,
    at.x + w,
    at.y - w / 2,
    at.x + w - d,
    at.y - w / 2 - d / 2,
    at.x - d,
    at.y - d / 2,
  ])
    .fill({ color })
    .stroke({ color: SURFACE_PALETTE.edge, width: 1, alpha: 0.7 });
}

/** Iso cuboid. `w`/`d` are half-extents along the two ground axes; `h` is upward. */
export function drawBox(g: Graphics, at: Anchor, w: number, d: number, h: number, tint = 1): void {
  const fb = [at.x, at.y];
  const rb = [at.x + w, at.y - w / 2];
  const lb = [at.x - d, at.y - d / 2];
  const ft = [at.x, at.y - h];
  const rt = [at.x + w, at.y - w / 2 - h];
  const lt = [at.x - d, at.y - d / 2 - h];
  const bt = [at.x + w - d, at.y - w / 2 - d / 2 - h];

  g.poly([...fb, ...lb, ...lt, ...ft]).fill({ color: shade(SURFACE_PALETTE.sideNear, tint) });
  g.poly([...fb, ...rb, ...rt, ...ft]).fill({ color: shade(SURFACE_PALETTE.sideFar, tint) });
  g.poly([...ft, ...rt, ...bt, ...lt])
    .fill({ color: shade(SURFACE_PALETTE.top, tint) })
    .stroke({ color: SURFACE_PALETTE.edge, width: 1, alpha: 0.55 });
}

/** Upright cylinder — tanks, silos, reactor vessels. */
export function drawTank(g: Graphics, at: Anchor, r: number, h: number, tint = 1): void {
  const ry = r / 2;
  g.ellipse(at.x, at.y, r, ry).fill({ color: shade(SURFACE_PALETTE.sideFar, tint) });
  g.rect(at.x - r, at.y - h, r * 2, h).fill({ color: shade(SURFACE_PALETTE.sideNear, tint) });
  g.ellipse(at.x, at.y - h, r, ry)
    .fill({ color: shade(SURFACE_PALETTE.topLit, tint) })
    .stroke({ color: SURFACE_PALETTE.edge, width: 1, alpha: 0.6 });
}

/** Pressurised dome — habitats, greenhouses, shield emitters. */
export function drawDome(g: Graphics, at: Anchor, r: number, h: number, color: number): void {
  g.ellipse(at.x, at.y, r, r / 2).fill({ color: SURFACE_PALETTE.sideFar });
  g.moveTo(at.x - r, at.y)
    .bezierCurveTo(at.x - r, at.y - h * 1.35, at.x + r, at.y - h * 1.35, at.x + r, at.y)
    .fill({ color })
    .stroke({ color: SURFACE_PALETTE.edge, width: 1, alpha: 0.6 });
}

/** Tapered mast — antennae, drill towers, engine nozzles. */
export function drawTower(g: Graphics, at: Anchor, w: number, h: number, taper = 0.35): void {
  const tw = w * taper;
  g.poly([at.x - w, at.y, at.x + w, at.y, at.x + tw, at.y - h, at.x - tw, at.y - h])
    .fill({ color: SURFACE_PALETTE.sideNear })
    .stroke({ color: SURFACE_PALETTE.edge, width: 1, alpha: 0.6 });
  g.poly([at.x, at.y, at.x + w, at.y, at.x + tw, at.y - h, at.x, at.y - h]).fill({
    color: SURFACE_PALETTE.sideFar,
  });
}

/** Lattice gantry — shipyards, docks, mining rigs. */
export function drawGantry(g: Graphics, at: Anchor, w: number, h: number): void {
  const stroke = { color: SURFACE_PALETTE.topLit, width: 1.4, alpha: 0.9 } as const;
  g.moveTo(at.x - w, at.y)
    .lineTo(at.x - w * 0.6, at.y - h)
    .stroke(stroke);
  g.moveTo(at.x + w, at.y)
    .lineTo(at.x + w * 0.6, at.y - h)
    .stroke(stroke);
  for (let i = 1; i <= 3; i++) {
    const t = i / 4;
    const y = at.y - h * t;
    const half = w * (1 - t * 0.4);
    g.moveTo(at.x - half, y)
      .lineTo(at.x + half, y)
      .stroke({ ...stroke, alpha: 0.55 });
  }
  g.moveTo(at.x - w * 0.6, at.y - h)
    .lineTo(at.x + w * 0.6, at.y - h)
    .stroke(stroke);
}

/** Parabolic dish — sensors, comms, lobby uplinks. */
export function drawDish(g: Graphics, at: Anchor, r: number, h: number): void {
  g.rect(at.x - 1.5, at.y - h, 3, h).fill({ color: SURFACE_PALETTE.sideFar });
  g.ellipse(at.x, at.y - h, r, r * 0.55)
    .fill({ color: SURFACE_PALETTE.topLit })
    .stroke({ color: SURFACE_PALETTE.edge, width: 1, alpha: 0.7 });
  g.ellipse(at.x, at.y - h, r * 0.55, r * 0.3).fill({ color: SURFACE_PALETTE.sideFar });
}

/** Lit windows / status lamps. Drawn last so they sit over the faces. */
export function drawLights(
  g: Graphics,
  at: Anchor,
  count: number,
  spread: number,
  rise: number,
  color = SURFACE_PALETTE.glow,
): void {
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    g.rect(at.x - spread / 2 + t * spread - 1, at.y - rise, 2, 1.6).fill({ color, alpha: 0.95 });
  }
}
