import { create } from "zustand";

export type KeybindAction =
  | "pause"
  | "speedUp"
  | "speedDown"
  | "openEspionage"
  | "openDiplomacy"
  | "openTrade"
  | "openBlueprints"
  | "openBlackMarket"
  | "openAlerts";

export const DEFAULT_KEYBINDS: Record<KeybindAction, string> = {
  pause: " ",
  speedUp: "+",
  speedDown: "-",
  openEspionage: "e",
  openDiplomacy: "d",
  openTrade: "t",
  openBlueprints: "r",
  openBlackMarket: "m",
  openAlerts: "a",
};

interface KeybindState {
  keybinds: Record<KeybindAction, string>;
  setKeybind: (action: KeybindAction, key: string) => void;
  resetKeybinds: () => void;
}

export const useKeybindStore = create<KeybindState>((set) => ({
  keybinds: { ...DEFAULT_KEYBINDS },
  setKeybind: (action, key) => set((s) => ({ keybinds: { ...s.keybinds, [action]: key } })),
  resetKeybinds: () => set({ keybinds: { ...DEFAULT_KEYBINDS } }),
}));
