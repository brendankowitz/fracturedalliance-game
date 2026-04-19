import type { OreKind } from "@fa/domain";
import rawOres from "../data/ores.json" with { type: "json" };

export interface OreDef {
  readonly kind: OreKind;
  readonly label: string;
  readonly basePrice: number;
  readonly depth: "surface" | "mid" | "deep" | "seismic";
}

type JsonOre = (typeof rawOres)[number];

const VALID_DEPTHS = new Set<string>(["surface", "mid", "deep", "seismic"]);

function validateOre(raw: JsonOre): OreDef {
  if (!raw.kind || typeof raw.kind !== "string") {
    throw new Error(`Ore entry is missing "kind"`);
  }
  if (!raw.label || typeof raw.label !== "string") {
    throw new Error(`Ore "${raw.kind}" is missing "label"`);
  }
  if (typeof raw.basePrice !== "number" || raw.basePrice <= 0) {
    throw new Error(`Ore "${raw.kind}" has invalid "basePrice": ${raw.basePrice}`);
  }
  if (!VALID_DEPTHS.has(raw.depth)) {
    throw new Error(`Ore "${raw.kind}" has invalid "depth": "${raw.depth}"`);
  }
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

export const PHASE1_ORES: ReadonlyArray<OreKind> = ["selenium", "asteros", "barium", "crystalite"];
