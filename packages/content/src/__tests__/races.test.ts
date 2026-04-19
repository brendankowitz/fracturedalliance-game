import { describe, expect, it } from "vitest";
import { getAllRaceDefs, getRaceDef } from "../races.ts";

describe("races", () => {
  it("loads all 7 races", () => {
    expect(getAllRaceDefs().length).toBe(7);
  });

  it("all race ids are unique", () => {
    const ids = getAllRaceDefs().map((r) => r.id);
    expect(new Set(ids).size).toBe(7);
  });

  it("finds Kryll Collective by id", () => {
    const kryll = getRaceDef("kryllCollective");
    expect(kryll).toBeDefined();
    expect(kryll?.name).toBe("Kryll Collective");
  });

  it("all 10 personality fields are present and in [0, 1] for every race", () => {
    const fields = [
      "aggression",
      "grudgeDecayPerDay",
      "tradeBias",
      "techBias",
      "expansionBias",
      "treatyRespect",
      "ramWillingness",
      "blackMarketAffinity",
      "bribeReceptiveness",
      "grudgeThreshold",
    ] as const;
    for (const race of getAllRaceDefs()) {
      for (const field of fields) {
        const val = race.personality[field];
        expect(typeof val).toBe("number");
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      }
    }
  });

  it("Kryll personality has high aggression", () => {
    const kryll = getRaceDef("kryllCollective");
    expect(kryll?.personality.aggression).toBeGreaterThan(0.5);
  });

  it("Mauna is not a federation member", () => {
    const mauna = getRaceDef("mauna");
    expect(mauna?.federationMember).toBe(false);
  });

  it("Mauna has the highest blackMarketAffinity", () => {
    const mauna = getRaceDef("mauna");
    expect(mauna?.personality.blackMarketAffinity).toBeGreaterThanOrEqual(0.85);
  });

  it("helionCorp is a federation member", () => {
    expect(getRaceDef("helionCorp")?.federationMember).toBe(true);
  });

  it("getRaceDef returns undefined for unknown id", () => {
    expect(getRaceDef("unknown")).toBeUndefined();
  });

  it("non-federation races are: kryllCollective, motkaj, brakkat, mauna", () => {
    const nonFed = getAllRaceDefs()
      .filter((r) => !r.federationMember)
      .map((r) => r.id)
      .sort();
    expect(nonFed).toEqual(["brakkat", "kryllCollective", "mauna", "motkaj"]);
  });
});
