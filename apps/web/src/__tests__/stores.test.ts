import type { AsteroidId } from "@fa/domain";
import { describe, expect, it } from "vitest";
import { useGameStore } from "../store/gameStore.ts";
import { useUiStore } from "../store/uiStore.ts";
import { makeTestSnapshot } from "./testSnapshot.ts";

describe("gameStore", () => {
  it("starts with null snapshot", () => {
    const store = useGameStore.getState();
    expect(store.snapshot).toBeNull();
  });

  it("setSnapshot updates the store", () => {
    const mockSnap = makeTestSnapshot({
      tick: 5,
      credits: 9000,
      federationStanding: 50,
      humanPlayerId: "player-human",
    });
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
    expect(useUiStore.getState().buildTemplates.Test).toEqual(["airProcessor", "mineMk1"]);
  });

  it("deletes a template", () => {
    useUiStore.getState().saveBuildTemplate("ToDelete", ["airProcessor"]);
    useUiStore.getState().deleteBuildTemplate("ToDelete");
    expect(useUiStore.getState().buildTemplates.ToDelete).toBeUndefined();
  });
});

describe("uiStore autoHire", () => {
  it("sets auto-hire budget for an asteroid", () => {
    useUiStore.getState().setAutoHireBudget("ast1", 5000);
    expect(useUiStore.getState().autoHireBudgets.ast1).toBe(5000);
  });
  it("defaults to empty", () => {
    expect(useUiStore.getState().autoHireBudgets.nonexistent).toBeUndefined();
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

describe("uiStore panel exclusivity", () => {
  // Reset every panel to closed before each test so ordering across the file
  // (and across describe blocks) can't leak state into these assertions.
  function closeAllPanels() {
    const s = useUiStore.getState();
    if (s.tradePanelOpen) s.toggleTradePanel();
    if (s.blackMarketOpen) s.toggleBlackMarket();
    if (s.blueprintShopOpen) s.toggleBlueprintShop();
    if (s.espionagePanelOpen) s.toggleEspionagePanel();
    if (s.notificationFeedOpen) s.toggleNotificationFeed();
    if (s.diplomacyPanelOpen) s.toggleDiplomacyPanel();
    if (s.selectedAsteroidId !== null) s.selectAsteroid(null);
  }

  it("opening a right panel closes the other right panels", () => {
    closeAllPanels();
    useUiStore.getState().toggleBlackMarket();
    useUiStore.getState().toggleTradePanel();

    const s = useUiStore.getState();
    expect(s.tradePanelOpen).toBe(true);
    expect(s.blackMarketOpen).toBe(false);
    expect(s.blueprintShopOpen).toBe(false);
    expect(s.espionagePanelOpen).toBe(false);
    expect(s.notificationFeedOpen).toBe(false);
  });

  it("opening a right panel deselects the colony surface view", () => {
    closeAllPanels();
    useUiStore.getState().selectAsteroid("asteroid-1" as AsteroidId);
    expect(useUiStore.getState().selectedAsteroidId).toBe("asteroid-1");

    useUiStore.getState().toggleBlueprintShop();

    expect(useUiStore.getState().blueprintShopOpen).toBe(true);
    expect(useUiStore.getState().selectedAsteroidId).toBeNull();
  });

  it("selecting an asteroid closes any open right panel", () => {
    closeAllPanels();
    useUiStore.getState().toggleEspionagePanel();
    expect(useUiStore.getState().espionagePanelOpen).toBe(true);

    useUiStore.getState().selectAsteroid("asteroid-2" as AsteroidId);

    expect(useUiStore.getState().selectedAsteroidId).toBe("asteroid-2");
    expect(useUiStore.getState().espionagePanelOpen).toBe(false);
  });

  it("deselecting the asteroid (id null) does not disturb right panel state", () => {
    closeAllPanels();
    useUiStore.getState().toggleTradePanel();
    useUiStore.getState().selectAsteroid(null);
    expect(useUiStore.getState().tradePanelOpen).toBe(true);
  });

  it("closing an open right panel is independent — it doesn't reopen others", () => {
    closeAllPanels();
    useUiStore.getState().toggleTradePanel();
    useUiStore.getState().toggleTradePanel();

    const s = useUiStore.getState();
    expect(s.tradePanelOpen).toBe(false);
    expect(s.blackMarketOpen).toBe(false);
    expect(s.blueprintShopOpen).toBe(false);
    expect(s.espionagePanelOpen).toBe(false);
    expect(s.notificationFeedOpen).toBe(false);
  });

  it("left-side and right-side panels are independent of each other", () => {
    closeAllPanels();
    useUiStore.getState().toggleDiplomacyPanel();
    useUiStore.getState().toggleTradePanel();

    const s = useUiStore.getState();
    expect(s.diplomacyPanelOpen).toBe(true);
    expect(s.tradePanelOpen).toBe(true);
  });

  it("remembers the last selected asteroid after a right panel closes it", () => {
    closeAllPanels();
    useUiStore.getState().selectAsteroid("asteroid-3" as AsteroidId);
    useUiStore.getState().toggleTradePanel();

    expect(useUiStore.getState().selectedAsteroidId).toBeNull();
    expect(useUiStore.getState().lastSelectedAsteroidId).toBe("asteroid-3");
  });
});

describe("uiStore slowSimMode", () => {
  it("defaults to false", () => {
    expect(useUiStore.getState().slowSimMode).toBe(false);
  });
  it("toggles", () => {
    useUiStore.getState().toggleSlowSimMode();
    expect(useUiStore.getState().slowSimMode).toBe(true);
  });
  it("triggerEndTurn sets pendingEndTurn", () => {
    useUiStore.getState().triggerEndTurn();
    expect(useUiStore.getState().pendingEndTurn).toBe(true);
    useUiStore.getState().consumeEndTurn();
    expect(useUiStore.getState().pendingEndTurn).toBe(false);
  });
});
