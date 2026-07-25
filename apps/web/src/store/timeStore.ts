import { create } from "zustand";

/**
 * Speed presets multiply how many fixed sim steps the render loop consumes per real second.
 * Pause is not a preset — it lives in `uiStore.paused`, which the loop already honours, so
 * unpausing restores the speed the player last chose.
 */
export const SPEED_PRESETS = [1, 2, 4, 8] as const;

export type SpeedPreset = (typeof SPEED_PRESETS)[number];

interface TimeState {
  timeScale: SpeedPreset;
  setTimeScale: (scale: SpeedPreset) => void;
  stepTimeScale: (direction: 1 | -1) => void;
}

export const useTimeStore = create<TimeState>((set) => ({
  timeScale: 1,
  setTimeScale: (scale) => set({ timeScale: scale }),
  stepTimeScale: (direction) =>
    set((s) => {
      const next = SPEED_PRESETS.indexOf(s.timeScale) + direction;
      const clamped = Math.max(0, Math.min(SPEED_PRESETS.length - 1, next));
      return { timeScale: SPEED_PRESETS[clamped] ?? s.timeScale };
    }),
}));
