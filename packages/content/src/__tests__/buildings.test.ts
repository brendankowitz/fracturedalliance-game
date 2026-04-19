import { describe, expect, it } from "vitest";
import { getAllBuildingDefs, getBuildingDef } from "../buildings.ts";

describe("building definitions", () => {
  it("loads all buildings without error", () => {
    const defs = getAllBuildingDefs();
    expect(defs.length).toBeGreaterThan(0);
  });

  it("getBuildingDef returns the correct definition", () => {
    const def = getBuildingDef("mineMk1");
    expect(def.kind).toBe("mineMk1");
    expect(def.costCredits).toBe(500);
  });

  it("throws for unknown building kind", () => {
    expect(() => getBuildingDef("unicorn")).toThrow();
  });

  it("every building has required fields", () => {
    for (const def of getAllBuildingDefs()) {
      expect(typeof def.kind).toBe("string");
      expect(typeof def.costCredits).toBe("number");
      expect(typeof def.buildTimeTicks).toBe("number");
      expect(typeof def.powerDelta).toBe("number");
    }
  });

  it("cpu building has unique flag set", () => {
    const cpu = getBuildingDef("cpu");
    expect(cpu.unique).toBe(true);
  });

  it("mineMk1 has oreProduction for selenium", () => {
    const mine = getBuildingDef("mineMk1");
    expect(mine.oreProduction?.selenium).toBe(1);
  });
});
