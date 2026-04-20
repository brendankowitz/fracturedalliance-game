import { create } from "zustand";

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  secret?: boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_building", name: "First Steps", description: "Construct your first building." },
  { id: "five_mines", name: "Mine Operator", description: "Build 5 mines on a single asteroid." },
  { id: "wealthy_baron", name: "Wealthy Baron", description: "Accumulate 100,000 credits." },
  { id: "diplomat", name: "Diplomat", description: "Hold 3 active treaties simultaneously." },
  { id: "black_market", name: "Back-Alley Dealings", description: "Make 3 black market purchases." },
  { id: "espionage", name: "Shadow Hand", description: "Deploy 3 agents across the belt." },
  { id: "independence_win", name: "Independence!", description: "Win via Independence victory." },
  { id: "military_win", name: "Iron Fist", description: "Win via Military conquest." },
  { id: "economic_win", name: "Belt Baron", description: "Win via Economic dominance." },
  { id: "science_win", name: "Future Architect", description: "Win via Scientific breakthrough." },
  { id: "first_win", name: "Claim the Belt", description: "Win any game." },
  { id: "speed_run", name: "Lightning Baron", description: "Win any game within 200 ticks.", secret: true },
];

const STORAGE_KEY = "fa-achievements";

function loadFromStorage(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveToStorage(unlocked: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...unlocked]));
  } catch {
    // ignore
  }
}

interface AchievementState {
  unlocked: Set<string>;
  unlock: (id: string) => void;
  isUnlocked: (id: string) => boolean;
}

export const useAchievementStore = create<AchievementState>((set, get) => ({
  unlocked: loadFromStorage(),
  unlock: (id) => {
    const current = get().unlocked;
    if (current.has(id)) return;
    const next = new Set([...current, id]);
    saveToStorage(next);
    set({ unlocked: next });
  },
  isUnlocked: (id) => get().unlocked.has(id),
}));
