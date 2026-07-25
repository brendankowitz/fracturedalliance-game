import type { BlueprintDiscipline } from "@fa/domain";
import { describe, expect, it } from "vitest";
import {
  findBlueprintDef,
  getAllBlueprintDefs,
  getBlueprintDef,
  getBlueprintsByDiscipline,
} from "../blueprints.ts";

describe("blueprint loader", () => {
  it("loads exactly 44 blueprints", () => {
    expect(getAllBlueprintDefs()).toHaveLength(44);
  });

  it("all ids are unique", () => {
    const ids = getAllBlueprintDefs().map((b) => b.id);
    expect(new Set(ids).size).toBe(44);
  });

  it("each discipline has the correct number of blueprints", () => {
    const expectations: ReadonlyArray<readonly [BlueprintDiscipline, number]> = [
      ["mining", 8],
      ["infrastructure", 8],
      ["military", 12],
      ["science", 8],
      ["commerce", 8],
    ];
    for (const [discipline, count] of expectations) {
      expect(getBlueprintsByDiscipline(discipline)).toHaveLength(count);
    }
  });

  it("tiers within each discipline match expected structure", () => {
    const miningTiers = getBlueprintsByDiscipline("mining").map((b) => b.tier);
    expect(miningTiers).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);

    const militaryTiers = getBlueprintsByDiscipline("military").map((b) => b.tier);
    expect(militaryTiers).toEqual([1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 7, 8]);

    const scienceTiers = getBlueprintsByDiscipline("science").map((b) => b.tier);
    expect(scienceTiers).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);

    const commerceTiers = getBlueprintsByDiscipline("commerce").map((b) => b.tier);
    expect(commerceTiers).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);

    const infrastructureTiers = getBlueprintsByDiscipline("infrastructure").map((b) => b.tier);
    expect(infrastructureTiers).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("tier 1 blueprints have null prerequisiteId", () => {
    const t1s = getAllBlueprintDefs().filter((b) => b.tier === 1);
    for (const bp of t1s) {
      expect(bp.prerequisiteId).toBeNull();
    }
  });

  it("tier 2+ blueprints have a valid prerequisiteId from same discipline", () => {
    const allIds = new Set(getAllBlueprintDefs().map((b) => b.id));
    const higher = getAllBlueprintDefs().filter((b) => b.tier > 1);
    for (const bp of higher) {
      expect(bp.prerequisiteId).not.toBeNull();
      const prereqId = bp.prerequisiteId;
      if (prereqId === null) continue;
      expect(allIds.has(prereqId)).toBe(true);
      const prereq = getBlueprintDef(prereqId);
      expect(prereq.discipline).toBe(bp.discipline);
      expect(prereq.tier).toBe(bp.tier - 1);
    }
  });

  it("getBlueprintDef throws for unknown id", () => {
    expect(() => getBlueprintDef("blueprint.unknown")).toThrow();
  });

  it("findBlueprintDef returns undefined for unknown id", () => {
    expect(findBlueprintDef("blueprint.unknown")).toBeUndefined();
  });

  it("blueprint.mineMk2 exists with correct data", () => {
    const bp = getBlueprintDef("blueprint.mineMk2");
    expect(bp.label).toBe("Mine Mk2");
    expect(bp.discipline).toBe("mining");
    expect(bp.tier).toBe(1);
    expect(bp.costCredits).toBe(4000);
    expect(bp.prerequisiteId).toBeNull();
  });
});
