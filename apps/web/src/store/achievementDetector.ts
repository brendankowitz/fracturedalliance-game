import type { HudSnapshot } from "@fa/sim";
import { useAchievementStore } from "./achievementStore.ts";
import { useMegacorpStore } from "./megacorpStore.ts";
import { useUiStore } from "./uiStore.ts";

const blackMarketCount = new Map<string, number>();

export function detectAchievements(snap: HudSnapshot): void {
  const { unlock } = useAchievementStore.getState();
  const humanId = snap.humanPlayerId;

  const humanAsteroids = snap.asteroids.filter((a) => a.ownerId === humanId);

  if (humanAsteroids.some((a) => a.buildingsGrid.length > 0)) {
    unlock("first_building");
  }

  if (humanAsteroids.some((a) => a.buildingKinds.filter((k) => k === "mineMk1").length >= 5)) {
    unlock("five_mines");
  }

  if (snap.credits >= 100_000) {
    unlock("wealthy_baron");
  }

  const totalActiveTreaties = snap.diplomacy.reduce(
    (sum, entry) => sum + entry.activeTreaties.length,
    0,
  );
  if (totalActiveTreaties >= 3) {
    unlock("diplomat");
  }

  const purchases = (blackMarketCount.get(humanId) ?? 0);
  const newPurchases = snap.events.filter((e) => e.kind === "blackmarket.purchase").length;
  const updatedPurchases = purchases + newPurchases;
  if (newPurchases > 0) blackMarketCount.set(humanId, updatedPurchases);
  if (updatedPurchases >= 3) unlock("black_market");

  if (snap.agents.length >= 3) {
    unlock("espionage");
  }

  if (snap.gameEndState !== null) {
    unlock("first_win");
    useUiStore.getState().unlockScenario("advanced-primer");

    if (snap.gameEndState === "victory:independence") { unlock("independence_win"); useMegacorpStore.getState().addRep(10); }
    else if (snap.gameEndState === "victory:military") { unlock("military_win"); useMegacorpStore.getState().addRep(10); }
    else if (snap.gameEndState === "victory:economic") { unlock("economic_win"); useMegacorpStore.getState().addRep(10); }
    else if (snap.gameEndState === "victory:science") { unlock("science_win"); useMegacorpStore.getState().addRep(10); }
    else if (snap.gameEndState === "defeat") { useMegacorpStore.getState().addRep(-5); }

    if (snap.tick <= 200) unlock("speed_run");
  }
}
