import { getAllRaceDefs } from "@fa/content";
import { describe, expect, it } from "vitest";
import { getSellPrice } from "../systems/economySystem.ts";

describe("Race demand modifiers", () => {
  it("all races have demandModifiers field", () => {
    for (const race of getAllRaceDefs()) {
      expect(race.demandModifiers).toBeDefined();
    }
  });

  it("motkaj pays 1.3x for korellium", () => {
    const races = getAllRaceDefs();
    const motkaj = races.find((r) => r.id.toLowerCase().includes("motkaj"));
    expect(motkaj?.demandModifiers?.korellium).toBe(1.3);
  });

  it("achar pays 0.8x for quazinc", () => {
    const races = getAllRaceDefs();
    const achar = races.find((r) => r.id.toLowerCase().includes("achar"));
    expect(achar?.demandModifiers?.quazinc).toBe(0.8);
  });

  it("getSellPrice applies race modifier", () => {
    const races = getAllRaceDefs();
    const motkaj = races.find((r) => r.id.toLowerCase().includes("motkaj"))!;
    const basePrice = 650;
    const price = getSellPrice("korellium", basePrice, motkaj.id);
    expect(price).toBeCloseTo(845); // 650 * 1.3
  });

  it("getSellPrice applies modifier for helionCorp selenium", () => {
    const price = getSellPrice("selenium", 100, "helionCorp");
    // helionCorp has selenium modifier 1.2 in their demandModifiers
    expect(price).toBeCloseTo(120);
  });
});
