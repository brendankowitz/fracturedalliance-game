/**
 * Maps each building kind to a drawn isometric form.
 *
 * Silhouette is the readable channel: a player should be able to tell a mine from a
 * habitat from a turret at a glance, without reading a label. Kinds that do the same job
 * deliberately share a form — the catalogue has far more entries than it has distinct
 * roles, and inventing 57 unique shapes would make the surface less legible, not more.
 */

import type { Graphics } from "pixi.js";
import {
  type Anchor,
  drawBox,
  drawDish,
  drawDome,
  drawGantry,
  drawLights,
  drawPad,
  drawTank,
  drawTower,
  SURFACE_PALETTE,
} from "./isoVolumes.ts";

export type BuildingForm =
  | "command"
  | "processor"
  | "tank"
  | "greenhouse"
  | "habitat"
  | "dome"
  | "reactor"
  | "mine"
  | "drill"
  | "refinery"
  | "shipyard"
  | "turret"
  | "shield"
  | "silo"
  | "wall"
  | "storage"
  | "market"
  | "lab"
  | "security"
  | "filter"
  | "repair"
  | "lobby";

const FORM_BY_KIND: Readonly<Record<string, BuildingForm>> = {
  cpu: "command",
  commandCentre: "command",
  ecc: "command",

  airProcessor: "processor",
  atmosphericCondenser: "processor",

  hydrationPlant: "tank",

  hydroponics: "greenhouse",
  advHydroponics: "greenhouse",
  biosphereDome: "greenhouse",

  livingQuarters: "habitat",
  resiblock: "habitat",
  megaHabitat: "habitat",
  arcology: "habitat",

  pleasureDome: "dome",
  medicalCentre: "dome",

  powerPlant: "reactor",
  fusionReactor: "reactor",
  geothermalTap: "reactor",

  mineMk1: "mine",
  mineMk2: "mine",

  deepBoreMine: "drill",
  astralMiner: "drill",
  antimatterDrill: "drill",

  oreRefinery: "refinery",
  crystalSeparator: "refinery",
  naniteExtractor: "refinery",
  materialsSynth: "refinery",
  recyclingCentre: "refinery",

  shipYard: "shipyard",

  turretBattery: "turret",
  ionCannon: "turret",

  shieldGenerator: "shield",
  gravityPlating: "shield",
  gravityNullifier: "shield",

  missileSilo: "silo",
  antimatterMine: "silo",
  doomsdayDevice: "silo",

  fortressWall: "wall",
  storageTower: "storage",

  tradingPost: "market",
  blackMarket: "market",
  smugglerBay: "market",
  pricingOffice: "market",
  creditMint: "market",
  monopolyOffice: "market",
  galacticExchange: "market",

  researchLab: "lab",
  computingArray: "lab",
  xenologyLab: "lab",
  quantumProcessor: "lab",
  warpResearch: "lab",
  bioResearchLab: "lab",
  omniscienceNode: "lab",

  securityCentre: "security",
  radiationFilter: "filter",
  repairFacility: "repair",
  federationLobby: "lobby",
};

export function formOf(kind: string): BuildingForm {
  return FORM_BY_KIND[kind] ?? "habitat";
}

type Painter = (g: Graphics, at: Anchor) => void;

const PAINTERS: Readonly<Record<BuildingForm, Painter>> = {
  command: (g, at) => {
    drawPad(g, at, 15, 15, SURFACE_PALETTE.pad);
    drawBox(g, at, 10, 10, 15);
    drawBox(g, { x: at.x, y: at.y - 15 }, 6, 6, 9, 1.15);
    g.moveTo(at.x, at.y - 24)
      .lineTo(at.x, at.y - 34)
      .stroke({ color: SURFACE_PALETTE.glowDim, width: 1.2 });
    g.circle(at.x, at.y - 35, 1.6).fill({ color: SURFACE_PALETTE.glow });
    drawLights(g, at, 3, 12, 9);
    drawLights(g, at, 3, 12, 13);
  },

  processor: (g, at) => {
    drawPad(g, at, 15, 15, SURFACE_PALETTE.pad);
    drawBox(g, at, 12, 12, 9);
    // Oversized intake ring is the tell — visible even when the box is not.
    g.circle(at.x - 7, at.y - 7, 6.5)
      .fill({ color: SURFACE_PALETTE.sideFar })
      .stroke({ color: SURFACE_PALETTE.glow, width: 1.4 });
    g.circle(at.x - 7, at.y - 7, 2).fill({ color: SURFACE_PALETTE.glow });
    drawTank(g, { x: at.x + 8, y: at.y - 9 }, 3.5, 13, 1.1);
  },

  tank: (g, at) => {
    drawPad(g, at, 15, 15, SURFACE_PALETTE.pad);
    // Tall and narrow, so it never reads as the habitat block.
    drawTank(g, at, 7.5, 26);
    for (let i = 1; i <= 2; i++) {
      g.moveTo(at.x - 10, at.y - i * 5)
        .lineTo(at.x + 10, at.y - i * 5)
        .stroke({ color: SURFACE_PALETTE.water, width: 1, alpha: 0.8 });
    }
  },

  greenhouse: (g, at) => {
    drawPad(g, at, 15, 15, SURFACE_PALETTE.pad);
    // Deliberately the lowest thing on the surface: a run of glass barrel vaults.
    for (const dx of [-9, 0, 9]) {
      drawDome(g, { x: at.x + dx, y: at.y - 1 }, 6, 9, SURFACE_PALETTE.plant);
    }
  },

  habitat: (g, at) => {
    drawPad(g, at, 15, 15, SURFACE_PALETTE.pad);
    drawBox(g, at, 13, 12, 16);
    drawBox(g, { x: at.x - 4, y: at.y - 16 }, 7, 7, 8, 1.14);
    for (const rise of [6, 10, 14]) drawLights(g, at, 4, 18, rise);
  },

  dome: (g, at) => {
    drawPad(g, at, 15, 15, SURFACE_PALETTE.pad);
    drawBox(g, at, 11, 11, 4);
    drawDome(g, { x: at.x, y: at.y - 4 }, 10, 11, SURFACE_PALETTE.topLit);
    g.circle(at.x, at.y - 15, 1.5).fill({ color: SURFACE_PALETTE.glow });
  },

  reactor: (g, at) => {
    drawPad(g, at, 15, 15, SURFACE_PALETTE.pad);
    // Squat vessel flanked by two tall chimneys — a wide, spiky profile.
    drawTank(g, at, 11, 9);
    g.ellipse(at.x, at.y - 9, 6.5, 3.2).fill({ color: SURFACE_PALETTE.glow, alpha: 0.9 });
    drawTower(g, { x: at.x - 12, y: at.y - 2 }, 2.6, 26);
    drawTower(g, { x: at.x + 12, y: at.y - 2 }, 2.6, 20);
  },

  mine: (g, at) => {
    drawPad(g, at, 15, 15, SURFACE_PALETTE.pad);
    drawBox(g, at, 9, 9, 6);
    // Pithead winding frame: the open lattice is what separates it from a plain shed.
    drawGantry(g, { x: at.x + 2, y: at.y - 6 }, 9, 20);
    g.circle(at.x + 2, at.y - 27, 2.4).fill({ color: SURFACE_PALETTE.glowDim });
  },

  drill: (g, at) => {
    drawPad(g, at, 15, 15, SURFACE_PALETTE.pad);
    drawBox(g, at, 10, 10, 5);
    // The tallest structure on any surface — deep-bore rigs should dominate.
    drawTower(g, { x: at.x, y: at.y - 5 }, 5.5, 36, 0.22);
    for (let i = 1; i <= 3; i++) {
      g.circle(at.x, at.y - 5 - i * 6, 1.2).fill({ color: SURFACE_PALETTE.glow, alpha: 0.9 });
    }
  },

  refinery: (g, at) => {
    drawPad(g, at, 15, 15, SURFACE_PALETTE.pad);
    drawTank(g, { x: at.x - 6, y: at.y - 1 }, 5, 11);
    drawTank(g, { x: at.x + 6, y: at.y - 3 }, 4, 8);
    g.moveTo(at.x - 6, at.y - 10)
      .lineTo(at.x + 6, at.y - 9)
      .stroke({ color: SURFACE_PALETTE.topLit, width: 1.6 });
    drawTower(g, { x: at.x + 1, y: at.y - 2 }, 2, 16);
  },

  shipyard: (g, at) => {
    drawPad(g, at, 15, 15, SURFACE_PALETTE.pad);
    drawBox(g, at, 7, 14, 3);
    // Wide, low, and spanned by a big open gantry.
    drawGantry(g, { x: at.x, y: at.y - 3 }, 15, 22);
    drawLights(g, at, 3, 22, 1.5);
  },

  turret: (g, at) => {
    drawPad(g, at, 13, 13, SURFACE_PALETTE.pad);
    drawBox(g, at, 8, 8, 5);
    drawTank(g, { x: at.x, y: at.y - 5 }, 5, 4, 1.1);
    g.moveTo(at.x, at.y - 10)
      .lineTo(at.x + 13, at.y - 17)
      .stroke({ color: SURFACE_PALETTE.topLit, width: 3.2 });
    g.circle(at.x + 13, at.y - 17, 1.6).fill({ color: SURFACE_PALETTE.danger });
  },

  shield: (g, at) => {
    drawPad(g, at, 15, 15, SURFACE_PALETTE.pad);
    drawBox(g, at, 9, 9, 6);
    drawDome(g, { x: at.x, y: at.y - 6 }, 8, 8, SURFACE_PALETTE.sideNear);
    for (const r of [11, 15]) {
      g.ellipse(at.x, at.y - 9, r, r / 2).stroke({
        color: SURFACE_PALETTE.water,
        width: 1,
        alpha: 0.55,
      });
    }
  },

  silo: (g, at) => {
    drawPad(g, at, 15, 15, SURFACE_PALETTE.pad);
    drawBox(g, at, 12, 12, 4);
    g.ellipse(at.x, at.y - 4, 7, 3.5).fill({ color: SURFACE_PALETTE.edge });
    g.ellipse(at.x, at.y - 4, 7, 3.5).stroke({
      color: SURFACE_PALETTE.danger,
      width: 1.2,
      alpha: 0.9,
    });
    drawTank(g, { x: at.x, y: at.y - 4 }, 3.5, 9, 0.8);
  },

  wall: (g, at) => {
    drawPad(g, at, 15, 15, SURFACE_PALETTE.pad);
    for (const dx of [-7, 0, 7]) {
      drawBox(g, { x: at.x + dx, y: at.y - 1 }, 4, 8, 8);
    }
  },

  storage: (g, at) => {
    drawPad(g, at, 15, 15, SURFACE_PALETTE.pad);
    // A cluster of silos reads differently from the single hydration tank.
    drawTank(g, { x: at.x - 7, y: at.y - 1 }, 4.5, 20);
    drawTank(g, { x: at.x + 1, y: at.y + 2 }, 4.5, 24);
    drawTank(g, { x: at.x + 8, y: at.y - 3 }, 4, 16);
  },

  market: (g, at) => {
    drawPad(g, at, 15, 15, SURFACE_PALETTE.pad);
    drawBox(g, at, 13, 12, 7);
    drawDish(g, { x: at.x + 6, y: at.y - 7 }, 5, 7);
    drawLights(g, at, 5, 20, 4);
  },

  lab: (g, at) => {
    drawPad(g, at, 15, 15, SURFACE_PALETTE.pad);
    drawBox(g, at, 11, 11, 8);
    drawDome(g, { x: at.x - 5, y: at.y - 8 }, 6, 7, SURFACE_PALETTE.water);
    drawDish(g, { x: at.x + 7, y: at.y - 8 }, 6, 12);
  },

  security: (g, at) => {
    drawPad(g, at, 14, 14, SURFACE_PALETTE.pad);
    drawBox(g, at, 11, 11, 6);
    drawBox(g, { x: at.x, y: at.y - 6 }, 4, 4, 6, 0.9);
    g.circle(at.x, at.y - 13, 1.8).fill({ color: SURFACE_PALETTE.danger });
  },

  filter: (g, at) => {
    drawPad(g, at, 15, 15, SURFACE_PALETTE.pad);
    drawBox(g, at, 10, 10, 8);
    for (const dy of [0, 3, 6]) {
      g.moveTo(at.x - 11, at.y - 9 - dy)
        .lineTo(at.x + 11, at.y - 12 - dy)
        .stroke({ color: SURFACE_PALETTE.topLit, width: 1.4, alpha: 0.8 });
    }
  },

  repair: (g, at) => {
    drawPad(g, at, 15, 15, SURFACE_PALETTE.pad);
    drawBox(g, at, 8, 10, 6);
    g.moveTo(at.x + 4, at.y - 6)
      .lineTo(at.x + 12, at.y - 16)
      .lineTo(at.x + 4, at.y - 18)
      .stroke({ color: SURFACE_PALETTE.glowDim, width: 2 });
  },

  lobby: (g, at) => {
    drawPad(g, at, 15, 15, SURFACE_PALETTE.pad);
    drawBox(g, at, 11, 11, 6);
    drawDish(g, { x: at.x, y: at.y - 6 }, 8, 10);
  },
};

export function paintBuilding(g: Graphics, kind: string, at: Anchor): void {
  PAINTERS[formOf(kind)](g, at);
}
