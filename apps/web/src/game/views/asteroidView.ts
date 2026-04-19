import type { AsteroidSnapshot } from "@fa/sim";
import type { Application } from "pixi.js";
import { Container, Graphics } from "pixi.js";

const TILE_W = 64;
const TILE_H = 32;

function isoToScreen(gx: number, gy: number): { x: number; y: number } {
  return {
    x: (gx - gy) * (TILE_W / 2),
    y: (gx + gy) * (TILE_H / 2),
  };
}

// Colour map for Phase-0 building kinds — keyed by BuildingDef.kind
const BUILDING_COLOURS: Record<string, number> = {
  cpu: 0x00aaff,
  airProcessor: 0x44ffaa,
  hydrationPlant: 0x44aaff,
  hydroponics: 0x88ff44,
  livingQuarters: 0xffaa44,
  powerPlant: 0xffff00,
  mineMk1: 0xaa6600,
  storageTower: 0x888888,
};

export class AsteroidView {
  readonly container: Container;
  private readonly gridGraphics: Graphics;
  private readonly buildingGraphics: Graphics;

  constructor(app: Application) {
    this.container = new Container();
    this.gridGraphics = new Graphics();
    this.buildingGraphics = new Graphics();
    this.container.addChild(this.gridGraphics, this.buildingGraphics);
    app.stage.addChild(this.container);
  }

  update(asteroid: AsteroidSnapshot, gridSize: number): void {
    this.gridGraphics.clear();
    this.buildingGraphics.clear();

    for (let gx = 0; gx < gridSize; gx++) {
      for (let gy = 0; gy < gridSize; gy++) {
        const { x, y } = isoToScreen(gx, gy);
        this.gridGraphics
          .moveTo(x, y - TILE_H / 2)
          .lineTo(x + TILE_W / 2, y)
          .lineTo(x, y + TILE_H / 2)
          .lineTo(x - TILE_W / 2, y)
          .closePath()
          .stroke({ color: 0x334466, width: 1 });
      }
    }

    asteroid.buildingKinds.forEach((kind, i) => {
      const gx = i % gridSize;
      const gy = Math.floor(i / gridSize);
      const { x, y } = isoToScreen(gx, gy);
      const colour = BUILDING_COLOURS[kind] ?? 0xffffff;
      this.buildingGraphics
        .moveTo(x, y - TILE_H / 2)
        .lineTo(x + TILE_W / 2, y)
        .lineTo(x, y + TILE_H / 2)
        .lineTo(x - TILE_W / 2, y)
        .closePath()
        .fill({ color: colour, alpha: 0.85 });
    });

    const totalW = gridSize * TILE_W;
    const totalH = gridSize * TILE_H;
    this.container.x = (window.innerWidth - totalW) / 2;
    this.container.y = (window.innerHeight - totalH) / 2 + totalH / 2;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
