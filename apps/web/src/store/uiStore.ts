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
      selectedAsteroidId: id,
      lastSelectedAsteroidId: id ?? s.lastSelectedAsteroidId,
    })),
  selectCell: (cell) => set({ selectedCell: cell }),
  toggleBuildingPanel: () => set((s) => ({ buildingPanelOpen: !s.buildingPanelOpen })),
  toggleSaveLoadPanel: () => set((s) => ({ saveLoadPanelOpen: !s.saveLoadPanelOpen })),
  toggleDiplomacyPanel: () => set((s) => ({ diplomacyPanelOpen: !s.diplomacyPanelOpen })),
  toggleBlueprintShop: () => set((s) => ({ blueprintShopOpen: !s.blueprintShopOpen })),
  toggleEspionagePanel: () => set((s) => ({ espionagePanelOpen: !s.espionagePanelOpen })),
  toggleBlackMarket: () => set((s) => ({ blackMarketOpen: !s.blackMarketOpen })),
  toggleTradePanel: () => set((s) => ({ tradePanelOpen: !s.tradePanelOpen })),
  setPaused: (v) => set({ paused: v }),
  toggleNotificationFeed: () => set((s) => ({ notificationFeedOpen: !s.notificationFeedOpen })),
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
  unlockScenario: (id) => set((s) => ({ unlockedScenarios: new Set([...s.unlockedScenarios, id]) })),
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
