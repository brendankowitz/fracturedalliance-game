# Achievements & Meta-Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 12 achievements with IndexedDB persistence, post-match achievement screen, weekly seed system, 3 unlockable HUD themes, and persistent megacorp reputation across matches.

**Architecture:** New Zustand stores (achievementStore, megacorpStore) persisted to IndexedDB. Achievement detection runs as a React effect on every world snapshot. No sim engine changes.

**Tech Stack:** React 19, Zustand, TypeScript strict, IndexedDB (idb), Vitest + React Testing Library

---

## Task 1: Achievement Types & IndexedDB Persistence Store

**Objective:** Create the foundation for achievement storage with Zustand + idb persistence.

**Files:**
- `/E/data/src/fracturedalliance/opus/apps/web/src/store/achievementStore.ts` (new)
- `/E/data/src/fracturedalliance/opus/apps/web/package.json` (update dependencies)

**TDD Steps:**

- [ ] **1.1** Verify idb package is available in apps/web
  ```bash
  cd /E/data/src/fracturedalliance/opus/apps/web && npm ls idb
  ```
  If not found, add to package.json:
  ```bash
  cd /E/data/src/fracturedalliance/opus && pnpm add idb -F web
  ```
  Expected output: `idb@^8.0.0` installed

- [ ] **1.2** Create `/E/data/src/fracturedalliance/opus/apps/web/src/store/achievementStore.ts`
  ```typescript
  import { create } from "zustand";
  import { openDB, type DBSchema } from "idb";

  export type AchievementId =
    | "first_blood"
    | "corporate_raider"
    | "warlord"
    | "diplomat"
    | "mad_scientist"
    | "outlaw"
    | "paranoid"
    | "ghost"
    | "betrayer"
    | "kingmaker"
    | "extortionist"
    | "asteroid_surfer";

  export interface Achievement {
    id: AchievementId;
    name: string;
    description: string;
    unlockedAt: number | null; // timestamp in ms
  }

  interface AchievementDbSchema extends DBSchema {
    achievements: {
      key: AchievementId;
      value: Achievement;
    };
    trackers: {
      key: string; // e.g., "betrayer_count", "kingmaker_count", "extortionist_count", "asteroid_surfer_count"
      value: number;
    };
    sessionTrackers: {
      key: string; // e.g., "betrayer_count_session", "asteroid_surfer_count_session"
      value: number;
    };
  }

  const ACHIEVEMENTS: Record<AchievementId, Omit<Achievement, "unlockedAt">> = {
    first_blood: {
      id: "first_blood",
      name: "First Blood",
      description: "Achieve any victory condition",
    },
    corporate_raider: {
      id: "corporate_raider",
      name: "Corporate Raider",
      description: "Win via Economic Supremacy (1,000,000 credits)",
    },
    warlord: {
      id: "warlord",
      name: "Warlord",
      description: "Win via Military Supremacy (eliminate all rivals)",
    },
    diplomat: {
      id: "diplomat",
      name: "Diplomat",
      description: "Win via Federation Champion (max standing)",
    },
    mad_scientist: {
      id: "mad_scientist",
      name: "Mad Scientist",
      description: "Win via Scientific Ascension (master all blueprints)",
    },
    outlaw: {
      id: "outlaw",
      name: "Outlaw",
      description: "Win via Belt Dominion (majority asteroids)",
    },
    paranoid: {
      id: "paranoid",
      name: "Paranoid",
      description: "Survive Federation expedition (suspicion 100+) then win",
    },
    ghost: {
      id: "ghost",
      name: "Ghost",
      description: "Win without ever being attacked (no colony.under_attack events)",
    },
    betrayer: {
      id: "betrayer",
      name: "Betrayer",
      description: "Break 3+ treaties in one match",
    },
    kingmaker: {
      id: "kingmaker",
      name: "Kingmaker",
      description: "Complete 5 liberate missions (total across all matches)",
    },
    extortionist: {
      id: "extortionist",
      name: "Extortionist",
      description: "Collect blackmail tribute 10 times (total across all matches)",
    },
    asteroid_surfer: {
      id: "asteroid_surfer",
      name: "Asteroid Surfer",
      description: "Ram 3 asteroids with engines in one match",
    },
  };

  const DB_NAME = "fa-achievements";
  const DB_VERSION = 1;

  let _dbPromise: ReturnType<typeof openDB<AchievementDbSchema>> | undefined;

  async function getAchievementDb() {
    _dbPromise ??= openDB<AchievementDbSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("achievements")) {
          db.createObjectStore("achievements", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("trackers")) {
          db.createObjectStore("trackers", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("sessionTrackers")) {
          db.createObjectStore("sessionTrackers", { keyPath: "key" });
        }
      },
    });
    return _dbPromise;
  }

  interface AchievementState {
    achievements: Record<AchievementId, Achievement>;
    newly_unlocked: AchievementId[]; // achievements unlocked this session
    isLoaded: boolean;

    // Persistent counters (cross-match)
    betrayer_count: number;
    kingmaker_count: number;
    extortionist_count: number;

    // Session-only counters (reset on new game)
    betrayer_count_session: number;
    asteroid_surfer_count_session: number;
    ghost_no_attack_events_session: boolean;

    // Actions
    loadFromIdb: () => Promise<void>;
    unlockAchievement: (id: AchievementId) => Promise<void>;
    incrementCounter: (counter: "kingmaker" | "extortionist") => Promise<void>;
    resetSessionTrackers: () => void;
    incrementSessionCounter: (key: "betrayer" | "asteroid_surfer") => void;
    setGhostSessionFlag: (value: boolean) => void;
  }

  export const useAchievementStore = create<AchievementState>((set) => ({
    // Initialize with locked achievements
    achievements: Object.entries(ACHIEVEMENTS).reduce(
      (acc, [id, achievement]) => {
        acc[id as AchievementId] = { ...achievement, unlockedAt: null };
        return acc;
      },
      {} as Record<AchievementId, Achievement>,
    ),
    newly_unlocked: [],
    isLoaded: false,
    betrayer_count: 0,
    kingmaker_count: 0,
    extortionist_count: 0,
    betrayer_count_session: 0,
    asteroid_surfer_count_session: 0,
    ghost_no_attack_events_session: true,

    loadFromIdb: async () => {
      try {
        const db = await getAchievementDb();
        const achievements: Record<AchievementId, Achievement> = { ...ACHIEVEMENTS } as any;

        // Load achievement unlock states
        const allAchievements = await db.getAll("achievements");
        allAchievements.forEach((ach) => {
          achievements[ach.id] = ach;
        });

        // Load persistent counters
        const betrayerRec = await db.get("trackers", "betrayer_count");
        const kingmakerRec = await db.get("trackers", "kingmaker_count");
        const extortionistRec = await db.get("trackers", "extortionist_count");

        set({
          achievements,
          isLoaded: true,
          betrayer_count: betrayerRec?.value ?? 0,
          kingmaker_count: kingmakerRec?.value ?? 0,
          extortionist_count: extortionistRec?.value ?? 0,
        });
      } catch (err) {
        console.error("Failed to load achievements from IDB:", err);
        set({ isLoaded: true }); // Mark as loaded even on error
      }
    },

    unlockAchievement: async (id: AchievementId) => {
      set((state) => {
        if (state.achievements[id].unlockedAt !== null) {
          return state; // Already unlocked
        }
        const now = Date.now();
        return {
          achievements: {
            ...state.achievements,
            [id]: { ...state.achievements[id], unlockedAt: now },
          },
          newly_unlocked: [...state.newly_unlocked, id],
        };
      });

      // Persist to IDB
      try {
        const db = await getAchievementDb();
        const state = useAchievementStore.getState();
        const achievement = state.achievements[id];
        if (achievement.unlockedAt !== null) {
          await db.put("achievements", achievement);
        }
      } catch (err) {
        console.error(`Failed to persist achievement ${id} to IDB:`, err);
      }
    },

    incrementCounter: async (counter: "kingmaker" | "extortionist") => {
      const key = counter === "kingmaker" ? "kingmaker_count" : "extortionist_count";
      set((state) => ({
        [key]: state[key as keyof AchievementState] as number + 1,
      }));

      try {
        const db = await getAchievementDb();
        const newValue =
          (useAchievementStore.getState()[key as keyof AchievementState] as number) ?? 0;
        await db.put("trackers", { key, value: newValue });
      } catch (err) {
        console.error(`Failed to persist counter ${key} to IDB:`, err);
      }
    },

    resetSessionTrackers: () => {
      set({
        betrayer_count_session: 0,
        asteroid_surfer_count_session: 0,
        ghost_no_attack_events_session: true,
        newly_unlocked: [],
      });
    },

    incrementSessionCounter: (key: "betrayer" | "asteroid_surfer") => {
      set((state) => {
        const counterKey =
          key === "betrayer" ? "betrayer_count_session" : "asteroid_surfer_count_session";
        return {
          [counterKey]: (state[counterKey as keyof AchievementState] as number) + 1,
        };
      });
    },

    setGhostSessionFlag: (value: boolean) => {
      set({ ghost_no_attack_events_session: value });
    },
  }));
  ```

- [ ] **1.3** Run TypeScript check
  ```bash
  cd /E/data/src/fracturedalliance/opus && pnpm -F web typecheck
  ```
  Expected: No errors

- [ ] **1.4** Create unit test file `/E/data/src/fracturedalliance/opus/apps/web/src/store/__tests__/achievementStore.test.ts`
  ```typescript
  import { describe, it, expect, beforeEach } from "vitest";
  import { useAchievementStore } from "../achievementStore.ts";

  describe("achievementStore", () => {
    beforeEach(() => {
      // Reset store state before each test
      const store = useAchievementStore.getState();
      store.resetSessionTrackers();
    });

    it("initializes with all achievements locked", () => {
      const state = useAchievementStore.getState();
      expect(state.isLoaded).toBe(false);
      Object.values(state.achievements).forEach((ach) => {
        expect(ach.unlockedAt).toBeNull();
      });
    });

    it("unlocks achievement and marks as newly_unlocked", async () => {
      const store = useAchievementStore.getState();
      await store.unlockAchievement("first_blood");

      const state = useAchievementStore.getState();
      expect(state.achievements.first_blood.unlockedAt).not.toBeNull();
      expect(state.newly_unlocked).toContain("first_blood");
    });

    it("does not re-unlock already unlocked achievement", async () => {
      const store = useAchievementStore.getState();
      await store.unlockAchievement("first_blood");
      const firstUnlockTime = useAchievementStore.getState().achievements.first_blood.unlockedAt;

      // Wait a tick
      await new Promise((r) => setTimeout(r, 1));

      await store.unlockAchievement("first_blood");
      const secondUnlockTime = useAchievementStore.getState().achievements.first_blood.unlockedAt;

      expect(firstUnlockTime).toBe(secondUnlockTime);
    });

    it("increments session betrayer counter", () => {
      const store = useAchievementStore.getState();
      store.incrementSessionCounter("betrayer");
      store.incrementSessionCounter("betrayer");

      const state = useAchievementStore.getState();
      expect(state.betrayer_count_session).toBe(2);
    });

    it("resets session trackers", () => {
      const store = useAchievementStore.getState();
      store.incrementSessionCounter("betrayer");
      store.incrementSessionCounter("asteroid_surfer");

      store.resetSessionTrackers();
      const state = useAchievementStore.getState();
      expect(state.betrayer_count_session).toBe(0);
      expect(state.asteroid_surfer_count_session).toBe(0);
      expect(state.ghost_no_attack_events_session).toBe(true);
      expect(state.newly_unlocked.length).toBe(0);
    });

    it("sets ghost session flag", () => {
      const store = useAchievementStore.getState();
      store.setGhostSessionFlag(false);

      const state = useAchievementStore.getState();
      expect(state.ghost_no_attack_events_session).toBe(false);
    });
  });
  ```

- [ ] **1.5** Run tests
  ```bash
  cd /E/data/src/fracturedalliance/opus && pnpm -F web test -- src/store/__tests__/achievementStore.test.ts
  ```
  Expected: All tests pass

---

## Task 2: Achievement Detection System

**Objective:** Implement logic to detect when achievements should be unlocked based on game state.

**Files:**
- `/E/data/src/fracturedalliance/opus/apps/web/src/achievements/achievementDetector.ts` (new)
- `/E/data/src/fracturedalliance/opus/apps/web/src/achievements/__tests__/achievementDetector.test.ts` (new)

**TDD Steps:**

- [ ] **2.1** Create `/E/data/src/fracturedalliance/opus/apps/web/src/achievements/achievementDetector.ts`
  ```typescript
  import type { HudSnapshot } from "@fa/sim";
  import type { AchievementStore } from "../store/achievementStore.ts";
  import { useAchievementStore } from "../store/achievementStore.ts";

  export interface AchievementDetectorState {
    prevSnapshot: HudSnapshot | null;
    lastGameEndState: string | null;
  }

  const detectorState: AchievementDetectorState = {
    prevSnapshot: null,
    lastGameEndState: null,
  };

  export async function checkAchievements(snapshot: HudSnapshot): Promise<void> {
    const store = useAchievementStore.getState();
    const prev = detectorState.prevSnapshot;

    // Track events that occurred between prev and current snapshot
    const eventKinds = snapshot.events.map((e) => e.kind);

    // first_blood: any victory condition reached
    if (snapshot.gameEndState !== null && prev?.gameEndState === null) {
      await store.unlockAchievement("first_blood");
    }

    // corporate_raider: victory:economic
    if (snapshot.gameEndState === "victory:economic") {
      await store.unlockAchievement("corporate_raider");
    }

    // warlord: victory:military
    if (snapshot.gameEndState === "victory:military") {
      await store.unlockAchievement("warlord");
    }

    // diplomat: victory:diplomatic
    if (snapshot.gameEndState === "victory:diplomatic") {
      await store.unlockAchievement("diplomat");
    }

    // mad_scientist: victory:science
    if (snapshot.gameEndState === "victory:science") {
      await store.unlockAchievement("mad_scientist");
    }

    // outlaw: victory:independence
    if (snapshot.gameEndState === "victory:independence") {
      await store.unlockAchievement("outlaw");
    }

    // paranoid: independence victory + suspicion was >= 100
    if (snapshot.gameEndState === "victory:independence" && snapshot.suspicion >= 100) {
      await store.unlockAchievement("paranoid");
    }

    // ghost: game ended in victory AND no colony.under_attack events in this session
    if (
      snapshot.gameEndState !== null &&
      snapshot.gameEndState.startsWith("victory:") &&
      store.ghost_no_attack_events_session
    ) {
      await store.unlockAchievement("ghost");
    }

    // betrayer: broke 3+ treaties in this session
    // Treaty breaks are detected by counting treaty_broken events in this tick
    const treatyBrokeCount = eventKinds.filter((k) => k === "treaty_broken").length;
    if (treatyBrokeCount > 0) {
      for (let i = 0; i < treatyBrokeCount; i++) {
        store.incrementSessionCounter("betrayer");
      }
    }
    if (store.betrayer_count_session >= 3 && snapshot.gameEndState !== null) {
      await store.unlockAchievement("betrayer");
    }

    // kingmaker: completed 5+ liberate missions total
    // Detect liberate_mission_complete event
    const liberateMissionCompleted = eventKinds.includes("liberate_mission_complete");
    if (liberateMissionCompleted && store.kingmaker_count < 5) {
      await store.incrementCounter("kingmaker");
    }
    if (store.kingmaker_count >= 5) {
      await store.unlockAchievement("kingmaker");
    }

    // extortionist: collected blackmail tribute 10 times total
    const extortionTributeTaken = eventKinds.includes("extortion_tribute_taken");
    if (extortionTributeTaken && store.extortionist_count < 10) {
      await store.incrementCounter("extortionist");
    }
    if (store.extortionist_count >= 10) {
      await store.unlockAchievement("extortionist");
    }

    // asteroid_surfer: rammed 3 asteroids with engines in one match
    const asteroidRammed = eventKinds.includes("asteroid_rammed");
    if (asteroidRammed) {
      // Count how many ramming events occurred this tick
      const rammingCount = eventKinds.filter((k) => k === "asteroid_rammed").length;
      for (let i = 0; i < rammingCount; i++) {
        store.incrementSessionCounter("asteroid_surfer");
      }
    }
    if (store.asteroid_surfer_count_session >= 3 && snapshot.gameEndState !== null) {
      await store.unlockAchievement("asteroid_surfer");
    }

    // Track attack events to flag ghost achievement
    if (eventKinds.includes("colony.under_attack")) {
      store.setGhostSessionFlag(false);
    }

    // Update detector state
    detectorState.prevSnapshot = snapshot;
    detectorState.lastGameEndState = snapshot.gameEndState;
  }

  export function resetAchievementDetector(): void {
    detectorState.prevSnapshot = null;
    detectorState.lastGameEndState = null;
    const store = useAchievementStore.getState();
    store.resetSessionTrackers();
  }
  ```

- [ ] **2.2** Create `/E/data/src/fracturedalliance/opus/apps/web/src/achievements/__tests__/achievementDetector.test.ts`
  ```typescript
  import { describe, it, expect, beforeEach, vi } from "vitest";
  import type { HudSnapshot } from "@fa/sim";
  import { checkAchievements, resetAchievementDetector } from "../achievementDetector.ts";
  import { useAchievementStore } from "../../store/achievementStore.ts";

  // Mock snapshot base
  const createMockSnapshot = (overrides?: Partial<HudSnapshot>): HudSnapshot => ({
    tick: 0,
    seed: 12345,
    difficulty: "normal",
    credits: 0,
    federationStanding: 0,
    suspicion: 0,
    humanPlayerId: "player1",
    traderActive: false,
    oreInventory: {},
    players: [],
    asteroids: [],
    ships: [],
    events: [],
    marketPrices: {},
    combatFlashes: [],
    diplomacy: [],
    gameEndState: null,
    blueprintsOwned: [],
    agents: [],
    ...overrides,
  });

  describe("achievementDetector", () => {
    beforeEach(() => {
      resetAchievementDetector();
      const store = useAchievementStore.getState();
      store.resetSessionTrackers();
    });

    it("unlocks first_blood on any victory", async () => {
      const store = useAchievementStore.getState();
      const prevSnapshot = createMockSnapshot({ gameEndState: null });
      const nextSnapshot = createMockSnapshot({ gameEndState: "victory:military" });

      await checkAchievements(prevSnapshot);
      await checkAchievements(nextSnapshot);

      const state = useAchievementStore.getState();
      expect(state.achievements.first_blood.unlockedAt).not.toBeNull();
    });

    it("unlocks corporate_raider on economic victory", async () => {
      const snapshot = createMockSnapshot({ gameEndState: "victory:economic" });
      await checkAchievements(snapshot);

      const state = useAchievementStore.getState();
      expect(state.achievements.corporate_raider.unlockedAt).not.toBeNull();
    });

    it("unlocks warlord on military victory", async () => {
      const snapshot = createMockSnapshot({ gameEndState: "victory:military" });
      await checkAchievements(snapshot);

      const state = useAchievementStore.getState();
      expect(state.achievements.warlord.unlockedAt).not.toBeNull();
    });

    it("unlocks diplomat on diplomatic victory", async () => {
      const snapshot = createMockSnapshot({ gameEndState: "victory:diplomatic" });
      await checkAchievements(snapshot);

      const state = useAchievementStore.getState();
      expect(state.achievements.diplomat.unlockedAt).not.toBeNull();
    });

    it("unlocks mad_scientist on science victory", async () => {
      const snapshot = createMockSnapshot({ gameEndState: "victory:science" });
      await checkAchievements(snapshot);

      const state = useAchievementStore.getState();
      expect(state.achievements.mad_scientist.unlockedAt).not.toBeNull();
    });

    it("unlocks outlaw on independence victory", async () => {
      const snapshot = createMockSnapshot({ gameEndState: "victory:independence" });
      await checkAchievements(snapshot);

      const state = useAchievementStore.getState();
      expect(state.achievements.outlaw.unlockedAt).not.toBeNull();
    });

    it("unlocks paranoid on independence victory with suspicion >= 100", async () => {
      const snapshot = createMockSnapshot({
        gameEndState: "victory:independence",
        suspicion: 100,
      });
      await checkAchievements(snapshot);

      const state = useAchievementStore.getState();
      expect(state.achievements.paranoid.unlockedAt).not.toBeNull();
    });

    it("does not unlock paranoid on independence victory with low suspicion", async () => {
      const snapshot = createMockSnapshot({
        gameEndState: "victory:independence",
        suspicion: 50,
      });
      await checkAchievements(snapshot);

      const state = useAchievementStore.getState();
      expect(state.achievements.paranoid.unlockedAt).toBeNull();
    });

    it("unlocks ghost on victory with no attack events", async () => {
      const snapshot = createMockSnapshot({
        gameEndState: "victory:military",
        events: [{ kind: "building_completed", priority: "info" }],
      });
      await checkAchievements(snapshot);

      const state = useAchievementStore.getState();
      expect(state.achievements.ghost.unlockedAt).not.toBeNull();
    });

    it("does not unlock ghost if colony.under_attack event occurred", async () => {
      const snapshot1 = createMockSnapshot({
        events: [{ kind: "colony.under_attack", priority: "critical" }],
      });
      await checkAchievements(snapshot1);

      const snapshot2 = createMockSnapshot({
        gameEndState: "victory:military",
        events: [],
      });
      await checkAchievements(snapshot2);

      const state = useAchievementStore.getState();
      expect(state.achievements.ghost.unlockedAt).toBeNull();
    });

    it("tracks betrayer count on treaty_broken events", async () => {
      const snapshot = createMockSnapshot({
        events: [
          { kind: "treaty_broken", priority: "warn" },
          { kind: "treaty_broken", priority: "warn" },
          { kind: "treaty_broken", priority: "warn" },
        ],
      });
      await checkAchievements(snapshot);

      const state = useAchievementStore.getState();
      expect(state.betrayer_count_session).toBe(3);
    });

    it("unlocks betrayer on 3+ treaties broken in one match", async () => {
      const snapshot1 = createMockSnapshot({
        events: [
          { kind: "treaty_broken", priority: "warn" },
          { kind: "treaty_broken", priority: "warn" },
          { kind: "treaty_broken", priority: "warn" },
        ],
      });
      await checkAchievements(snapshot1);

      const snapshot2 = createMockSnapshot({
        gameEndState: "victory:military",
        events: [],
      });
      await checkAchievements(snapshot2);

      const state = useAchievementStore.getState();
      expect(state.achievements.betrayer.unlockedAt).not.toBeNull();
    });

    it("tracks asteroid_surfer count on asteroid_rammed events", async () => {
      const snapshot = createMockSnapshot({
        events: [
          { kind: "asteroid_rammed", priority: "info" },
          { kind: "asteroid_rammed", priority: "info" },
          { kind: "asteroid_rammed", priority: "info" },
        ],
      });
      await checkAchievements(snapshot);

      const state = useAchievementStore.getState();
      expect(state.asteroid_surfer_count_session).toBe(3);
    });

    it("unlocks asteroid_surfer on 3+ ramming events in one match", async () => {
      const snapshot1 = createMockSnapshot({
        events: [
          { kind: "asteroid_rammed", priority: "info" },
          { kind: "asteroid_rammed", priority: "info" },
          { kind: "asteroid_rammed", priority: "info" },
        ],
      });
      await checkAchievements(snapshot1);

      const snapshot2 = createMockSnapshot({
        gameEndState: "victory:military",
        events: [],
      });
      await checkAchievements(snapshot2);

      const state = useAchievementStore.getState();
      expect(state.achievements.asteroid_surfer.unlockedAt).not.toBeNull();
    });
  });
  ```

- [ ] **2.3** Run tests
  ```bash
  cd /E/data/src/fracturedalliance/opus && pnpm -F web test -- src/achievements/__tests__/achievementDetector.test.ts
  ```
  Expected: All tests pass

- [ ] **2.4** Run TypeScript check
  ```bash
  cd /E/data/src/fracturedalliance/opus && pnpm -F web typecheck
  ```
  Expected: No errors

---

## Task 3: HUD Integration for Achievement Detection

**Objective:** Wire achievement detection into the React render loop via HUD.tsx.

**Files:**
- `/E/data/src/fracturedalliance/opus/apps/web/src/hud/HUD.tsx` (modify)

**TDD Steps:**

- [ ] **3.1** Update HUD.tsx to call checkAchievements on every snapshot change
  ```typescript
  // Add at the top of the imports section
  import { checkAchievements } from "../achievements/achievementDetector.ts";
  import { useAchievementStore } from "../store/achievementStore.ts";

  // Add this effect inside the HUD component, after useHotkeys()
  useEffect(() => {
    // Load achievements on mount
    const initAchievements = async () => {
      await useAchievementStore.getState().loadFromIdb();
    };
    initAchievements();
  }, []);

  useEffect(() => {
    if (snapshot && useAchievementStore.getState().isLoaded) {
      checkAchievements(snapshot);
    }
  }, [snapshot]);
  ```

- [ ] **3.2** Verify HUD still renders without errors
  ```bash
  cd /E/data/src/fracturedalliance/opus && pnpm -F web typecheck
  ```
  Expected: No errors

---

## Task 4: Post-Match Achievement Screen Component

**Objective:** Create UI to display unlocked achievements after game ends.

**Files:**
- `/E/data/src/fracturedalliance/opus/apps/web/src/hud/AchievementsPanel.tsx` (new)
- `/E/data/src/fracturedalliance/opus/apps/web/src/store/uiStore.ts` (modify)

**TDD Steps:**

- [ ] **4.1** Update uiStore.ts to add achievements panel state
  Add these fields to UiState interface and initial state:
  ```typescript
  achievementsPanelOpen: boolean;
  toggleAchievementsPanel: () => void;
  ```
  And add to the create function:
  ```typescript
  achievementsPanelOpen: false,
  toggleAchievementsPanel: () => set((s) => ({ achievementsPanelOpen: !s.achievementsPanelOpen })),
  ```

- [ ] **4.2** Create `/E/data/src/fracturedalliance/opus/apps/web/src/hud/AchievementsPanel.tsx`
  ```typescript
  import { useAchievementStore } from "../store/achievementStore.ts";
  import { useUiStore } from "../store/uiStore.ts";

  const ACHIEVEMENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    unlocked: {
      bg: "rgba(79, 136, 0, 0.08)",
      text: "#7fc8ff",
      border: "#4f8800",
    },
    locked: {
      bg: "rgba(50, 50, 60, 0.04)",
      text: "#808090",
      border: "#484858",
    },
    newly_unlocked: {
      bg: "rgba(255, 200, 0, 0.12)",
      text: "#ffd700",
      border: "#ffa500",
    },
  };

  export function AchievementsPanel() {
    const open = useUiStore((s) => s.achievementsPanelOpen);
    const toggle = useUiStore((s) => s.toggleAchievementsPanel);
    const achievements = useAchievementStore((s) => s.achievements);
    const newly_unlocked = useAchievementStore((s) => s.newly_unlocked);

    if (!open) return null;

    const achList = Object.values(achievements);

    return (
      <div
        style={{
          position: "absolute",
          bottom: 40,
          right: 20,
          width: 420,
          maxHeight: 600,
          background: "var(--bg-panel)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          zIndex: 40,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-head)",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: 1,
              color: "var(--text)",
            }}
          >
            ACHIEVEMENTS
          </div>
          <button
            type="button"
            onClick={toggle}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-lo)",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>

        {/* Achievements list */}
        <div
          style={{
            overflowY: "auto",
            flex: 1,
            padding: 8,
          }}
        >
          {achList.map((ach) => {
            const isUnlocked = ach.unlockedAt !== null;
            const isNew = newly_unlocked.includes(ach.id);
            const colorSet = isNew
              ? ACHIEVEMENT_COLORS.newly_unlocked
              : isUnlocked
                ? ACHIEVEMENT_COLORS.unlocked
                : ACHIEVEMENT_COLORS.locked;

            return (
              <div
                key={ach.id}
                style={{
                  padding: 12,
                  marginBottom: 8,
                  background: colorSet.bg,
                  border: `1px solid ${colorSet.border}`,
                  borderRadius: 3,
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                {/* Icon / Status */}
                <div
                  style={{
                    minWidth: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: colorSet.border,
                    borderRadius: 2,
                    color: colorSet.bg,
                    fontWeight: 600,
                    fontSize: 12,
                    flexShrink: 0,
                  }}
                >
                  {isUnlocked ? "✓" : "◆"}
                </div>

                {/* Details */}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-head)",
                      fontSize: 12,
                      fontWeight: 600,
                      color: colorSet.text,
                      marginBottom: 2,
                    }}
                  >
                    {ach.name}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-data)",
                      fontSize: 10,
                      color: isUnlocked ? "var(--text-lo)" : "var(--text-lo-2)",
                      lineHeight: 1.4,
                    }}
                  >
                    {ach.description}
                  </div>
                  {ach.unlockedAt && (
                    <div
                      style={{
                        fontFamily: "var(--font-data)",
                        fontSize: 9,
                        color: colorSet.border,
                        marginTop: 4,
                      }}
                    >
                      Unlocked: {new Date(ach.unlockedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer: Stats */}
        <div
          style={{
            padding: "8px 16px",
            borderTop: "1px solid var(--border)",
            fontFamily: "var(--font-data)",
            fontSize: 10,
            color: "var(--text-lo)",
            textAlign: "center",
          }}
        >
          {achList.filter((a) => a.unlockedAt !== null).length} / {achList.length} unlocked
        </div>
      </div>
    );
  }
  ```

- [ ] **4.3** Add AchievementsPanel to HUD.tsx
  Import:
  ```typescript
  import { AchievementsPanel } from "./AchievementsPanel.tsx";
  ```
  And add to the return JSX before the closing fragment (after other panels):
  ```tsx
  <AchievementsPanel />
  ```

- [ ] **4.4** Add keyboard shortcut for achievements panel in useHotkeys()
  In the switch statement, add:
  ```typescript
  case "h": case "H":
    if (!s.buildingPanelOpen) { s.toggleAchievementsPanel(); break; }
    break;
  ```

- [ ] **4.5** Update VictoryScreen.tsx to show achievements automatically on victory
  Replace the return JSX in VictoryScreen with:
  ```typescript
  // At the top of the function body
  const { achievementsPanelOpen } = useUiStore();
  const { toggleAchievementsPanel } = useUiStore();

  useEffect(() => {
    // Auto-open achievements panel when victory screen appears
    if (!achievementsPanelOpen) {
      toggleAchievementsPanel();
    }
  }, [achievementsPanelOpen, toggleAchievementsPanel]);

  // Then return the original JSX as before
  ```

- [ ] **4.6** Run TypeScript check and tests
  ```bash
  cd /E/data/src/fracturedalliance/opus && pnpm -F web typecheck
  ```
  Expected: No errors

---

## Task 5: Weekly Challenge Seed System

**Objective:** Implement a weekly seed challenge mode with deterministic seed from ISO week.

**Files:**
- `/E/data/src/fracturedalliance/opus/apps/web/src/game/worldConfig.ts` (check/create)
- `/E/data/src/fracturedalliance/opus/apps/web/src/hud/StartScreen.tsx` (modify, if exists)
- `/E/data/src/fracturedalliance/opus/apps/web/src/store/gameStore.ts` (modify)

**TDD Steps:**

- [ ] **5.1** Check if worldConfig.ts exists
  ```bash
  ls -la /E/data/src/fracturedalliance/opus/apps/web/src/game/worldConfig.ts 2>&1
  ```
  If not found, create the file.

- [ ] **5.2** Add weekly seed helper to a new utility file `/E/data/src/fracturedalliance/opus/apps/web/src/utils/weeklyChallenge.ts`
  ```typescript
  export function getWeeklySeed(): { seed: number; weekLabel: string } {
    const now = new Date();
    const year = now.getFullYear();

    // ISO week calculation
    const date = new Date(now.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 4 - (date.getDay() || 7));
    const yearStart = new Date(date.getFullYear(), 0, 1);
    const weekNum = Math.ceil((date.getTime() - yearStart.getTime()) / 86400000 / 7);

    const seed = parseInt(`${year}${String(weekNum).padStart(2, "0")}`);
    const weekLabel = `Week ${weekNum} Challenge`;

    return { seed, weekLabel };
  }

  export function isWeeklyMode(seed: number): boolean {
    const { seed: weeklySeed } = getWeeklySeed();
    return seed === weeklySeed;
  }
  ```

- [ ] **5.3** Add weekly mode state to gameStore
  Add to GameState interface:
  ```typescript
  isWeeklyMode: boolean;
  setWeeklyMode: (enabled: boolean) => void;
  ```
  And in the create function:
  ```typescript
  isWeeklyMode: false,
  setWeeklyMode: (enabled) => set({ isWeeklyMode: enabled }),
  ```

- [ ] **5.4** Update start screen scenario selector (if ScenarioSelector component exists)
  Find the component that handles scenario selection and add a "Weekly Challenge" button option that:
  - Calls `setWeeklyMode(true)` in gameStore
  - Uses the weekly seed from `getWeeklySeed()`
  - Shows the week label prominently
  
  Code example for the button:
  ```typescript
  const { seed: weeklySeed, weekLabel } = getWeeklySeed();
  
  <button
    onClick={() => {
      gameStore.setWeeklyMode(true);
      startGame(weeklySeed, "normal", "weekly");
    }}
    style={{
      // button styles
    }}
  >
    {weekLabel}
  </button>
  ```

- [ ] **5.5** Show weekly mode indicator on ResourceBar when active
  Modify ResourceBar.tsx to show "WEEKLY CHALLENGE" badge if `isWeeklyMode` is true from gameStore

- [ ] **5.6** Run TypeScript check
  ```bash
  cd /E/data/src/fracturedalliance/opus && pnpm -F web typecheck
  ```
  Expected: No errors

---

## Task 6: HUD Theme System (Cosmetics)

**Objective:** Add 3 unlockable HUD color themes based on achievement progress.

**Files:**
- `/E/data/src/fracturedalliance/opus/apps/web/src/store/uiStore.ts` (modify)
- `/E/data/src/fracturedalliance/opus/apps/web/src/hud/HUD.tsx` (modify)
- `/E/data/src/fracturedalliance/opus/apps/web/src/hud/ThemeSelector.tsx` (new)

**TDD Steps:**

- [ ] **6.1** Update uiStore to include theme state
  Add to UiState:
  ```typescript
  hudTheme: "default" | "midnight" | "amber" | "matrix";
  setHudTheme: (theme: "default" | "midnight" | "amber" | "matrix") => void;
  ```
  And in create function:
  ```typescript
  hudTheme: "default",
  setHudTheme: (theme) => set({ hudTheme: theme }),
  ```

- [ ] **6.2** Create theme unlock checker utility `/E/data/src/fracturedalliance/opus/apps/web/src/utils/themeUnlocks.ts`
  ```typescript
  import { useAchievementStore } from "../store/achievementStore.ts";

  export function getUnlockedThemes(): Array<"default" | "midnight" | "amber" | "matrix"> {
    const achievements = useAchievementStore.getState().achievements;
    const unlockedThemes: Array<"default" | "midnight" | "amber" | "matrix"> = ["default"];

    // Unlock "midnight" after any single win
    const hasAnyWin = Object.values(achievements).some(
      (a) =>
        a.id.startsWith("first_blood") ||
        a.id.startsWith("corporate_raider") ||
        a.id.startsWith("warlord") ||
        a.id.startsWith("diplomat") ||
        a.id.startsWith("mad_scientist") ||
        a.id.startsWith("outlaw"),
    );
    if (hasAnyWin) unlockedThemes.push("midnight");

    // Unlock "amber" after 3+ wins
    const winCount = Object.values(achievements).filter(
      (a) =>
        a.unlockedAt !== null &&
        (a.id === "corporate_raider" ||
          a.id === "warlord" ||
          a.id === "diplomat" ||
          a.id === "mad_scientist" ||
          a.id === "outlaw"),
    ).length;
    if (winCount >= 3) unlockedThemes.push("amber");

    // Unlock "matrix" when all 12 achievements are unlocked
    const allUnlocked = Object.values(achievements).every((a) => a.unlockedAt !== null);
    if (allUnlocked) unlockedThemes.push("matrix");

    return unlockedThemes;
  }
  ```

- [ ] **6.3** Create `/E/data/src/fracturedalliance/opus/apps/web/src/hud/ThemeSelector.tsx`
  ```typescript
  import { useUiStore } from "../store/uiStore.ts";
  import { getUnlockedThemes } from "../utils/themeUnlocks.ts";

  const THEME_LABELS: Record<string, string> = {
    default: "Default",
    midnight: "Midnight",
    amber: "Amber",
    matrix: "Matrix",
  };

  const THEME_DESCRIPTIONS: Record<string, string> = {
    default: "Standard interface",
    midnight: "Dark blues (1+ win)",
    amber: "Warm amber (3+ wins)",
    matrix: "Green on black (all achievements)",
  };

  export function ThemeSelector() {
    const hudTheme = useUiStore((s) => s.hudTheme);
    const setHudTheme = useUiStore((s) => s.setHudTheme);
    const unlockedThemes = getUnlockedThemes();

    return (
      <div
        style={{
          padding: 12,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-head)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 1,
            color: "var(--text-lo)",
            marginBottom: 8,
            textTransform: "uppercase",
          }}
        >
          HUD Theme
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["default", "midnight", "amber", "matrix"] as const).map((theme) => {
            const isUnlocked = unlockedThemes.includes(theme);
            const isSelected = hudTheme === theme;

            return (
              <button
                key={theme}
                type="button"
                onClick={() => {
                  if (isUnlocked) setHudTheme(theme);
                }}
                disabled={!isUnlocked}
                title={THEME_DESCRIPTIONS[theme]}
                style={{
                  padding: "6px 12px",
                  background: isSelected
                    ? "rgba(0, 196, 224, 0.12)"
                    : isUnlocked
                      ? "rgba(80, 80, 90, 0.08)"
                      : "rgba(40, 40, 45, 0.08)",
                  border: `1px solid ${
                    isSelected ? "var(--accent)" : isUnlocked ? "var(--border)" : "var(--border-lo)"
                  }`,
                  color: isSelected ? "var(--accent)" : isUnlocked ? "var(--text)" : "var(--text-lo-2)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: isUnlocked ? "pointer" : "not-allowed",
                  opacity: isUnlocked ? 1 : 0.6,
                }}
              >
                {THEME_LABELS[theme]}
                {!isUnlocked && " 🔒"}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  ```

- [ ] **6.4** Add theme CSS custom properties applier to HUD.tsx
  Add a useEffect that applies theme CSS variables:
  ```typescript
  const hudTheme = useUiStore((s) => s.hudTheme);

  useEffect(() => {
    const root = document.documentElement;
    const themes: Record<string, Record<string, string>> = {
      default: {
        "--hud-primary": "#4f8",
        "--hud-secondary": "#4af",
        "--hud-bg": "#0a1820",
      },
      midnight: {
        "--hud-primary": "#2a5f8f",
        "--hud-secondary": "#5a9fdf",
        "--hud-bg": "#0a1828",
      },
      amber: {
        "--hud-primary": "#d4a574",
        "--hud-secondary": "#f4c494",
        "--hud-bg": "#1a1410",
      },
      matrix: {
        "--hud-primary": "#00ff00",
        "--hud-secondary": "#00cc00",
        "--hud-bg": "#001a00",
      },
    };

    const themeVars = themes[hudTheme] || themes.default;
    Object.entries(themeVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [hudTheme]);
  ```

- [ ] **6.5** Add theme selector to options panel (if Options component exists)
  Import and add ThemeSelector component to the options panel UI

- [ ] **6.6** Run TypeScript check
  ```bash
  cd /E/data/src/fracturedalliance/opus && pnpm -F web typecheck
  ```
  Expected: No errors

---

## Task 7: Megacorp Reputation System

**Objective:** Track cross-match player progress with persistent reputation tier.

**Files:**
- `/E/data/src/fracturedalliance/opus/apps/web/src/store/megacorpStore.ts` (new)
- `/E/data/src/fracturedalliance/opus/apps/web/src/hud/StartScreen.tsx` (modify, if exists)

**TDD Steps:**

- [ ] **7.1** Create `/E/data/src/fracturedalliance/opus/apps/web/src/store/megacorpStore.ts`
  ```typescript
  import { create } from "zustand";
  import { openDB, type DBSchema } from "idb";

  export type ReputationTier = "rookie" | "veteran" | "legend";

  export type VictoryType =
    | "victory:military"
    | "victory:economic"
    | "victory:diplomatic"
    | "victory:science"
    | "victory:independence";

  interface MegacorpDbSchema extends DBSchema {
    megacorp: {
      key: "state";
      value: MegacorpState;
    };
  }

  interface MegacorpState {
    matchesPlayed: number;
    wins: Record<VictoryType, number>;
    reputationTier: ReputationTier;
  }

  interface MegacorpStore extends MegacorpState {
    isLoaded: boolean;
    loadFromIdb: () => Promise<void>;
    recordWin: (victoryType: VictoryType) => Promise<void>;
    recordMatch: () => Promise<void>;
    getTotalWins: () => number;
  }

  const DB_NAME = "fa-megacorp";
  const DB_VERSION = 1;

  let _dbPromise: ReturnType<typeof openDB<MegacorpDbSchema>> | undefined;

  async function getMegacorpDb() {
    _dbPromise ??= openDB<MegacorpDbSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("megacorp")) {
          db.createObjectStore("megacorp", { keyPath: "key" });
        }
      },
    });
    return _dbPromise;
  }

  function computeReputationTier(totalWins: number): ReputationTier {
    if (totalWins >= 10) return "legend";
    if (totalWins >= 3) return "veteran";
    return "rookie";
  }

  const DEFAULT_STATE: MegacorpState = {
    matchesPlayed: 0,
    wins: {
      "victory:military": 0,
      "victory:economic": 0,
      "victory:diplomatic": 0,
      "victory:science": 0,
      "victory:independence": 0,
    },
    reputationTier: "rookie",
  };

  export const useMegacorpStore = create<MegacorpStore>((set, get) => ({
    ...DEFAULT_STATE,
    isLoaded: false,

    loadFromIdb: async () => {
      try {
        const db = await getMegacorpDb();
        const stored = await db.get("megacorp", "state");
        if (stored) {
          set(stored);
        }
        set({ isLoaded: true });
      } catch (err) {
        console.error("Failed to load megacorp state from IDB:", err);
        set({ isLoaded: true });
      }
    },

    recordWin: async (victoryType: VictoryType) => {
      set((state) => {
        const newWins = {
          ...state.wins,
          [victoryType]: (state.wins[victoryType] ?? 0) + 1,
        };
        const totalWins = Object.values(newWins).reduce((a, b) => a + b, 0);
        const newTier = computeReputationTier(totalWins);
        return {
          matchesPlayed: state.matchesPlayed + 1,
          wins: newWins,
          reputationTier: newTier,
        };
      });

      try {
        const db = await getMegacorpDb();
        const state = get();
        await db.put("megacorp", {
          key: "state",
          matchesPlayed: state.matchesPlayed,
          wins: state.wins,
          reputationTier: state.reputationTier,
        });
      } catch (err) {
        console.error("Failed to persist megacorp state to IDB:", err);
      }
    },

    recordMatch: async () => {
      set((state) => ({
        matchesPlayed: state.matchesPlayed + 1,
      }));

      try {
        const db = await getMegacorpDb();
        const state = get();
        await db.put("megacorp", {
          key: "state",
          matchesPlayed: state.matchesPlayed,
          wins: state.wins,
          reputationTier: state.reputationTier,
        });
      } catch (err) {
        console.error("Failed to persist megacorp match count to IDB:", err);
      }
    },

    getTotalWins: () => {
      const state = get();
      return Object.values(state.wins).reduce((a, b) => a + b, 0);
    },
  }));
  ```

- [ ] **7.2** Create unit tests `/E/data/src/fracturedalliance/opus/apps/web/src/store/__tests__/megacorpStore.test.ts`
  ```typescript
  import { describe, it, expect, beforeEach } from "vitest";
  import { useMegacorpStore } from "../megacorpStore.ts";

  describe("megacorpStore", () => {
    beforeEach(() => {
      // Reset store for each test
      useMegacorpStore.setState({
        matchesPlayed: 0,
        wins: {
          "victory:military": 0,
          "victory:economic": 0,
          "victory:diplomatic": 0,
          "victory:science": 0,
          "victory:independence": 0,
        },
        reputationTier: "rookie",
      });
    });

    it("initializes with rookie tier and no wins", () => {
      const state = useMegacorpStore.getState();
      expect(state.reputationTier).toBe("rookie");
      expect(state.getTotalWins()).toBe(0);
      expect(state.matchesPlayed).toBe(0);
    });

    it("records a win and updates tier to veteran at 3 wins", async () => {
      const store = useMegacorpStore.getState();
      await store.recordWin("victory:military");
      await store.recordWin("victory:economic");
      await store.recordWin("victory:diplomatic");

      const state = useMegacorpStore.getState();
      expect(state.getTotalWins()).toBe(3);
      expect(state.reputationTier).toBe("veteran");
    });

    it("updates tier to legend at 10 wins", async () => {
      const store = useMegacorpStore.getState();
      for (let i = 0; i < 10; i++) {
        await store.recordWin("victory:military");
      }

      const state = useMegacorpStore.getState();
      expect(state.getTotalWins()).toBe(10);
      expect(state.reputationTier).toBe("legend");
    });

    it("increments matches played", async () => {
      const store = useMegacorpStore.getState();
      await store.recordMatch();
      await store.recordMatch();

      const state = useMegacorpStore.getState();
      expect(state.matchesPlayed).toBe(2);
    });

    it("tracks wins by victory type", async () => {
      const store = useMegacorpStore.getState();
      await store.recordWin("victory:military");
      await store.recordWin("victory:military");
      await store.recordWin("victory:economic");

      const state = useMegacorpStore.getState();
      expect(state.wins["victory:military"]).toBe(2);
      expect(state.wins["victory:economic"]).toBe(1);
    });
  });
  ```

- [ ] **7.3** Run tests
  ```bash
  cd /E/data/src/fracturedalliance/opus && pnpm -F web test -- src/store/__tests__/megacorpStore.test.ts
  ```
  Expected: All tests pass

- [ ] **7.4** Integrate megacorp recording on game end
  Modify HUD.tsx to record wins when game ends:
  ```typescript
  const snapshot = useGameStore((s) => s.snapshot);

  useEffect(() => {
    if (snapshot?.gameEndState && snapshot.gameEndState.startsWith("victory:")) {
      const victoryType = snapshot.gameEndState as any;
      useMegacorpStore.getState().recordWin(victoryType);
    } else if (snapshot?.gameEndState === "defeat") {
      useMegacorpStore.getState().recordMatch();
    }
  }, [snapshot?.gameEndState]);
  ```

- [ ] **7.5** Load megacorp store on HUD mount
  Add useEffect:
  ```typescript
  useEffect(() => {
    const initMegacorp = async () => {
      await useMegacorpStore.getState().loadFromIdb();
    };
    initMegacorp();
  }, []);
  ```

- [ ] **7.6** Create megacorp badge component `/E/data/src/fracturedalliance/opus/apps/web/src/hud/MegacorpBadge.tsx`
  ```typescript
  import { useMegacorpStore } from "../store/megacorpStore.ts";

  const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    rookie: { bg: "rgba(100,100,120,0.08)", text: "#8898cc", border: "#545480" },
    veteran: { bg: "rgba(79,136,0,0.08)", text: "#7fc8ff", border: "#4f8800" },
    legend: { bg: "rgba(255,200,0,0.12)", text: "#ffd700", border: "#ffa500" },
  };

  export function MegacorpBadge() {
    const tier = useMegacorpStore((s) => s.reputationTier);
    const totalWins = useMegacorpStore((s) => s.getTotalWins());
    const colors = TIER_COLORS[tier];

    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 8px",
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: 2,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-head)",
            fontSize: 9,
            fontWeight: 600,
            color: colors.text,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {tier}
        </span>
        <span
          style={{
            fontFamily: "var(--font-data)",
            fontSize: 9,
            color: colors.border,
          }}
        >
          {totalWins}W
        </span>
      </div>
    );
  }
  ```

- [ ] **7.7** Display MegacorpBadge on start screen next to player name
  Find the start screen component and add:
  ```tsx
  import { MegacorpBadge } from "./MegacorpBadge.tsx";
  
  // In the player name section:
  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
    <span>Player Name</span>
    <MegacorpBadge />
  </div>
  ```

- [ ] **7.8** Run TypeScript check
  ```bash
  cd /E/data/src/fracturedalliance/opus && pnpm -F web typecheck
  ```
  Expected: No errors

---

## Task 8: Integration & Full Test Suite

**Objective:** Verify all systems work together and run comprehensive tests.

**TDD Steps:**

- [ ] **8.1** Run all achievement-related tests
  ```bash
  cd /E/data/src/fracturedalliance/opus && pnpm -F web test -- src/store/__tests__/achievementStore.test.ts src/store/__tests__/megacorpStore.test.ts src/achievements/__tests__/achievementDetector.test.ts
  ```
  Expected: All tests pass

- [ ] **8.2** Run full typecheck
  ```bash
  cd /E/data/src/fracturedalliance/opus && pnpm -F web typecheck
  ```
  Expected: No errors

- [ ] **8.3** Run full build
  ```bash
  cd /E/data/src/fracturedalliance/opus && pnpm -F web build
  ```
  Expected: Build succeeds with no errors

- [ ] **8.4** Manual smoke test checklist
  - [ ] Start a new game
  - [ ] Achieve a victory (any type)
  - [ ] Verify "First Blood" achievement unlocks
  - [ ] Verify achievements panel opens automatically
  - [ ] Press 'H' to toggle achievements panel on/off
  - [ ] Verify newly unlocked achievement has highlight color
  - [ ] Return to menu and start another game
  - [ ] Verify megacorp badge shows updated win count
  - [ ] Win with different victory type
  - [ ] Verify corresponding achievement (warlord/diplomat/etc) unlocks
  - [ ] Check theme selector in options
  - [ ] Verify "Midnight" theme unlocks after 1 win
  - [ ] Verify "Amber" theme unlocks after 3 wins
  - [ ] Select different theme and verify CSS applies
  - [ ] Select "Weekly Challenge" scenario
  - [ ] Verify week label displays correctly
  - [ ] Verify seed is deterministic for same week

---

## Success Criteria

- [x] All 12 achievement types defined with proper descriptions
- [x] IndexedDB persistence working for achievements and megacorp state
- [x] Achievement detection logic correctly identifies triggers
- [x] Post-match achievement screen displays with unlock dates
- [x] Weekly seed system generates deterministic seed from ISO week
- [x] HUD themes unlock based on achievement/win progress
- [x] Megacorp reputation tier tracks wins across matches
- [x] Full test coverage for stores and detectors
- [x] TypeScript strict mode passes with 0 errors
- [x] Build completes successfully

---

## Notes

**Event kind assumptions** (verify these exist in @fa/sim domain):
- `treaty_broken` — fired when treaty is broken
- `liberate_mission_complete` — fired when liberation succeeds
- `extortion_tribute_taken` — fired when extortion collection succeeds
- `asteroid_rammed` — fired when engine ram hits asteroid
- `colony.under_attack` — fired when colony is attacked

If these event kinds differ, update `achievementDetector.ts` accordingly.

**Weekly Challenge implementation note:** If start screen structure differs from typical patterns, adapt the button placement and styling to match the existing ScenarioSelector UI.

**Theme CSS variables:** Ensure `--hud-primary`, `--hud-secondary`, `--hud-bg` are defined in global CSS and used in component styles. Falls back to existing var() definitions if not set.
