import type { HudSnapshot } from "@fa/sim";
import { describe, expect, it } from "vitest";
import { useGameStore } from "../store/gameStore.ts";
import { useUiStore } from "../store/uiStore.ts";

describe("gameStore", () => {
  it("starts with null snapshot", () => {
    const store = useGameStore.getState();
    expect(store.snapshot).toBeNull();
  });

  it("setSnapshot updates the store", () => {
    const mockSnap: HudSnapshot = {
      tick: 5,
      credits: 9000,
      federationStanding: 50,
      suspicion: 0,
      humanPlayerId: "player-human",
      traderActive: false,
      oreInventory: {},
      players: [],
      asteroids: [],
      ships: [],
      events: [],
      marketPrices: {},
      combatFlashes: [],
      diplomacy: [],
      gameEndState: null,
      blueprintsOwned: [],
      agents: [],
    };
    useGameStore.getState().setSnapshot(mockSnap);
    expect(useGameStore.getState().snapshot?.tick).toBe(5);
  });
});

describe("uiStore difficulty", () => {
  it("defaults to manager difficulty", () => {
    expect(useUiStore.getState().selectedDifficulty).toBe("manager");
  });
  it("sets difficulty", () => {
    useUiStore.getState().setDifficulty("director");
    expect(useUiStore.getState().selectedDifficulty).toBe("director");
  });
});
