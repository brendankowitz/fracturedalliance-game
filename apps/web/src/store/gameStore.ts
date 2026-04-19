import type { HudSnapshot } from "@fa/sim";
import { create } from "zustand";

interface GameState {
  snapshot: HudSnapshot | null;
  setSnapshot: (snapshot: HudSnapshot) => void;
  clearSnapshot: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  snapshot: null,
  setSnapshot: (snapshot) => set({ snapshot }),
  clearSnapshot: () => set({ snapshot: null }),
}));
