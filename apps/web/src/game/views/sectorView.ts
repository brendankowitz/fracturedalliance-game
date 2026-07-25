import type { AsteroidId, ShipId } from "@fa/domain";
import type { HudSnapshot } from "@fa/sim";
import type { Application, Texture } from "pixi.js";
import {
  Assets,
  BlurFilter,
  Circle,
  Container,
  Graphics,
  Sprite,
  Text,
  TilingSprite,
} from "pixi.js";
import { assetUrl } from "../../assetUrl.ts";

const SIZE_RADIUS: Record<string, number> = {
  small: 8,
  medium: 12,
  large: 18,
};

// Deterministic variant selection per asteroid (0–3 index into big/med/small variants)
const VARIANT_COUNT = 2;

const METEOR_URLS = {
  small: [
    assetUrl("/assets/meteors/meteorBrown_small1.png"),
    assetUrl("/assets/meteors/meteorBrown_small2.png"),
  ],
  medium: [
    assetUrl("/assets/meteors/meteorBrown_med1.png"),
    assetUrl("/assets/meteors/meteorGrey_med1.png"),
  ],
  large: [
    assetUrl("/assets/meteors/meteorBrown_big1.png"),
    assetUrl("/assets/meteors/meteorBrown_big2.png"),
  ],
};

const SHIP_URLS = {
  human: assetUrl("/assets/ships/player.png"),
  ai: assetUrl("/assets/ships/ai.png"),
};

export const SECTOR_ASSET_URLS: string[] = [
  ...METEOR_URLS.small,
  ...METEOR_URLS.medium,
  ...METEOR_URLS.large,
  SHIP_URLS.human,
  SHIP_URLS.ai,
];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function getMeteorTexture(sizeClass: string, id: string): Texture {
  const variants = METEOR_URLS[sizeClass as keyof typeof METEOR_URLS] ?? METEOR_URLS.medium;
  const url = variants[hashId(id) % VARIANT_COUNT] ?? (variants[0] as string);
  return Assets.get<Texture>(url) as Texture;
}

export type ColorPalette = "normal" | "deuteranopia" | "protanopia";

export const PALETTES: Record<ColorPalette, { human: number; ai: number; neutral: number }> = {
  normal: { human: 0x3399ff, ai: 0xff4433, neutral: 0x888888 },
  deuteranopia: { human: 0x3399ff, ai: 0xff8c00, neutral: 0x888888 },
  protanopia: { human: 0x0099cc, ai: 0xd4a017, neutral: 0x888888 },
};

const SECTOR_SCALE = 80; // pixels per sector unit — 7×80=560px fits a typical 768px-tall screen

interface AsteroidEntry {
  container: Container;
  ring: Graphics;
  pulseRing: Graphics;
  sprite: Sprite;
  label: Text;
}

export class SectorView {
  readonly container: Container;

  private readonly _worldLayer: Container;
  private readonly _glowContainer: Container;
  private _scale = 1;
  private _offsetX = 0;
  private _offsetY = 0;
  private _dragging = false;
  private _dragStartX = 0;
  private _dragStartY = 0;
  private _dragOffsetStartX = 0;
  private _dragOffsetStartY = 0;
  private _palette: ColorPalette = "normal";

  // Feature 1: 3-layer parallax starfield
  private _starLayers: Array<{ sprite: TilingSprite; speed: number }> = [];

  // Feature 2: pan inertia
  private _velX = 0;
  private _velY = 0;
  private _lastPtrX = 0;
  private _lastPtrY = 0;
  private _lastPtrTime = 0;

  setColorPalette(p: ColorPalette): void {
    this._palette = p;
  }

  private readonly _onSelectAsteroid: (id: AsteroidId) => void;
  private readonly _asteroidGraphics: Map<AsteroidId, AsteroidEntry> = new Map();
  private readonly _shipGraphics: Map<ShipId, Sprite> = new Map();

  // Feature 3: ship engine glow
  private readonly _shipGlowGraphics: Map<ShipId, Graphics> = new Map();

  private _laserGfx: Graphics;

  constructor(app: Application, onSelectAsteroid: (id: AsteroidId) => void) {
    this._onSelectAsteroid = onSelectAsteroid;

    this.container = new Container();
    this._worldLayer = new Container();

    // Feature 1: 3-layer parallax starfield (added before _worldLayer so they render behind)
    const starLayerDefs = [
      { count: 400, color: 0x334455, speed: 0.04 }, // distant, barely moves
      { count: 200, color: 0x6688aa, speed: 0.1 }, // mid
      { count: 100, color: 0xaaccee, speed: 0.2 }, // near, moves noticeably
    ];

    for (const def of starLayerDefs) {
      let seed = 12345 + def.count;
      const rand = () => {
        seed = (seed * 1664525 + 1013904223) & 0xffffffff;
        return (seed >>> 0) / 0xffffffff;
      };
      const g = new Graphics();
      for (let i = 0; i < def.count; i++) {
        const x = rand() * 1024;
        const y = rand() * 1024;
        const size = 0.5 + rand() * 1.5;
        const alpha = 0.3 + rand() * 0.5;
        g.circle(x, y, size).fill({ color: def.color, alpha });
      }
      const tex = app.renderer.generateTexture(g);
      g.destroy();
      const ts = new TilingSprite({
        texture: tex,
        width: app.screen.width,
        height: app.screen.height,
      });
      this.container.addChild(ts);
      this._starLayers.push({ sprite: ts, speed: def.speed });
    }

    this.container.addChild(this._worldLayer);

    // Feature 3: glow container lives inside _worldLayer, below everything else
    this._glowContainer = new Container();
    this._worldLayer.addChild(this._glowContainer);

    // Faint coordinate grid in world space (pans/zooms with map)
    const gridLayer = new Graphics();
    const GRID_ALPHA = 0.06;
    const GRID_LINES = 8;
    for (let i = 0; i <= GRID_LINES; i++) {
      const pos = i * SECTOR_SCALE;
      gridLayer
        .moveTo(pos, 0)
        .lineTo(pos, GRID_LINES * SECTOR_SCALE)
        .stroke({ color: 0x3366aa, alpha: GRID_ALPHA, width: 1 });
      gridLayer
        .moveTo(0, pos)
        .lineTo(GRID_LINES * SECTOR_SCALE, pos)
        .stroke({ color: 0x3366aa, alpha: GRID_ALPHA, width: 1 });
    }
    this._worldLayer.addChild(gridLayer);

    this._laserGfx = new Graphics();
    this._worldLayer.addChild(this._laserGfx);

    // Centre the view on the midpoint of the 7×7 sector grid
    this._offsetX = app.screen.width / 2 - 3 * SECTOR_SCALE;
    this._offsetY = app.screen.height / 2 - 3 * SECTOR_SCALE;
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
      // Reset velocity on new drag so old inertia doesn't interfere
      this._velX = 0;
      this._velY = 0;
      this._lastPtrX = e.globalX;
      this._lastPtrY = e.globalY;
      this._lastPtrTime = performance.now();
    });

    app.stage.on("pointermove", (e) => {
      if (!this._dragging) return;
      const now = performance.now();
      const dt = now - this._lastPtrTime;
      if (dt > 0 && dt < 100) {
        this._velX = (e.globalX - this._lastPtrX) * (16 / dt);
        this._velY = (e.globalY - this._lastPtrY) * (16 / dt);
      }
      this._lastPtrX = e.globalX;
      this._lastPtrY = e.globalY;
      this._lastPtrTime = now;
      this._offsetX = this._dragOffsetStartX + (e.globalX - this._dragStartX);
      this._offsetY = this._dragOffsetStartY + (e.globalY - this._dragStartY);
      this._applyTransform();
    });

    app.stage.on("pointerup", () => {
      this._dragging = false;
      // velocity preserved — inertia applied in update()
    });

    app.stage.on("pointerupoutside", () => {
      this._dragging = false;
    });

    app.canvas.addEventListener(
      "wheel",
      (e: WheelEvent) => {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        const oldScale = this._scale;
        const newScale = Math.max(0.25, Math.min(4.0, oldScale * factor));
        // Zoom toward the mouse cursor position
        const rect = app.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        this._offsetX = mx - (mx - this._offsetX) * (newScale / oldScale);
        this._offsetY = my - (my - this._offsetY) * (newScale / oldScale);
        this._scale = newScale;
        // Zero inertia so zooming doesn't fight ongoing momentum
        this._velX = 0;
        this._velY = 0;
        this._applyTransform();
      },
      { passive: false },
    );
  }

  private _applyTransform(): void {
    this._worldLayer.x = this._offsetX;
    this._worldLayer.y = this._offsetY;
    this._worldLayer.scale.set(this._scale);
    for (const { sprite, speed } of this._starLayers) {
      sprite.tilePosition.x = this._offsetX * speed;
      sprite.tilePosition.y = this._offsetY * speed;
    }
  }

  update(snapshot: HudSnapshot): void {
    // Feature 2: apply inertia decay when not actively dragging
    if (!this._dragging) {
      if (Math.abs(this._velX) > 0.05 || Math.abs(this._velY) > 0.05) {
        this._offsetX += this._velX;
        this._offsetY += this._velY;
        this._velX *= 0.88;
        this._velY *= 0.88;
        this._applyTransform();
      } else {
        this._velX = 0;
        this._velY = 0;
      }
    }

    const { humanPlayerId, asteroids } = snapshot;

    const aiPlayerIds = new Set(snapshot.players.filter((p) => !p.isHuman).map((p) => p.id));

    const seenIds = new Set<AsteroidId>();

    for (const asteroid of asteroids) {
      seenIds.add(asteroid.id);

      let entry = this._asteroidGraphics.get(asteroid.id);
      if (!entry) {
        const container = new Container();
        container.eventMode = "static";
        container.cursor = "pointer";
        container.on("pointerup", (e) => {
          const moved = Math.hypot(e.globalX - this._dragStartX, e.globalY - this._dragStartY);
          if (moved < 4) {
            this._onSelectAsteroid(asteroid.id);
            e.stopPropagation();
          }
        });

        const pulseRing = new Graphics();
        const ring = new Graphics();
        const sprite = new Sprite(getMeteorTexture(asteroid.sizeClass, asteroid.id));
        sprite.anchor.set(0.5, 0.5);
        sprite.eventMode = "none";

        const label = new Text({
          text: asteroid.name,
          style: {
            fontSize: 9,
            fill: 0xcccccc,
            fontFamily: "monospace",
          },
        });
        label.anchor.set(0.5, 0);
        label.eventMode = "none";

        container.addChild(pulseRing, ring, sprite);
        this._worldLayer.addChild(container, label);
        entry = { container, pulseRing, ring, sprite, label };
        this._asteroidGraphics.set(asteroid.id, entry);
      }

      const { container, pulseRing, ring, sprite, label } = entry;
      const radius = SIZE_RADIUS[asteroid.sizeClass] ?? 10;

      const isHuman = asteroid.ownerId === humanPlayerId;
      let colour: number;
      if (isHuman) {
        colour = PALETTES[this._palette].human;
      } else if (asteroid.ownerId !== null && aiPlayerIds.has(asteroid.ownerId)) {
        colour = PALETTES[this._palette].ai;
      } else {
        colour = PALETTES[this._palette].neutral;
      }

      const wx = asteroid.sector.x * SECTOR_SCALE;
      const wy = asteroid.sector.y * SECTOR_SCALE;

      container.x = wx;
      container.y = wy;
      // Explicit hit area so PixiJS v8 can hit-test the container
      container.hitArea = new Circle(0, 0, radius + 6);

      // Pulsing beacon ring for the human colony (helps discoverability)
      pulseRing.clear();
      if (isHuman) {
        const pulse = 0.45 + Math.sin(Date.now() / 500) * 0.25;
        pulseRing.circle(0, 0, radius + 10).stroke({ color: colour, alpha: pulse, width: 2 });
      }

      // Ownership ring (drawn in local space around origin)
      ring.clear();
      ring.circle(0, 0, radius + 4).fill({ color: colour, alpha: 0.12 });
      ring.circle(0, 0, radius + 4).stroke({ color: colour, alpha: 0.75, width: 1.5 });

      // Meteor sprite sized to match radius
      sprite.texture = getMeteorTexture(asteroid.sizeClass, asteroid.id);
      sprite.width = radius * 2.2;
      sprite.height = radius * 2.2;
      sprite.x = 0;
      sprite.y = 0;

      label.x = wx;
      label.y = wy + radius + 6;
      label.text = isHuman ? `★ ${asteroid.name}` : asteroid.name;
      label.style.fill = isHuman ? colour : 0xaabbcc;
      label.style.fontSize = isHuman ? 10 : 9;
    }

    // Remove graphics for asteroids no longer in snapshot
    const toRemove = [...this._asteroidGraphics.keys()].filter((id) => !seenIds.has(id));
    for (const id of toRemove) {
      const entry = this._asteroidGraphics.get(id)!;
      entry.container.destroy({ children: true });
      entry.label.destroy();
      this._asteroidGraphics.delete(id);
    }

    // Render ships
    const seenShipIds = new Set<ShipId>();

    for (const ship of snapshot.ships) {
      seenShipIds.add(ship.id);

      let sprite = this._shipGraphics.get(ship.id);
      if (!sprite) {
        const isHuman = ship.ownerId === snapshot.humanPlayerId;
        const tex = Assets.get<Texture>(isHuman ? SHIP_URLS.human : SHIP_URLS.ai) as Texture;
        sprite = new Sprite(tex);
        sprite.anchor.set(0.5, 0.5);
        this._worldLayer.addChild(sprite);
        this._shipGraphics.set(ship.id, sprite);

        // Feature 3: engine glow created alongside ship sprite
        const glow = new Graphics();
        glow.filters = [new BlurFilter({ strength: 8 })];
        this._glowContainer.addChild(glow);
        this._shipGlowGraphics.set(ship.id, glow);
      }

      const wx = ship.position.x * SECTOR_SCALE;
      const wy = ship.position.y * SECTOR_SCALE;
      const isHuman = ship.ownerId === snapshot.humanPlayerId;
      const colour = isHuman ? PALETTES[this._palette].human : PALETTES[this._palette].ai;

      sprite.x = wx;
      sprite.y = wy;
      sprite.width = 14;
      sprite.height = 14;
      sprite.tint = colour;

      // Feature 3: update pulsing engine glow
      const glow = this._shipGlowGraphics.get(ship.id)!;
      const pulse = 0.3 + Math.sin(Date.now() / 400 + ship.id.length) * 0.15;
      glow.clear();
      glow.circle(wx, wy, 9).fill({ color: colour, alpha: pulse });
    }

    // Remove stale ship graphics
    const toRemoveShips = [...this._shipGraphics.keys()].filter((id) => !seenShipIds.has(id));
    for (const id of toRemoveShips) {
      this._shipGraphics.get(id)!.destroy();
      this._shipGraphics.delete(id);
      this._shipGlowGraphics.get(id)?.destroy();
      this._shipGlowGraphics.delete(id);
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
    for (const { container, label } of this._asteroidGraphics.values()) {
      container.destroy({ children: true }); // pulseRing and ring are children
      label.destroy();
    }
    this._asteroidGraphics.clear();
    for (const sprite of this._shipGraphics.values()) {
      sprite.destroy();
    }
    this._shipGraphics.clear();
    for (const glow of this._shipGlowGraphics.values()) {
      glow.destroy();
    }
    this._shipGlowGraphics.clear();
    this._glowContainer.destroy({ children: true });
    this._laserGfx.destroy();
    this.container.destroy({ children: true });
  }
}
