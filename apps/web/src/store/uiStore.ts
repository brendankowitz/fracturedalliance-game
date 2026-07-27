import type { AsteroidId } from "@fa/domain";
import type { DifficultyLevel } from "@fa/sim";
import { create } from "zustand";
import type { ColorPalette } from "../game/views/sectorView.ts";

interface UiState {
  selectedAsteroidId: AsteroidId | null;
  lastSelectedAsteroidId: AsteroidId | null;
  selectedCell: { x: number; y: number } | null;
  buildingPanelOpen: boolean;
  saveLoadPanelOpen: boolean;
  diplomacyPanelOpen: boolean;
  blueprintShopOpen: boolean;
  espionagePanelOpen: boolean;
  blackMarketOpen: boolean;
  tradePanelOpen: boolean;
  paused: boolean;
  notificationFeedOpen: boolean;
  colorPalette: ColorPalette;
  fontScale: number;
  selectedDifficulty: DifficultyLevel;
  buildTemplates: Record<string, string[]>;
  selectAsteroid: (id: AsteroidId | null) => void;
  selectCell: (cell: { x: number; y: number } | null) => void;
  toggleBuildingPanel: () => void;
  toggleSaveLoadPanel: () => void;
  toggleDiplomacyPanel: () => void;
  toggleBlueprintShop: () => void;
  toggleEspionagePanel: () => void;
  toggleBlackMarket: () => void;
  toggleTradePanel: () => void;
  setPaused: (v: boolean) => void;
  toggleNotificationFeed: () => void;
  setColorPalette: (p: ColorPalette) => void;
  setFontScale: (v: number) => void;
  setDifficulty: (d: DifficultyLevel) => void;
  saveBuildTemplate: (name: string, buildings: string[]) => void;
  deleteBuildTemplate: (name: string) => void;
  ecoMode: boolean;
  toggleEcoMode: () => void;
  showHelp: boolean;
  toggleHelp: () => void;
  unlockedScenarios: Set<string>;
  unlockScenario: (id: string) => void;
  autoHireBudgets: Record<string, number>;
  setAutoHireBudget: (asteroidId: string, budget: number) => void;
  pauseOnPriority: { red: boolean; amber: boolean };
  setPauseOnPriority: (priority: "red" | "amber", enabled: boolean) => void;
  slowSimMode: boolean;
  toggleSlowSimMode: () => void;
  pendingEndTurn: boolean;
  triggerEndTurn: () => void;
  consumeEndTurn: () => void;
}

// Right-side panels share the same screen real estate (see BuildingPanel,
// TradePanel, BlackMarketPanel, BlueprintShop, EspionagePanel, NotificationFeed,
// and the colony/surface view driven by selectedAsteroidId). Opening one closes
// the rest so at most one is visible at a time. buildingPanelOpen is excluded:
// it is a drawer nested inside the surface view (it requires selectedAsteroidId
// to render at all), not a sibling panel.
const RIGHT_PANELS_CLOSED = {
  tradePanelOpen: false,
  blackMarketOpen: false,
  blueprintShopOpen: false,
  espionagePanelOpen: false,
  notificationFeedOpen: false,
} as const;

export const useUiStore = create<UiState>((set) => ({
  selectedAsteroidId: null,
  lastSelectedAsteroidId: null,
  selectedCell: null,
  buildingPanelOpen: false,
  saveLoadPanelOpen: false,
  diplomacyPanelOpen: false,
  blueprintShopOpen: false,
  espionagePanelOpen: false,
  blackMarketOpen: false,
  tradePanelOpen: false,
  paused: false,
  notificationFeedOpen: false,
  colorPalette: "normal",
  fontScale: 100,
  selectedDifficulty: "manager",
  buildTemplates: {
    "Standard Mining Colony": ["airProcessor", "waterPurifier", "mineMk1", "mineMk1", "mineMk1"],
    "Forward Fortress": ["airProcessor", "securityCentre", "securityCentre", "shipyard"],
  },
  selectAsteroid: (id) =>
    set((s) => ({
      ...(id !== null ? RIGHT_PANELS_CLOSED : {}),
      selectedAsteroidId: id,
      lastSelectedAsteroidId: id ?? s.lastSelectedAsteroidId,
    })),
  selectCell: (cell) => set({ selectedCell: cell }),
  toggleBuildingPanel: () => set((s) => ({ buildingPanelOpen: !s.buildingPanelOpen })),
  toggleSaveLoadPanel: () => set((s) => ({ saveLoadPanelOpen: !s.saveLoadPanelOpen })),
  toggleDiplomacyPanel: () => set((s) => ({ diplomacyPanelOpen: !s.diplomacyPanelOpen })),
  toggleBlueprintShop: () =>
    set((s) =>
      s.blueprintShopOpen
        ? { blueprintShopOpen: false }
        : { ...RIGHT_PANELS_CLOSED, blueprintShopOpen: true, selectedAsteroidId: null },
    ),
  toggleEspionagePanel: () =>
    set((s) =>
      s.espionagePanelOpen
        ? { espionagePanelOpen: false }
        : { ...RIGHT_PANELS_CLOSED, espionagePanelOpen: true, selectedAsteroidId: null },
    ),
  toggleBlackMarket: () =>
    set((s) =>
      s.blackMarketOpen
        ? { blackMarketOpen: false }
        : { ...RIGHT_PANELS_CLOSED, blackMarketOpen: true, selectedAsteroidId: null },
    ),
  toggleTradePanel: () =>
    set((s) =>
      s.tradePanelOpen
        ? { tradePanelOpen: false }
        : { ...RIGHT_PANELS_CLOSED, tradePanelOpen: true, selectedAsteroidId: null },
    ),
  setPaused: (v) => set({ paused: v }),
  toggleNotificationFeed: () =>
    set((s) =>
      s.notificationFeedOpen
        ? { notificationFeedOpen: false }
        : { ...RIGHT_PANELS_CLOSED, notificationFeedOpen: true, selectedAsteroidId: null },
    ),
  setColorPalette: (p) => set({ colorPalette: p }),
  setFontScale: (v) => set({ fontScale: v }),
  setDifficulty: (d) => set({ selectedDifficulty: d }),
  saveBuildTemplate: (name, buildings) =>
    set((s) => ({ buildTemplates: { ...s.buildTemplates, [name]: buildings } })),
  deleteBuildTemplate: (name) =>
    set((s) => {
      const next = { ...s.buildTemplates };
      delete next[name];
      return { buildTemplates: next };
    }),
  ecoMode: false,
  toggleEcoMode: () => set((s) => ({ ecoMode: !s.ecoMode })),
  showHelp: false,
  toggleHelp: () => set((s) => ({ showHelp: !s.showHelp })),
  unlockedScenarios: new Set<string>(),
  unlockScenario: (id) =>
    set((s) => ({ unlockedScenarios: new Set([...s.unlockedScenarios, id]) })),
  autoHireBudgets: {},
  setAutoHireBudget: (asteroidId, budget) =>
    set((s) => ({ autoHireBudgets: { ...s.autoHireBudgets, [asteroidId]: budget } })),
  pauseOnPriority: { red: true, amber: false },
  setPauseOnPriority: (priority, enabled) =>
    set((s) => ({ pauseOnPriority: { ...s.pauseOnPriority, [priority]: enabled } })),
  slowSimMode: false,
  toggleSlowSimMode: () => set((s) => ({ slowSimMode: !s.slowSimMode })),
  pendingEndTurn: false,
  triggerEndTurn: () => set({ pendingEndTurn: true }),
  consumeEndTurn: () => set({ pendingEndTurn: false }),
}));
