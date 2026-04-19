import type { AsteroidId, ShipId } from "@fa/domain";
import type { HudSnapshot } from "@fa/sim";
import type { Application } from "pixi.js";
import { Container, Graphics, Text } from "pixi.js";

const SIZE_RADIUS: Record<string, number> = {
  small: 8,
  medium: 12,
  large: 18,
};

export type ColorPalette = "normal" | "deuteranopia" | "protanopia";

export const PALETTES: Record<ColorPalette, { human: number; ai: number; neutral: number }> = {
  normal:       { human: 0x3399ff, ai: 0xff4433, neutral: 0x888888 },
  deuteranopia: { human: 0x3399ff, ai: 0xff8c00, neutral: 0x888888 },
  protanopia:   { human: 0x0099cc, ai: 0xd4a017, neutral: 0x888888 },
};

const SECTOR_SCALE = 80; // pixels per sector unit — 7×80=560px fits a typical 768px-tall screen

export class SectorView {
  readonly container: Container;

  private readonly _worldLayer: Container;
  private _scale = 1;
  private _offsetX = 0;
  private _offsetY = 0;
  private _dragging = false;
  private _dragStartX = 0;
  private _dragStartY = 0;
  private _dragOffsetStartX = 0;
  private _dragOffsetStartY = 0;
  private _palette: ColorPalette = "normal";

  setColorPalette(p: ColorPalette): void {
    this._palette = p;
  }

  private readonly _onSelectAsteroid: (id: AsteroidId) => void;
  private readonly _asteroidGraphics: Map<AsteroidId, { gfx: Graphics; label: Text }> = new Map();
  private readonly _shipGraphics: Map<ShipId, Graphics> = new Map();
  private _laserGfx: Graphics;

  constructor(app: Application, onSelectAsteroid: (id: AsteroidId) => void) {
    this._onSelectAsteroid = onSelectAsteroid;

    this.container = new Container();
    this._worldLayer = new Container();

    // Static starfield background (deterministic via LCG)
    const starfield = new Graphics();
    let sx = 12345;
    const rand = () => {
      sx = (sx * 1664525 + 1013904223) & 0xffffffff;
      return (sx >>> 0) / 0xffffffff;
    };
    for (let i = 0; i < 200; i++) {
      const x = rand() * 1400;
      const y = rand() * 900;
      const size = rand() < 0.8 ? 0.8 : 1.5;
      const alpha = 0.2 + rand() * 0.5;
      starfield.circle(x, y, size).fill({ color: 0xffffff, alpha });
    }
    this.container.addChild(starfield);
    this.container.addChild(this._worldLayer);

    // Faint coordinate grid in world space (pans/zooms with map)
    const gridLayer = new Graphics();
    const GRID_ALPHA = 0.06;
    const GRID_LINES = 8;
    for (let i = 0; i <= GRID_LINES; i++) {
      const pos = i * SECTOR_SCALE;
      gridLayer.moveTo(pos, 0).lineTo(pos, GRID_LINES * SECTOR_SCALE).stroke({ color: 0x3366aa, alpha: GRID_ALPHA, width: 1 });
      gridLayer.moveTo(0, pos).lineTo(GRID_LINES * SECTOR_SCALE, pos).stroke({ color: 0x3366aa, alpha: GRID_ALPHA, width: 1 });
    }
    this._worldLayer.addChild(gridLayer);

    this._laserGfx = new Graphics();
    this._worldLayer.addChild(this._laserGfx);

    // Centre the view on the midpoint of the 7×7 sector grid
    this._offsetX = app.screen.width / 2 - (3 * SECTOR_SCALE);
    this._offsetY = app.screen.height / 2 - (3 * SECTOR_SCALE);
    this._applyTransform();

    app.stage.addChild(this.container);
    this._attachInputHandlers(app);
  }

  private _attachInputHandlers(app: Application): void {
    app.stage.eventMode = "static";
    app.stage.hitArea = app.screen;

    app.stage.on("pointerdown", (e) => {
      this._dragging = true;
      this._dragStartX = e.globalX;
      this._dragStartY = e.globalY;
      this._dragOffsetStartX = this._offsetX;
      this._dragOffsetStartY = this._offsetY;
    });

    app.stage.on("pointermove", (e) => {
      if (!this._dragging) return;
      this._offsetX = this._dragOffsetStartX + (e.globalX - this._dragStartX);
      this._offsetY = this._dragOffsetStartY + (e.globalY - this._dragStartY);
      this._applyTransform();
    });

    app.stage.on("pointerup", () => {
      this._dragging = false;
    });

    app.stage.on("pointerupoutside", () => {
      this._dragging = false;
    });

    app.canvas.addEventListener("wheel", (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this._scale = Math.max(0.3, Math.min(3.0, this._scale * delta));
      this._applyTransform();
    });
  }

  private _applyTransform(): void {
    this._worldLayer.x = this._offsetX;
    this._worldLayer.y = this._offsetY;
    this._worldLayer.scale.set(this._scale);
  }

  update(snapshot: HudSnapshot): void {
    const { humanPlayerId, asteroids } = snapshot;

    // Build a set of AI player ids (non-human, non-neutral)
    const aiPlayerIds = new Set(snapshot.players.filter((p) => !p.isHuman).map((p) => p.id));

    const seenIds = new Set<AsteroidId>();

    for (const asteroid of asteroids) {
      seenIds.add(asteroid.id);

      let entry = this._asteroidGraphics.get(asteroid.id);
      if (!entry) {
        const gfx = new Graphics();
        gfx.eventMode = "static";
        gfx.cursor = "pointer";
        gfx.on("pointerup", (e) => {
          const moved = Math.hypot(e.globalX - this._dragStartX, e.globalY - this._dragStartY);
          if (moved < 4) {
            this._onSelectAsteroid(asteroid.id);
            e.stopPropagation();
          }
        });

        const label = new Text({
          text: asteroid.name,
          style: {
            fontSize: 9,
            fill: 0xcccccc,
            fontFamily: "monospace",
          },
        });
        label.anchor.set(0.5, 0);

        this._worldLayer.addChild(gfx, label);
        entry = { gfx, label };
        this._asteroidGraphics.set(asteroid.id, entry);
      }

      const { gfx, label } = entry;
      const radius = SIZE_RADIUS[asteroid.sizeClass] ?? 10;

      let colour: number;
      if (asteroid.ownerId === humanPlayerId) {
        colour = PALETTES[this._palette].human;
      } else if (asteroid.ownerId !== null && aiPlayerIds.has(asteroid.ownerId)) {
        colour = PALETTES[this._palette].ai;
      } else {
        colour = PALETTES[this._palette].neutral;
      }

      const sx = asteroid.sector.x * SECTOR_SCALE;
      const sy = asteroid.sector.y * SECTOR_SCALE;

      gfx.clear();
      // Outer glow ring (ownership indicator)
      gfx.circle(sx, sy, radius + 3).fill({ color: colour, alpha: 0.12 });
      // Main body — slightly darker fill with lighter core
      gfx.circle(sx, sy, radius).fill({ color: colour, alpha: 0.9 });
      // Highlight (top-left crescent)
      gfx.circle(sx - radius * 0.25, sy - radius * 0.25, radius * 0.45).fill({ color: 0xffffff, alpha: 0.12 });
      // Crisp border
      gfx.circle(sx, sy, radius).stroke({ color: colour, alpha: 0.7, width: 1.5 });

      label.x = sx;
      label.y = sy + radius + 2;
      label.text = asteroid.name;
    }

    // Remove graphics for asteroids no longer in snapshot
    const toRemove = [...this._asteroidGraphics.keys()].filter((id) => !seenIds.has(id));
    for (const id of toRemove) {
      const entry = this._asteroidGraphics.get(id)!;
      entry.gfx.destroy();
      entry.label.destroy();
      this._asteroidGraphics.delete(id);
    }

    // Render ships
    const seenShipIds = new Set<ShipId>();

    for (const ship of snapshot.ships) {
      seenShipIds.add(ship.id);

      let gfx = this._shipGraphics.get(ship.id);
      if (!gfx) {
        gfx = new Graphics();
        this._worldLayer.addChild(gfx);
        this._shipGraphics.set(ship.id, gfx);
      }

      const sx = ship.position.x * SECTOR_SCALE;
      const sy = ship.position.y * SECTOR_SCALE;
      const isHuman = ship.ownerId === snapshot.humanPlayerId;
      const colour = isHuman ? PALETTES[this._palette].human : PALETTES[this._palette].ai;
      const r = 3;

      gfx.clear();
      // Diamond shape (rotated square)
      gfx
        .moveTo(sx, sy - r)
        .lineTo(sx + r, sy)
        .lineTo(sx, sy + r)
        .lineTo(sx - r, sy)
        .closePath()
        .fill({ color: colour, alpha: 0.95 });
    }

    // Remove stale ship graphics
    const toRemoveShips = [...this._shipGraphics.keys()].filter((id) => !seenShipIds.has(id));
    for (const id of toRemoveShips) {
      this._shipGraphics.get(id)!.destroy();
      this._shipGraphics.delete(id);
    }

    // Redraw combat laser lines
    this._laserGfx.clear();
    for (const flash of snapshot.combatFlashes) {
      const fx = flash.fromX * SECTOR_SCALE;
      const fy = flash.fromY * SECTOR_SCALE;
      const tx = flash.toX * SECTOR_SCALE;
      const ty = flash.toY * SECTOR_SCALE;
      this._laserGfx
        .moveTo(fx, fy)
        .lineTo(tx, ty)
        .stroke({ color: 0xff8800, alpha: 0.8, width: 1 });
    }
  }

  destroy(): void {
    for (const { gfx, label } of this._asteroidGraphics.values()) {
      gfx.destroy();
      label.destroy();
    }
    this._asteroidGraphics.clear();
    for (const gfx of this._shipGraphics.values()) {
      gfx.destroy();
    }
    this._shipGraphics.clear();
    this._laserGfx.destroy();
    this.container.destroy({ children: true });
  }
}
