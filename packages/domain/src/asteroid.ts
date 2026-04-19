import type { AsteroidId, BuildingId, PlayerId, ShipId } from "./ids.ts";
import type { OreRecord, SizeClass } from "./types.ts";

export interface BuildQueueItem {
  buildingKind: string;
  progressTicks: number;
  totalTicks: number;
  cell: { x: number; y: number };
}

export interface AsteroidEngineState {
  count: number;
  destinationId: AsteroidId | null;
  etaTick: number | null;
  chargeTick: number | null;
}

export interface Asteroid {
  readonly id: AsteroidId;
  name: string;
  ownerId: PlayerId | null;
  sector: { readonly x: number; readonly y: number };
  sizeClass: SizeClass;
  readonly deposits: Partial<OreRecord<number>>;
  radiation: number;
  stability: number;
  happiness: number;
  buildings: BuildingId[];
  buildQueue: BuildQueueItem[];
  inOrbit: ReadonlyArray<ShipId>;
  engines: AsteroidEngineState;
}
