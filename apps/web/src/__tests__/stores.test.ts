import type { HudSnapshot } from "@fa/sim";
import { describe, expect, it } from "vitest";
import { useGameStore } from "../store/gameStore.ts";

describe("gameStore", () => {
  it("starts with null snapshot", () => {
    const store = useGameStore.getState();
    expect(store.snapshot).toBeNull();
  });

  it("setSnapshot updates the store", () => {
    const mockSnap = {
      tick: 5,
      credits: 9000,
      federationStanding: 50,
      humanPlayerId: "player-human",
      players: [],
      asteroids: [],
      events: [],
    };
    useGameStore.getState().setSnapshot(mockSnap as HudSnapshot);
    expect(useGameStore.getState().snapshot?.tick).toBe(5);
  });
});
