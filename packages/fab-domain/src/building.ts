import type { AsteroidId, BlueprintId, BuildingId } from './ids';
import type { OreKind } from './resources';

export type BuildingCategory =
  | 'cpu'
  | 'lifeSupport'
  | 'housing'
  | 'mining'
  | 'power'
  | 'storage'
  | 'defence'
  | 'production'
  | 'logistics'
  | 'engine';

export interface BuildingDef {
  kind: string;
  displayName: string;
  category: BuildingCategory;
  costCredits: number;
  buildTimeTicks: number;
  powerDelta: number;
  popCapDelta: number;
  foodDelta: number;
  waterDelta: number;
  airDelta: number;
  oreProduction?: Partial<Record<OreKind, number>>;
  /** Per-tick ore consumption for refineries/factories. */
  oreConsumption?: Partial<Record<OreKind, number>>;
  /** One-off ore cost to construct (tonnes). */
  oreCost?: Partial<Record<OreKind, number>>;
  /** Credits drained per sim-month (AIUI: 30 sim-days × 20 ticks/sec tick rate). */
  monthlyUpkeep?: number;
  /** Credits generated per tick (trade buildings). */
  creditsProduction?: number;
  /** Footprint on the build grid (square cells). Defaults to 1×1. */
  footprint?: { width: number; height: number };
  /** Power projection radius in tiles (Manhattan). 0 = self-only, undefined = not a projector. */
  powerRadius?: number;
  /** Legacy single-blueprint gate. Prefer blueprintsRequired. */
  blueprintRequired?: BlueprintId;
  /** Full list of blueprints that must be owned. */
  blueprintsRequired?: readonly BlueprintId[];
  /** Hard cap per colony. `undefined` = unlimited, `1` = unique. */
  maxPerColony?: number;
  unique?: boolean;
  flavour?: string;
}

export interface Building {
  id: BuildingId;
  defKind: string;
  asteroidId: AsteroidId;
  cell: { x: number; y: number };
  hp: number;
  maxHp: number;
  /** 0..1. 1 = operational. */
  constructionProgress: number;
  active: boolean;
  damage: number;
}
