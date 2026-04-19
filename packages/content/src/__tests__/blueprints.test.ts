import { describe, expect, it } from "vitest";
import {
  findBlueprintDef,
  getAllBlueprintDefs,
  getBlueprintDef,
  getBlueprintsByDiscipline,
} from "../blueprints.ts";

describe("blueprint loader", () => {
  it("loads exactly 40 blueprints", () => {
    expect(getAllBlueprintDefs()).toHaveLength(40);
  });

  it("all ids are unique", () => {
    const ids = getAllBlueprintDefs().map((b) => b.id);
    expect(new Set(ids).size).toBe(40);
  });

  it("each discipline has exactly 8 blueprints", () => {
    const disciplines = ["mining", "infrastructure", "military", "science", "commerce"] as const;
    for (const d of disciplines) {
      expect(getBlueprintsByDiscipline(d)).toHaveLength(8);
    }
  });

  it("tiers within each discipline are 1-8 exactly once", () => {
    const disciplines = ["mining", "infrastructure", "military", "science", "commerce"] as const;
    for (const d of disciplines) {
      const tiers = getBlueprintsByDiscipline(d).map((b) => b.tier);
      expect(tiers).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    }
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
