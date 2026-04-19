import { describe, expect, it } from "vitest";
import { getAllBuildingDefs, getBuildingDef } from "../buildings.ts";

describe("building definitions", () => {
  it("loads all buildings including Phase 1 catalogue", () => {
    const defs = getAllBuildingDefs();
    expect(defs.length).toBeGreaterThanOrEqual(18);
  });

  it("getBuildingDef returns the correct definition for mineMk1", () => {
    const def = getBuildingDef("mineMk1");
    expect(def.kind).toBe("mineMk1");
    expect(def.costCredits).toBe(500);
    expect(def.buildTimeTicks).toBe(80);
    expect(def.powerDelta).toBe(-2);
  });

  it("throws with informative message for unknown building kind", () => {
    expect(() => getBuildingDef("unicorn")).toThrow('Unknown building kind: "unicorn"');
  });

  it("every building has all required fields", () => {
    for (const def of getAllBuildingDefs()) {
      expect(typeof def.kind).toBe("string");
      expect(typeof def.costCredits).toBe("number");
      expect(typeof def.buildTimeTicks).toBe("number");
      expect(typeof def.powerDelta).toBe("number");
      expect(typeof def.popCapDelta).toBe("number");
      expect(typeof def.foodDelta).toBe("number");
      expect(typeof def.waterDelta).toBe("number");
      expect(typeof def.airDelta).toBe("number");
    }
  });

  it("cpu building has unique flag set", () => {
    const cpu = getBuildingDef("cpu");
    expect(cpu.unique).toBe(true);
  });

  it("mineMk1 has valid oreProduction for selenium and asteros", () => {
    const mine = getBuildingDef("mineMk1");
    expect(mine.oreProduction?.selenium).toBe(1);
    expect(mine.oreProduction?.asteros).toBe(0.5);
  });
});
