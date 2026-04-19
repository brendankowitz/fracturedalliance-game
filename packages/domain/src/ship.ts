import type { AsteroidId, BlueprintId, PlayerId, ShipId } from "./ids.ts";
import type { PartialOreRecord } from "./types.ts";

export type ShipKind =
  | "scout"
  | "assaultCraft"
  | "combatEagle"
  | "fleetBattleship"
  | "destructor"
  | "commandCruiser";

export interface ShipClassDef {
  readonly kind: ShipKind;
  readonly label: string;
  readonly hullHp: number;
  readonly shieldHp: number;
  readonly speed: number;
  readonly hardpoints: number;
  readonly cargoCap: number;
  readonly fuelRange: number;
  readonly costCredits: number;
  readonly buildTimeTicks: number;
  readonly blueprintRequired?: BlueprintId;
}

export type ShipOrder =
  | { kind: "idle" }
  | { kind: "moveTo"; target: { x: number; y: number } }
  | { kind: "attackAsteroid"; target: AsteroidId }
  | { kind: "defend"; target: AsteroidId }
  | { kind: "scout"; target: { x: number; y: number } }
  | { kind: "trade"; target: AsteroidId; payload: PartialOreRecord<number> };

export interface Ship {
  readonly id: ShipId;
  readonly defKind: ShipKind;
  readonly ownerId: PlayerId;
  hullHp: number;
  shieldHp: number;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  order: ShipOrder;
  cargo: PartialOreRecord<number>;
}
