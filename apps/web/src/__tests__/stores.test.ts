import type { HudSnapshot } from "@fa/sim";
import { describe, expect, it } from "vitest";
import { useGameStore } from "../store/gameStore.ts";

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
