import type {
  BlueprintDef,
  BombardmentDef,
  BuildingDef,
  MissileDef,
  OreDef,
  OreKind,
  RaceDef,
  ScenarioDef,
  ShipClassDef,
  WeaponDef,
} from '@fab/domain';

/**
 * Fully-assembled static content bundle consumed by the simulation at world
 * construction. All fields are frozen (readonly) and validated by
 * {@link import('../validate').validateContent} at module load.
 */
export interface ContentBundle {
  readonly ores: Readonly<Record<OreKind, OreDef>>;
  readonly races: readonly RaceDef[];
  readonly buildings: readonly BuildingDef[];
  readonly blueprints: readonly BlueprintDef[];
  readonly ships: readonly ShipClassDef[];
  readonly weapons: readonly WeaponDef[];
  readonly missiles: readonly MissileDef[];
  readonly bombardments: readonly BombardmentDef[];
  readonly scenarios: readonly ScenarioDef[];
}
