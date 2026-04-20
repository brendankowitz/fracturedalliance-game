import { create } from "zustand";

export type KeybindAction =
  | "pause"
  | "openEspionage"
  | "openDiplomacy"
  | "openTrade"
  | "openBlueprints"
  | "openBlackMarket"
  | "openAlerts";

export const DEFAULT_KEYBINDS: Record<KeybindAction, string> = {
  pause: " ",
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
  hasDuplicate: (action: KeybindAction) => boolean;
}

export const useKeybindStore = create<KeybindState>((set, get) => ({
  keybinds: { ...DEFAULT_KEYBINDS },
  setKeybind: (action, key) =>
    set((s) => ({ keybinds: { ...s.keybinds, [action]: key } })),
  resetKeybinds: () => set({ keybinds: { ...DEFAULT_KEYBINDS } }),
  hasDuplicate: (action) => {
    const { keybinds } = get();
    const val = keybinds[action];
    return Object.entries(keybinds).filter(([k, v]) => v === val && k !== action).length > 0;
  },
}));
