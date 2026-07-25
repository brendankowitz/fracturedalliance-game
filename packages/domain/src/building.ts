import type { AsteroidId, BlueprintId, BuildingId } from "./ids.ts";
import type { PartialOreRecord } from "./types.ts";

export interface BuildingDef {
  readonly kind: string;
  readonly label: string;
  readonly costCredits: number;
  readonly buildTimeTicks: number;
  readonly powerDelta: number;
  readonly popCapDelta: number;
  readonly foodDelta: number;
  readonly waterDelta: number;
  readonly airDelta: number;
  readonly oreProduction?: PartialOreRecord<number>;
  readonly blueprintRequired?: BlueprintId;
  readonly happinessDelta?: number;
  readonly radiationReduction?: number;
  readonly repairRate?: number;
  readonly unique?: boolean;
  readonly defenseDps?: number; // damage per tick auto-fired at attacking ships in range
  readonly oreMiningMultiplier?: number; // multiplier added to all mine output on this asteroid
}

export interface Building {
  readonly id: BuildingId;
  readonly defKind: string;
  readonly asteroidId: AsteroidId;
  cell: { x: number; y: number };
  hp: number;
  readonly maxHp: number;
  constructionProgress: number;
  active: boolean;
  damage: number;
}
