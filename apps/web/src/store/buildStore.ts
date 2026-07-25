import { create } from "zustand";

/**
 * The building the player has picked but not yet placed.
 *
 * It lives in a store rather than inside the surface view because the console's build
 * palette and the surface are siblings on screen: the palette arms a kind, the surface
 * previews and places it. Prop-plumbing that between them would mean threading state
 * through the shared HUD, which several people are editing at once.
 */
interface BuildState {
  armedKind: string | null;
  armKind: (kind: string | null) => void;
}

export const useBuildStore = create<BuildState>((set) => ({
  armedKind: null,
  armKind: (kind) => {
    set({ armedKind: kind });
  },
}));
