import { describe, expect, it } from "vitest";
import { getAllRaceDefs, getRaceDef } from "../races.ts";

describe("races", () => {
  it("loads all 7 races", () => {
    expect(getAllRaceDefs().length).toBe(7);
  });

  it("finds Kryll Collective by id", () => {
    const kryll = getRaceDef("kryllCollective");
    expect(kryll).toBeDefined();
    expect(kryll?.name).toBe("Kryll Collective");
  });

  it("Kryll personality has high aggression", () => {
    const kryll = getRaceDef("kryllCollective");
    expect(kryll?.personality.aggression).toBeGreaterThan(0.5);
  });
});
