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

describe("uiStore showHelp", () => {
  it("defaults to false", () => {
    expect(useUiStore.getState().showHelp).toBe(false);
  });
  it("toggles", () => {
    useUiStore.getState().toggleHelp();
    expect(useUiStore.getState().showHelp).toBe(true);
    useUiStore.getState().toggleHelp();
    expect(useUiStore.getState().showHelp).toBe(false);
  });
});

describe("uiStore buildTemplates", () => {
  it("has default templates", () => {
    const { buildTemplates } = useUiStore.getState();
    expect(buildTemplates["Standard Mining Colony"]).toBeDefined();
    expect(buildTemplates["Forward Fortress"]).toBeDefined();
  });

  it("saves and retrieves a template", () => {
    useUiStore.getState().saveBuildTemplate("Test", ["airProcessor", "mineMk1"]);
    expect(useUiStore.getState().buildTemplates["Test"]).toEqual(["airProcessor", "mineMk1"]);
  });

  it("deletes a template", () => {
    useUiStore.getState().saveBuildTemplate("ToDelete", ["airProcessor"]);
    useUiStore.getState().deleteBuildTemplate("ToDelete");
    expect(useUiStore.getState().buildTemplates["ToDelete"]).toBeUndefined();
  });
});

describe("uiStore autoHire", () => {
  it("sets auto-hire budget for an asteroid", () => {
    useUiStore.getState().setAutoHireBudget("ast1", 5000);
    expect(useUiStore.getState().autoHireBudgets["ast1"]).toBe(5000);
  });
  it("defaults to empty", () => {
    expect(useUiStore.getState().autoHireBudgets["nonexistent"]).toBeUndefined();
  });
});

describe("uiStore pauseOnPriority", () => {
  it("defaults red=true amber=false", () => {
    const { pauseOnPriority } = useUiStore.getState();
    expect(pauseOnPriority.red).toBe(true);
    expect(pauseOnPriority.amber).toBe(false);
  });
  it("sets amber to true", () => {
    useUiStore.getState().setPauseOnPriority("amber", true);
    expect(useUiStore.getState().pauseOnPriority.amber).toBe(true);
  });
});
