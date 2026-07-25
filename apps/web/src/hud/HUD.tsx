import type { Command } from "@fa/sim";
import { useEffect, useRef, useState } from "react";
import { ACHIEVEMENTS, useAchievementStore } from "../store/achievementStore.ts";
import { useGameStore } from "../store/gameStore.ts";
import { useKeybindStore } from "../store/keybindStore.ts";
import { useTimeStore } from "../store/timeStore.ts";
import { useUiStore } from "../store/uiStore.ts";
import { BlackMarketPanel } from "./BlackMarketPanel.tsx";
import { BlueprintShop } from "./BlueprintShop.tsx";
import { BuildingPanel } from "./BuildingPanel.tsx";
import { ColonyConsole } from "./ColonyConsole.tsx";
import { DiplomacyPanel } from "./DiplomacyPanel.tsx";
import { EspionagePanel } from "./EspionagePanel.tsx";
import { GameOverScreen } from "./GameOverScreen.tsx";
import { NotificationFeed } from "./NotificationFeed.tsx";
import { OrePanel } from "./OrePanel.tsx";
import { SaveLoadPanel } from "./SaveLoadPanel.tsx";
import { SurfaceView } from "./SurfaceView.tsx";
import { TradePanel } from "./TradePanel.tsx";
import { TransporterPanel } from "./TransporterPanel.tsx";
import { TutorialTooltip } from "./TutorialTooltip.tsx";
import { VictoryScreen } from "./VictoryScreen.tsx";

interface HUDProps {
  onSave: (slot: number, label: string) => Promise<void>;
  onLoad: (slot: number) => void;
  onCommand: (cmd: Command) => void;
}

// ── HUD ──────────────────────────────────────────────────────────────────────
export function HUD({ onSave, onLoad, onCommand }: HUDProps) {
  const snapshot = useGameStore((s) => s.snapshot);

  // Core UI state
  const selectedAsteroidId = useUiStore((s) => s.selectedAsteroidId);

  const slowSimMode = useUiStore((s) => s.slowSimMode);
  const triggerEndTurn = useUiStore((s) => s.triggerEndTurn);

  // Keybinds + achievements
  const keybinds = useKeybindStore((s) => s.keybinds);
  const unlockedAchs = useAchievementStore((s) => s.unlocked);

  const [achToast, setAchToast] = useState<string | null>(null);
  const prevUnlockedRef = useRef<Set<string>>(new Set(unlockedAchs));

  // Achievement toasts
  useEffect(() => {
    const prev = prevUnlockedRef.current;
    for (const id of unlockedAchs) {
      if (!prev.has(id)) {
        const def = ACHIEVEMENTS.find((a) => a.id === id);
        if (def) {
          setAchToast(def.secret ? "Secret achievement unlocked!" : `Achievement: ${def.name}`);
          setTimeout(() => setAchToast(null), 4000);
        }
      }
    }
    prevUnlockedRef.current = new Set(unlockedAchs);
  }, [unlockedAchs]);

  // Keybind-driven global hotkeys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      const s = useUiStore.getState();
      // "+" and "−" sit behind Shift/numpad on most layouts; fold the unshifted twins in
      // so the speed keys work without contortions.
      const rawKey = e.key === " " ? " " : e.key.toLowerCase();
      const key = rawKey === "=" ? "+" : rawKey === "_" ? "-" : rawKey;

      // Escape — deselect asteroid (close SurfaceView)
      if (e.key === "Escape") {
        if (s.selectedAsteroidId !== null) {
          s.selectAsteroid(null);
          e.preventDefault();
        }
        return;
      }

      // Ctrl/Cmd + S — save/load panel
      if ((e.ctrlKey || e.metaKey) && key === "s") {
        s.toggleSaveLoadPanel();
        e.preventDefault();
        return;
      }

      if (key === keybinds.pause) {
        s.setPaused(!s.paused);
        e.preventDefault();
      } else if (key === keybinds.speedUp) {
        useTimeStore.getState().stepTimeScale(1);
        s.setPaused(false);
        e.preventDefault();
      } else if (key === keybinds.speedDown) {
        useTimeStore.getState().stepTimeScale(-1);
        e.preventDefault();
      } else if (key === keybinds.openEspionage) {
        s.toggleEspionagePanel();
      } else if (key === keybinds.openDiplomacy) {
        s.toggleDiplomacyPanel();
      } else if (key === keybinds.openTrade) {
        s.toggleTradePanel();
      } else if (key === keybinds.openBlueprints) {
        s.toggleBlueprintShop();
      } else if (key === keybinds.openBlackMarket) {
        s.toggleBlackMarket();
      } else if (key === keybinds.openAlerts) {
        s.toggleNotificationFeed();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keybinds]);

  if (!snapshot) {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text)",
          fontFamily: "var(--font-head)",
          fontSize: 13,
          letterSpacing: 2,
        }}
      >
        INITIALIZING…
      </div>
    );
  }

  if (snapshot.gameEndState === "defeat") return <GameOverScreen />;
  if (snapshot.gameEndState !== null) return <VictoryScreen condition={snapshot.gameEndState} />;

  return (
    <ColonyConsole snapshot={snapshot}>
      <BlackMarketPanel onCommand={onCommand} />
      <TradePanel onCommand={onCommand} />
      <BuildingPanel onCommand={onCommand} />
      <OrePanel snapshot={snapshot} />
      <TransporterPanel snapshot={snapshot} onCommand={onCommand} />
      <SaveLoadPanel onSave={onSave} onLoad={onLoad} />
      <DiplomacyPanel snapshot={snapshot} onCommand={onCommand} />
      <BlueprintShop onCommand={onCommand} />
      <EspionagePanel onCommand={onCommand} />
      <NotificationFeed />
      <SurfaceView onCommand={onCommand} />
      <TutorialTooltip />

      {achToast && (
        <div
          style={{
            position: "absolute",
            bottom: 80,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--bg-panel)",
            border: "1px solid var(--amber)",
            color: "var(--amber)",
            fontFamily: "var(--font-data)",
            fontSize: 12,
            padding: "8px 16px",
            zIndex: 50,
            pointerEvents: "none",
            letterSpacing: 0.5,
          }}
        >
          ★ {achToast}
        </div>
      )}
      {!selectedAsteroidId && (
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            zIndex: 5,
            color: "rgba(100,140,180,0.4)",
            fontFamily: "var(--font-data)",
            fontSize: 9,
            letterSpacing: 0.5,
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          Scroll to zoom · Drag to pan
        </div>
      )}
      {slowSimMode && (
        <button
          type="button"
          onClick={triggerEndTurn}
          style={{
            position: "absolute",
            bottom: 20,
            right: 20,
            zIndex: 40,
            background: "rgba(0,196,224,0.12)",
            border: "2px solid var(--accent)",
            color: "var(--accent)",
            fontFamily: "var(--font-head)",
            fontSize: 14,
            fontWeight: "bold",
            padding: "10px 24px",
            cursor: "pointer",
            letterSpacing: 2,
          }}
        >
          END TURN
        </button>
      )}
    </ColonyConsole>
  );
}
