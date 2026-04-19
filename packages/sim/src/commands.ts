import type { AsteroidId } from "@fa/domain";

export type Command =
  | {
      kind: "placeBuilding";
      asteroidId: AsteroidId;
      buildingKind: string;
      cell: { x: number; y: number };
    }
  | {
      kind: "cancelBuildQueue";
      asteroidId: AsteroidId;
      index: number;
    };
