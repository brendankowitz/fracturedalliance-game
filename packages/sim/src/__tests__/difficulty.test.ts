import type { DifficultyLevel } from "@fa/domain";
import { describe, expect, it } from "vitest";
import { DIFFICULTY_PRESETS } from "../difficulty.ts";

const ORDERED: DifficultyLevel[] = ["intern", "manager", "director", "ceo", "board"];

describe("DIFFICULTY_PRESETS", () => {
  it("should have all 5 difficulty levels", () => {
    expect(Object.keys(DIFFICULTY_PRESETS)).toEqual(expect.arrayContaining(ORDERED));
    expect(Object.keys(DIFFICULTY_PRESETS)).toHaveLength(5);
  });

  it("humanStartCredits decreases as difficulty increases", () => {
    for (let i = 1; i < ORDERED.length; i++) {
      expect(DIFFICULTY_PRESETS[ORDERED[i]!].humanStartCredits).toBeLessThan(
        DIFFICULTY_PRESETS[ORDERED[i - 1]!].humanStartCredits,
      );
    }
  });

  it("aiCreditMultiplier increases as difficulty increases", () => {
    for (let i = 1; i < ORDERED.length; i++) {
      expect(DIFFICULTY_PRESETS[ORDERED[i]!].aiCreditMultiplier).toBeGreaterThan(
        DIFFICULTY_PRESETS[ORDERED[i - 1]!].aiCreditMultiplier,
      );
    }
  });

  it("traderGenerosity decreases as difficulty increases", () => {
    for (let i = 1; i < ORDERED.length; i++) {
      expect(DIFFICULTY_PRESETS[ORDERED[i]!].traderGenerosity).toBeLessThan(
        DIFFICULTY_PRESETS[ORDERED[i - 1]!].traderGenerosity,
      );
    }
  });

  it("federationGracePeriod decreases as difficulty increases", () => {
    for (let i = 1; i < ORDERED.length; i++) {
      expect(DIFFICULTY_PRESETS[ORDERED[i]!].federationGracePeriod).toBeLessThan(
        DIFFICULTY_PRESETS[ORDERED[i - 1]!].federationGracePeriod,
      );
    }
  });

  it("maunaActive is false for intern/manager/director and true for ceo/board", () => {
    expect(DIFFICULTY_PRESETS.intern.maunaActive).toBe(false);
    expect(DIFFICULTY_PRESETS.manager.maunaActive).toBe(false);
    expect(DIFFICULTY_PRESETS.director.maunaActive).toBe(false);
    expect(DIFFICULTY_PRESETS.ceo.maunaActive).toBe(true);
    expect(DIFFICULTY_PRESETS.board.maunaActive).toBe(true);
  });
});
