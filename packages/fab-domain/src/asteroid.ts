import type { AsteroidId, BuildingId, PlayerId, ShipId } from './ids';
import type { OreKind } from './resources';

export type AsteroidSizeClass = 'S' | 'M' | 'L' | 'XL';

/** Grid dimension per size class, inclusive of the mandatory CPU building. */
export const GRID_SIZE_BY_CLASS: Record<AsteroidSizeClass, number> = {
  S: 5,
  M: 7,
  L: 9,
  XL: 11,
};

export interface BuildQueueItem {
  kind: string;
  cell: { x: number; y: number };
  progressTicks: number;
  totalTicks: number;
  paidCredits: number;
}

/** Colony-level stockpiles of life-support commodities (not power; power is flow). */
export interface AsteroidStocks {
  food: number;
  water: number;
  air: number;
  /** Raw ore tonnage held locally on this colony (sum over mined ores, pre-sale). */
  ores: Partial<Record<OreKind, number>>;
}

export interface Asteroid {
  id: AsteroidId;
  name: string;
  ownerId: PlayerId | null;
  sector: { x: number; y: number };
  /** World-space position in units. Initialised from `sector`. */
  position: { x: number; y: number };
  /** World-space velocity in units-per-tick. */
  velocity: { x: number; y: number };
  /** Active course set by an Asteroid Engine, or null. */
  course: { targetX: number; targetY: number; thrust: number } | null;
  /** Relative mass (1=S, 2=M, 4=L, 8=XL). Used for collision damage. */
  mass: number;
  sizeClass: AsteroidSizeClass;
  grid: { width: number; height: number };
  /** Remaining tonnage per ore kind. Missing kinds are not present on this asteroid. */
  deposits: Partial<Record<OreKind, number>>;
  /** 0..100. Rises with Seismic Penetrator operation; Radiation Filter mitigates. */
  radiation: number;
  /** 0..100. Decays while Asteroid Engines fire; zero = rock shatters. */
  stability: number;
  /** 0..100. Below 30 halves productivity; below 10 triggers secession/destruction. */
  happiness: number;
  /** Current headcount. `0` on uncolonised rocks. Capped by Σ building popCapDelta × 100. */
  population: number;
  /** On-colony life-support + ore stockpiles. */
  stocks: AsteroidStocks;
  buildings: BuildingId[];
  buildQueue: BuildQueueItem[];
  inOrbit: ShipId[];
  engines: {
    count: number;
    destination: AsteroidId | null;
    etaTick: number | null;
    announcedToAll: boolean;
  };
}
