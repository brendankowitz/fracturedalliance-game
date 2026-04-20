import { describe, expect, it, beforeEach, vi } from "vitest";
import { useAchievementStore, ACHIEVEMENTS } from "../store/achievementStore";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

describe("achievementStore", () => {
  beforeEach(() => {
    localStorageMock.clear();
    useAchievementStore.setState({ unlocked: new Set() });
  });

  it("has 12 achievements defined", () => {
    expect(ACHIEVEMENTS).toHaveLength(12);
  });

  it("starts with empty unlocked set", () => {
    expect(useAchievementStore.getState().unlocked.size).toBe(0);
  });

  it("unlock adds achievement", () => {
    useAchievementStore.getState().unlock("first_building");
    expect(useAchievementStore.getState().unlocked.has("first_building")).toBe(true);
  });

  it("isUnlocked returns correct values", () => {
    expect(useAchievementStore.getState().isUnlocked("first_building")).toBe(false);
    useAchievementStore.getState().unlock("first_building");
    expect(useAchievementStore.getState().isUnlocked("first_building")).toBe(true);
  });

  it("unlock is idempotent", () => {
    useAchievementStore.getState().unlock("first_win");
    useAchievementStore.getState().unlock("first_win");
    expect(useAchievementStore.getState().unlocked.size).toBe(1);
  });

  it("persists to localStorage on unlock", () => {
    useAchievementStore.getState().unlock("first_win");
    const stored = JSON.parse(localStorageMock.getItem("fa-achievements") ?? "[]") as string[];
    expect(stored).toContain("first_win");
  });
});
