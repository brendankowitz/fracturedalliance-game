import type { BuildingDef } from "@fa/domain";
import rawBuildings from "../data/buildings.json" with { type: "json" };

const index = new Map<string, BuildingDef>((rawBuildings as BuildingDef[]).map((b) => [b.kind, b]));

export function getBuildingDef(kind: string): BuildingDef {
  const def = index.get(kind);
  if (!def) throw new Error(`Unknown building kind: "${kind}"`);
  return def;
}

export function getAllBuildingDefs(): ReadonlyArray<BuildingDef> {
  return rawBuildings as BuildingDef[];
}
