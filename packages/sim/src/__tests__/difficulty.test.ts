import { describe, it, expect } from "vitest";
import { DIFFICULTY_PRESETS } from "../difficulty.ts";

describe("DIFFICULTY_PRESETS", () => {
  it("should have intern/manager/director/ceo/board levels", () => {
    const levels = Object.keys(DIFFICULTY_PRESETS);
    expect(levels).toContain("intern");
    expect(levels).toContain("manager");
    expect(levels).toContain("director");
    expect(levels).toContain("ceo");
    expect(levels).toContain("board");
  });

  it("should have traderGenerosity field on each preset", () => {
    for (const preset of Object.values(DIFFICULTY_PRESETS)) {
      expect(typeof preset.traderGenerosity).toBe("number");
    }
  });

  it("should have federationGracePeriod field on each preset", () => {
    for (const preset of Object.values(DIFFICULTY_PRESETS)) {
      expect(typeof preset.federationGracePeriod).toBe("number");
    }
  });

  it("should have maunaActive field on each preset", () => {
    for (const preset of Object.values(DIFFICULTY_PRESETS)) {
      expect(typeof preset.maunaActive).toBe("boolean");
    }
  });

  it("board should be harder than ceo", () => {
    expect(DIFFICULTY_PRESETS.board.humanStartCredits).toBeLessThan(DIFFICULTY_PRESETS.ceo.humanStartCredits);
    expect(DIFFICULTY_PRESETS.board.aiCreditMultiplier).toBeGreaterThan(DIFFICULTY_PRESETS.ceo.aiCreditMultiplier);
  });

  it("maunaActive should be true only for ceo and board", () => {
    expect(DIFFICULTY_PRESETS.intern.maunaActive).toBe(false);
    expect(DIFFICULTY_PRESETS.manager.maunaActive).toBe(false);
    expect(DIFFICULTY_PRESETS.director.maunaActive).toBe(false);
    expect(DIFFICULTY_PRESETS.ceo.maunaActive).toBe(true);
    expect(DIFFICULTY_PRESETS.board.maunaActive).toBe(true);
  });
});
