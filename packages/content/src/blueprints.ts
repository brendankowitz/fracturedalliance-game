import type { BlueprintDef, BlueprintDiscipline } from "@fa/domain";
import { blueprintId } from "@fa/domain";
import rawBlueprints from "../data/blueprints.json" with { type: "json" };

const VALID_DISCIPLINES = new Set<string>([
  "mining",
  "infrastructure",
  "military",
  "science",
  "commerce",
]);

function validateBlueprint(raw: (typeof rawBlueprints)[number]): BlueprintDef {
  if (!VALID_DISCIPLINES.has(raw.discipline)) {
    throw new Error(`Blueprint "${raw.id}" has invalid discipline: "${raw.discipline}"`);
  }
  if (raw.tier < 1 || raw.tier > 8) {
    throw new Error(`Blueprint "${raw.id}" has invalid tier: ${raw.tier}`);
  }
  return {
    id: blueprintId(raw.id),
    label: raw.label,
    description: raw.description,
    discipline: raw.discipline as BlueprintDiscipline,
    tier: raw.tier,
    costCredits: raw.costCredits,
    prerequisiteId: raw.prerequisiteId !== null ? blueprintId(raw.prerequisiteId) : null,
  };
}

const allDefs: BlueprintDef[] = rawBlueprints.map(validateBlueprint);
const index = new Map<string, BlueprintDef>(allDefs.map((b) => [b.id, b]));

export function getAllBlueprintDefs(): ReadonlyArray<BlueprintDef> {
  return allDefs;
}

export function getBlueprintDef(id: string): BlueprintDef {
  const def = index.get(id);
  if (!def) throw new Error(`Unknown blueprint id: "${id}"`);
  return def;
}

export function findBlueprintDef(id: string): BlueprintDef | undefined {
  return index.get(id);
}

export function getBlueprintsByDiscipline(
  discipline: BlueprintDiscipline,
): ReadonlyArray<BlueprintDef> {
  return allDefs.filter((b) => b.discipline === discipline).sort((a, b) => a.tier - b.tier);
}
