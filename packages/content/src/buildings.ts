import type { BuildingDef } from "@fa/domain";
import { ALL_ORES } from "@fa/domain";
import rawBuildings from "../data/buildings.json" with { type: "json" };

type JsonBuilding = (typeof rawBuildings)[number];

function validateBuilding(raw: JsonBuilding): BuildingDef {
  const requiredFields = [
    "kind",
    "label",
    "costCredits",
    "buildTimeTicks",
    "powerDelta",
    "popCapDelta",
    "foodDelta",
    "waterDelta",
    "airDelta",
  ] as const;

  for (const field of requiredFields) {
    if (raw[field] === undefined) {
      throw new Error(`Building "${raw.kind}" is missing required field: "${field}"`);
    }
  }

  if (raw.oreProduction) {
    const validOres = new Set<string>(ALL_ORES);
    for (const key of Object.keys(raw.oreProduction)) {
      if (!validOres.has(key)) {
        throw new Error(`Building "${raw.kind}" has invalid ore kind in oreProduction: "${key}"`);
      }
    }
  }

  return raw as unknown as BuildingDef;
}

const allDefs: BuildingDef[] = rawBuildings.map(validateBuilding);

const index = new Map<string, BuildingDef>(allDefs.map((b) => [b.kind, b]));

export function getBuildingDef(kind: string): BuildingDef {
  const def = index.get(kind);
  if (!def) throw new Error(`Unknown building kind: "${kind}"`);
  return def;
}

export function getAllBuildingDefs(): ReadonlyArray<BuildingDef> {
  return allDefs;
}
