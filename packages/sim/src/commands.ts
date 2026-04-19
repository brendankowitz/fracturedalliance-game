import type { AsteroidId, ShipId } from "@fa/domain";
import type { ShipOrder } from "@fa/domain";

export type Command =
  | { kind: "placeBuilding"; asteroidId: AsteroidId; buildingKind: string; cell: { x: number; y: number } }
  | { kind: "cancelBuildQueue"; asteroidId: AsteroidId; index: number }
  | { kind: "launchShip"; asteroidId: AsteroidId; shipKind: string }
  | { kind: "orderShip"; shipId: ShipId; order: ShipOrder };
