/**
 * Isometric asteroid surface.
 *
 * Replaces the DOM lattice of identical cells with a rendered place: a lumpy rock with
 * craters that genuinely cannot be built on, and buildings whose silhouettes say what
 * they are. Terrain is derived from the asteroid id (see ./surface/asteroidTerrain.ts),
 * so nothing here needs the sim to know about it.
 *
 * Reads only from the HUD snapshot — the simulation underneath is scheduled to be
 * replaced, and this view must not care.
 */

import { Application, Container, Graphics } from "pixi.js";
import { cellKey, generateTerrain, type Terrain } from "./surface/asteroidTerrain.ts";
import { paintBuilding } from "./surface/buildingForms.ts";
import {
  type Cell,
  cellCorners,
  cellToScreen,
  depthOf,
  gridExtent,
  screenToCell,
  TILE_H,
  TILE_W,
} from "./surface/isoProjection.ts";
import { FORM_UNIT, SURFACE_PALETTE } from "./surface/isoVolumes.ts";

export interface SurfaceBuilding {
  readonly kind: string;
  readonly cell: Cell;
}

export interface SurfaceState {
  readonly asteroidId: string;
  readonly gridWidth: number;
  readonly gridHeight: number;
  readonly buildings: ReadonlyArray<SurfaceBuilding>;
  /** Cells with construction underway — drawn as scaffolds. */
  readonly pending: ReadonlyArray<Cell>;
  readonly selected: Cell | null;
  /** Kind the player is about to place, for the ghost preview. */
  readonly ghostKind: string | null;
  readonly interactive: boolean;
}

export interface SurfaceCallbacks {
  onSelectCell: (cell: Cell | null) => void;
  onHoverCell: (cell: Cell | null) => void;
}

const BACKGROUND = 0x05070f;
/** How far the rock's flank drops below its limb, in screen pixels. */
const ROCK_THICKNESS = 26;

export class AsteroidSurfaceView {
  private readonly app: Application;
  private readonly world = new Container();
  private readonly starfield = new Graphics();
  private readonly rock = new Graphics();
  private readonly cells = new Graphics();
  private readonly structures = new Container();
  private readonly overlay = new Graphics();
  private readonly ghost = new Graphics();

  private terrain: Terrain | null = null;
  private terrainKey = "";
  private state: SurfaceState | null = null;
  private hovered: Cell | null = null;
  private disposed = false;

  private constructor(
    app: Application,
    private viewWidth: number,
    private viewHeight: number,
    private readonly callbacks: SurfaceCallbacks,
  ) {
    this.app = app;
    this.app.stage.addChild(this.starfield);
    this.world.addChild(this.rock, this.cells, this.structures, this.overlay, this.ghost);
    this.ghost.alpha = 0.45;
    this.app.stage.addChild(this.world);

    const canvas = this.app.canvas;
    canvas.addEventListener("pointermove", this.handlePointerMove);
    canvas.addEventListener("pointerleave", this.handlePointerLeave);
    canvas.addEventListener("click", this.handleClick);
  }

  static async create(
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    callbacks: SurfaceCallbacks,
  ): Promise<AsteroidSurfaceView> {
    const app = new Application();
    // Fixed extent, never `resizeTo`: the canvas sits inside an auto-sized flex column,
    // and letting Pixi drive the parent's size feeds straight back into its own.
    await app.init({
      canvas,
      width,
      height,
      backgroundColor: BACKGROUND,
      antialias: true,
      resolution: window.devicePixelRatio ?? 1,
      autoDensity: true,
    });
    return new AsteroidSurfaceView(app, width, height, callbacks);
  }

  update(state: SurfaceState): void {
    if (this.disposed) return;
    this.state = state;

    const key = `${state.asteroidId}:${state.gridWidth}x${state.gridHeight}`;
    if (key !== this.terrainKey) {
      this.terrain = generateTerrain(state.asteroidId, state.gridWidth, state.gridHeight);
      this.terrainKey = key;
      this.drawStarfield();
    }

    this.layout(state);
    this.drawRock();
    this.drawCells(state);
    this.drawStructures(state);
    this.drawOverlay(state);
  }

  /** Cells a crater has eaten. The caller uses this to reject placement. */
  isBlocked(cell: Cell): boolean {
    return this.terrain?.blocked.has(cellKey(cell)) ?? false;
  }

  /**
   * Re-sizes the renderer to a new viewport. The caller measures its own container; the
   * canvas is out of flow, so nothing here can feed back into that measurement.
   */
  resize(width: number, height: number): void {
    if (this.disposed) return;
    if (width <= 0 || height <= 0) return;
    if (width === this.viewWidth && height === this.viewHeight) return;
    this.viewWidth = width;
    this.viewHeight = height;
    this.app.renderer.resize(width, height);
    this.drawStarfield();
    if (this.state) this.update(this.state);
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    const canvas = this.app.canvas;
    canvas.removeEventListener("pointermove", this.handlePointerMove);
    canvas.removeEventListener("pointerleave", this.handlePointerLeave);
    canvas.removeEventListener("click", this.handleClick);
    this.app.destroy(false, { children: true });
  }

  // ── layout ────────────────────────────────────────────────────────────────

  /**
   * Frames the rock so it runs to the edges rather than floating as an island in black.
   *
   * Fits the *buildable grid* rather than the rock's outline: the limb extends well past
   * the grid, so scaling to cover the viewport by the limb would crop cells the player
   * needs to reach. Fitting the grid and letting the limb overflow gives the original's
   * cropped-terrain look while keeping every cell on screen.
   */
  private layout(state: SurfaceState): void {
    const extent = gridExtent(state.gridWidth, state.gridHeight);
    const margin = 0.9;
    const scale = Math.min(
      (this.viewWidth * margin) / extent.width,
      (this.viewHeight * margin) / extent.height,
    );
    this.world.scale.set(scale);
    // Nudge the rock below centre: buildings grow upward, so the headroom is above.
    this.world.x = this.viewWidth / 2 - (extent.width / 2 - extent.originX) * scale;
    this.world.y = this.viewHeight / 2 - (extent.height / 2 - TILE_H * 1.6) * scale;
  }

  private toLocal(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.app.canvas.getBoundingClientRect();
    const scale = this.world.scale.x;
    return {
      x: (clientX - rect.left - this.world.x) / scale,
      y: (clientY - rect.top - this.world.y) / scale,
    };
  }

  private cellAt(clientX: number, clientY: number): Cell | null {
    const state = this.state;
    if (!state) return null;
    const local = this.toLocal(clientX, clientY);
    const cell = screenToCell(local);
    if (cell.x < 0 || cell.y < 0 || cell.x >= state.gridWidth || cell.y >= state.gridHeight) {
      return null;
    }
    return cell;
  }

  // ── input ─────────────────────────────────────────────────────────────────

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (!this.state?.interactive) return;
    const cell = this.cellAt(event.clientX, event.clientY);
    const changed = cell?.x !== this.hovered?.x || cell?.y !== this.hovered?.y;
    if (!changed) return;
    this.hovered = cell;
    this.callbacks.onHoverCell(cell);
    if (this.state) this.drawOverlay(this.state);
  };

  private readonly handlePointerLeave = (): void => {
    if (this.hovered === null) return;
    this.hovered = null;
    this.callbacks.onHoverCell(null);
    if (this.state) this.drawOverlay(this.state);
  };

  private readonly handleClick = (event: MouseEvent): void => {
    if (!this.state?.interactive) return;
    this.callbacks.onSelectCell(this.cellAt(event.clientX, event.clientY));
  };

  // ── drawing ───────────────────────────────────────────────────────────────

  private drawStarfield(): void {
    const g = this.starfield;
    g.clear();
    const w = this.viewWidth;
    const h = this.viewHeight;
    // Seeded off the terrain key so the backdrop is stable per rock.
    let seed = this.terrainKey.length * 9301;
    const next = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < 90; i++) {
      const alpha = 0.15 + next() * 0.5;
      g.circle(next() * w, next() * h, next() < 0.85 ? 0.7 : 1.3).fill({
        color: 0xc8d8ff,
        alpha,
      });
    }
  }

  private drawRock(): void {
    const terrain = this.terrain;
    const g = this.rock;
    g.clear();
    if (!terrain) return;

    const limb = terrain.limb.flatMap((p) => [p.x, p.y]);
    // One hard light from the upper left, as the original's pre-rendered surfaces had.
    const SUN = { x: -1.4, y: -1 };

    // 1. Flank: the limb dropped straight down, so the rock reads as a body with mass
    //    rather than a decal lying on the starfield.
    const flank = terrain.limb.flatMap((p) => [p.x, p.y + ROCK_THICKNESS]);
    g.poly(flank).fill({ color: SURFACE_PALETTE.rockDark });
    for (let i = 0; i < terrain.limb.length; i++) {
      const a = terrain.limb[i];
      const b = terrain.limb[(i + 1) % terrain.limb.length];
      if (!a || !b) continue;
      if (a.y + b.y < 0) continue; // only the near half of the flank is visible
      g.poly([a.x, a.y, b.x, b.y, b.x, b.y + ROCK_THICKNESS, a.x, a.y + ROCK_THICKNESS]).fill({
        color: SURFACE_PALETTE.rockDark,
      });
    }

    // 2. Top face.
    g.poly(limb).fill({ color: SURFACE_PALETTE.rock });

    // 3. Terminator: a soft dark wash pushed away from the sun.
    g.poly(terrain.limb.flatMap((p) => [p.x - SUN.x * 9, p.y - SUN.y * 9])).fill({
      color: SURFACE_PALETTE.rockDark,
      alpha: 0.32,
    });

    // 4. Scree, so the fill is not a flat plane.
    for (const mote of terrain.motes) {
      g.circle(mote.x, mote.y, mote.r).fill({
        color: mote.lit ? SURFACE_PALETTE.rockLit : SURFACE_PALETTE.rockDark,
        alpha: mote.lit ? 0.4 : 0.5,
      });
    }

    // 5. Craters, drawn as the cells they occupy. The depression and the refusal are
    //    the same set by construction, so the picture cannot contradict the rule.
    for (const crater of terrain.craters) {
      const members = new Set(crater.cells.map(cellKey));
      for (const cell of crater.cells) {
        const corners = cellCorners(cell);
        g.poly(corners.flatMap((p) => [p.x, p.y])).fill({
          color: 0x000000,
          alpha: 0.42 + crater.depth * 0.3,
        });
      }
      // Rim only along edges that leave the crater, so the outline traces the hole.
      for (const cell of crater.cells) {
        const corners = cellCorners(cell);
        const neighbours: Cell[] = [
          { x: cell.x, y: cell.y - 1 },
          { x: cell.x + 1, y: cell.y },
          { x: cell.x, y: cell.y + 1 },
          { x: cell.x - 1, y: cell.y },
        ];
        for (let i = 0; i < 4; i++) {
          const neighbour = neighbours[i];
          if (neighbour && members.has(cellKey(neighbour))) continue;
          const a = corners[i];
          const b = corners[(i + 1) % 4];
          if (!a || !b) continue;
          // The sun sits upper-left, so rims facing it catch light and the rest fall away.
          const facingSun = (a.y + b.y) / 2 < cellToScreen(cell).y;
          g.moveTo(a.x, a.y)
            .lineTo(b.x, b.y)
            .stroke({
              color: facingSun ? SURFACE_PALETTE.rockLit : 0x000000,
              width: 2.5,
              alpha: facingSun ? 0.95 : 0.8,
            });
        }
      }
    }

    // 6. Lit limb on the sun side only — a full outline would flatten it again.
    for (let i = 0; i < terrain.limb.length; i++) {
      const a = terrain.limb[i];
      const b = terrain.limb[(i + 1) % terrain.limb.length];
      if (!a || !b) continue;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      if (mx * -SUN.x + my * -SUN.y < 0) continue;
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({
        color: SURFACE_PALETTE.rockLit,
        width: 2,
        alpha: 0.8,
      });
    }
  }

  private drawCells(state: SurfaceState): void {
    const terrain = this.terrain;
    const g = this.cells;
    g.clear();
    if (!terrain) return;

    for (let y = 0; y < state.gridHeight; y++) {
      for (let x = 0; x < state.gridWidth; x++) {
        const cell = { x, y };
        const key = cellKey(cell);
        if (terrain.blocked.has(key)) continue;

        const corners = cellCorners(cell).flatMap((p) => [p.x, p.y]);
        const shade = terrain.cellShade.get(key) ?? 1;
        // Buildable ground is graded flat and slightly darker than raw rock, so the
        // plateau reads as prepared and the structures on it stand out.
        g.poly(corners)
          .fill({ color: SURFACE_PALETTE.rockDark, alpha: 0.34 * shade })
          .stroke({ color: SURFACE_PALETTE.rockLit, width: 1, alpha: 0.3 });
      }
    }
  }

  private drawStructures(state: SurfaceState): void {
    this.structures.removeChildren().forEach((child) => {
      child.destroy();
    });

    const drawables: Array<{ depth: number; cell: Cell; paint: (g: Graphics) => void }> = [];

    for (const building of state.buildings) {
      drawables.push({
        depth: depthOf(building.cell),
        cell: building.cell,
        paint: (g) => {
          this.paintShadow(g);
          paintBuilding(g, building.kind, { x: 0, y: 0 });
        },
      });
    }

    for (const cell of state.pending) {
      drawables.push({ depth: depthOf(cell), cell, paint: (g) => this.paintScaffold(g) });
    }

    // Painter's algorithm: far cells first, so near structures overlap them.
    drawables.sort((a, b) => a.depth - b.depth);
    for (const item of drawables) {
      const g = new Graphics();
      item.paint(g);
      const at = cellToScreen(item.cell);
      g.position.set(at.x, at.y + TILE_H / 4);
      g.scale.set(FORM_UNIT);
      this.structures.addChild(g);
    }
  }

  private paintShadow(g: Graphics): void {
    g.ellipse(5, 3, TILE_W * 0.3, TILE_H * 0.28).fill({ color: 0x000000, alpha: 0.45 });
  }

  /** Construction state: an open lattice with a warning beacon, clearly not finished. */
  private paintScaffold(g: Graphics): void {
    const corners = cellCorners({ x: 0, y: 0 });
    g.poly(corners.flatMap((p) => [p.x, p.y])).stroke({
      color: SURFACE_PALETTE.glowDim,
      width: 1.2,
      alpha: 0.9,
    });
    for (const corner of corners) {
      g.moveTo(corner.x * 0.7, corner.y * 0.7)
        .lineTo(corner.x * 0.7, corner.y * 0.7 - 12)
        .stroke({ color: SURFACE_PALETTE.glowDim, width: 1.2, alpha: 0.8 });
    }
    g.circle(0, -15, 1.8).fill({ color: SURFACE_PALETTE.glow });
  }

  private drawOverlay(state: SurfaceState): void {
    const g = this.overlay;
    g.clear();
    this.ghost.clear();

    if (state.selected) {
      const corners = cellCorners(state.selected).flatMap((p) => [p.x, p.y]);
      g.poly(corners).stroke({ color: 0x4488cc, width: 2, alpha: 0.95 });
    }

    const hovered = this.hovered;
    if (!hovered || !state.interactive) return;

    const blocked = this.isBlocked(hovered);
    const occupied =
      state.buildings.some((b) => b.cell.x === hovered.x && b.cell.y === hovered.y) ||
      state.pending.some((c) => c.x === hovered.x && c.y === hovered.y);
    const corners = cellCorners(hovered).flatMap((p) => [p.x, p.y]);

    if (blocked || occupied) {
      g.poly(corners).fill({ color: SURFACE_PALETTE.danger, alpha: 0.22 });
      g.poly(corners).stroke({ color: SURFACE_PALETTE.danger, width: 1.6, alpha: 0.9 });
      const at = cellToScreen(hovered);
      const r = 5;
      g.moveTo(at.x - r, at.y - r / 2)
        .lineTo(at.x + r, at.y + r / 2)
        .stroke({
          color: SURFACE_PALETTE.danger,
          width: 2,
        });
      g.moveTo(at.x + r, at.y - r / 2)
        .lineTo(at.x - r, at.y + r / 2)
        .stroke({
          color: SURFACE_PALETTE.danger,
          width: 2,
        });
      return;
    }

    g.poly(corners).fill({ color: SURFACE_PALETTE.glow, alpha: 0.16 });
    g.poly(corners).stroke({ color: SURFACE_PALETTE.glow, width: 1.6, alpha: 0.9 });

    if (state.ghostKind) {
      const at = cellToScreen(hovered);
      paintBuilding(this.ghost, state.ghostKind, { x: 0, y: 0 });
      this.ghost.position.set(at.x, at.y + TILE_H / 4);
      this.ghost.scale.set(FORM_UNIT);
    }
  }
}
