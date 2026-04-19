import type { OreKind } from "@fa/domain";
import rawOres from "../data/ores.json" with { type: "json" };

export interface OreDef {
  readonly kind: OreKind;
  readonly label: string;
  readonly basePrice: number;
  readonly depth: "surface" | "mid" | "deep" | "seismic";
}

type JsonOre = (typeof rawOres)[number];

function validateOre(raw: JsonOre): OreDef {
  return raw as unknown as OreDef;
}

const allOreDefs: OreDef[] = rawOres.map(validateOre);
const oreIndex = new Map<string, OreDef>(allOreDefs.map((o) => [o.kind, o]));

export function getOreDef(kind: string): OreDef | undefined {
  return oreIndex.get(kind);
}

export function getAllOreDefs(): ReadonlyArray<OreDef> {
  return allOreDefs;
}
