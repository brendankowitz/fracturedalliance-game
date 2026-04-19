import type { AsteroidId } from "@fa/domain";
import { create } from "zustand";

interface UiState {
  selectedAsteroidId: AsteroidId | null;
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
}

export const useUiStore = create<UiState>((set) => ({
  selectedAsteroidId: null,
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
  selectAsteroid: (id) => set({ selectedAsteroidId: id }),
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
}));
