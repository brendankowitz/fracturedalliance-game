import { create } from "zustand";

export type HudTheme = "default" | "hacker" | "amber";

const THEME_STORAGE_KEY = "fa-hud-theme";
const REP_STORAGE_KEY = "fa-megacorp-rep";

function loadTheme(): HudTheme {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "hacker" || raw === "amber") return raw;
  } catch {
    // ignore
  }
  return "default";
}

function loadRep(): number {
  try {
    const raw = localStorage.getItem(REP_STORAGE_KEY);
    if (raw !== null) return Math.max(0, Math.min(100, Number(raw)));
  } catch {
    // ignore
  }
  return 50;
}

interface MegacorpState {
  hudTheme: HudTheme;
  setHudTheme: (t: HudTheme) => void;
  megacorpRep: number;
  addRep: (delta: number) => void;
}

export const useMegacorpStore = create<MegacorpState>((set, get) => ({
  hudTheme: loadTheme(),
  setHudTheme: (t) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
    set({ hudTheme: t });
  },
  megacorpRep: loadRep(),
  addRep: (delta) => {
    const next = Math.max(0, Math.min(100, get().megacorpRep + delta));
    try {
      localStorage.setItem(REP_STORAGE_KEY, String(next));
    } catch {
      /* ignore */
    }
    set({ megacorpRep: next });
  },
}));

export const THEME_COLORS: Record<
  HudTheme,
  { bg: string; border: string; text: string; accent: string }
> = {
  default: { bg: "#0a1830", border: "#224", text: "#c8d8ff", accent: "#4488cc" },
  hacker: { bg: "#001008", border: "#0f4", text: "#00ff88", accent: "#00cc44" },
  amber: { bg: "#180a00", border: "#642", text: "#ffcc88", accent: "#ffaa22" },
};
