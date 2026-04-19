import { describe, expect, it } from "vitest";
import { getAllAgentDefs } from "../agents.ts";

describe("agent loader", () => {
  it("loads exactly 20 agents", () => {
    expect(getAllAgentDefs()).toHaveLength(20);
  });

  it("all stealth values are in [1, 100]", () => {
    for (const def of getAllAgentDefs()) {
      expect(def.stealth).toBeGreaterThanOrEqual(1);
      expect(def.stealth).toBeLessThanOrEqual(100);
    }
  });

  it("all ids are unique", () => {
    const ids = getAllAgentDefs().map((d) => d.id);
    expect(new Set(ids).size).toBe(20);
  });
});
