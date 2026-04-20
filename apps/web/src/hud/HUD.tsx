import type { Command } from "@fa/sim";
import { useEffect, useRef, useState } from "react";
import { useKeybindStore } from "../store/keybindStore.ts";
import { ACHIEVEMENTS, useAchievementStore } from "../store/achievementStore.ts";
import { THEME_COLORS, useMegacorpStore } from "../store/megacorpStore.ts";
import { useGameStore } from "../store/gameStore.ts";
import { useUiStore } from "../store/uiStore.ts";
import { AchievementsPanel } from "./AchievementsPanel.tsx";
import { AsteroidInspector } from "./AsteroidInspector.tsx";
import { BlackMarketPanel } from "./BlackMarketPanel.tsx";
import { BlueprintShop } from "./BlueprintShop.tsx";
import { BuildingPanel } from "./BuildingPanel.tsx";
import { DiplomacyPanel } from "./DiplomacyPanel.tsx";
import { EspionagePanel } from "./EspionagePanel.tsx";
import { GameOverScreen } from "./GameOverScreen.tsx";
import { KeybindingsPanel } from "./KeybindingsPanel.tsx";
import { NotificationFeed } from "./NotificationFeed.tsx";
import { OrePanel } from "./OrePanel.tsx";
import { ResourceBar } from "./ResourceBar.tsx";
import { SaveLoadPanel } from "./SaveLoadPanel.tsx";
import { TradePanel } from "./TradePanel.tsx";
import { TransporterPanel } from "./TransporterPanel.tsx";
import { TutorialTooltip } from "./TutorialTooltip.tsx";
import { VictoryScreen } from "./VictoryScreen.tsx";

interface HUDProps {
  onSave: (slot: number, label: string) => Promise<void>;
  onLoad: (slot: number) => void;
  onCommand: (cmd: Command) => void;
}

export function HUD({ onSave, onLoad, onCommand }: HUDProps) {
  const snapshot = useGameStore((s) => s.snapshot);
  const toggleSaveLoad = useUiStore((s) => s.toggleSaveLoadPanel);
  const toggleDiplomacy = useUiStore((s) => s.toggleDiplomacyPanel);
  const toggleAlerts = useUiStore((s) => s.toggleNotificationFeed);
  const toggleBlueprintShop = useUiStore((s) => s.toggleBlueprintShop);
  const toggleEspionage = useUiStore((s) => s.toggleEspionagePanel);
  const toggleBlackMarket = useUiStore((s) => s.toggleBlackMarket);
  const toggleTradePanel = useUiStore((s) => s.toggleTradePanel);
  const alertsOpen = useUiStore((s) => s.notificationFeedOpen);
  const blueprintShopOpen = useUiStore((s) => s.blueprintShopOpen);
  const espionageOpen = useUiStore((s) => s.espionagePanelOpen);
  const blackMarketOpen = useUiStore((s) => s.blackMarketOpen);
  const tradePanelOpen = useUiStore((s) => s.tradePanelOpen);
  const saveLoadOpen = useUiStore((s) => s.saveLoadPanelOpen);
  const diplomacyOpen = useUiStore((s) => s.diplomacyPanelOpen);
  const colorPalette = useUiStore((s) => s.colorPalette);
  const setColorPalette = useUiStore((s) => s.setColorPalette);
  const fontScale = useUiStore((s) => s.fontScale);
  const setFontScale = useUiStore((s) => s.setFontScale);
  const ecoMode = useUiStore((s) => s.ecoMode);
  const toggleEcoMode = useUiStore((s) => s.toggleEcoMode);
  const showHelp = useUiStore((s) => s.showHelp);
  const toggleHelp = useUiStore((s) => s.toggleHelp);
  const slowSimMode = useUiStore((s) => s.slowSimMode);
  const toggleSlowSimMode = useUiStore((s) => s.toggleSlowSimMode);
  const triggerEndTurn = useUiStore((s) => s.triggerEndTurn);
  const keybinds = useKeybindStore((s) => s.keybinds);
  const hudTheme = useMegacorpStore((s) => s.hudTheme);
  const tc = THEME_COLORS[hudTheme];
  const [keybindingsOpen, setKeybindingsOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const unlockedAchs = useAchievementStore((s) => s.unlocked);
  const [achToast, setAchToast] = useState<string | null>(null);
  const prevUnlockedRef = useRef<Set<string>>(new Set(unlockedAchs));

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const s = useUiStore.getState();
      const key = e.key === " " ? " " : e.key.toLowerCase();

      if (key === keybinds.pause) {
        s.setPaused(!s.paused);
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
          color: "#c8d8ff",
          fontFamily: "monospace",
        }}
      >
        Loading…
      </div>
    );
  }

  if (snapshot.gameEndState === "defeat") {
    return <GameOverScreen />;
  }

  if (snapshot.gameEndState !== null) {
    return <VictoryScreen condition={snapshot.gameEndState} />;
  }

  return (
    <>
      <ResourceBar
        credits={snapshot.credits}
        federationStanding={snapshot.federationStanding}
        tick={snapshot.tick}
        seed={snapshot.seed}
        difficulty={snapshot.difficulty}
      />
      <button
        type="button"
        onClick={toggleBlackMarket}
        aria-label="Market panel"
        aria-pressed={blackMarketOpen}
        style={{
          position: "absolute",
          top: 8,
          right: 572,
          zIndex: 11,
          background: "#0a1830",
          border: `1px solid ${blackMarketOpen ? "#c8d8ff" : "#224"}`,
          color: "#c8d8ff",
          fontFamily: "monospace",
          padding: "4px 10px",
          cursor: "pointer",
        }}
      >
        ☰ Market
      </button>
      <button
        type="button"
        onClick={toggleTradePanel}
        aria-label="Trade panel"
        aria-pressed={tradePanelOpen}
        style={{
          position: "absolute",
          top: 8,
          right: 686,
          zIndex: 11,
          background: "#0a1830",
          border: `1px solid ${tradePanelOpen ? "#c8d8ff" : "#224"}`,
          color: "#c8d8ff",
          fontFamily: "monospace",
          padding: "4px 10px",
          cursor: "pointer",
        }}
      >
        ☰ Trade
      </button>
      <button
        type="button"
        onClick={toggleEspionage}
        aria-label="Espionage panel"
        aria-pressed={espionageOpen}
        style={{
          position: "absolute",
          top: 8,
          right: 458,
          zIndex: 11,
          background: "#0a1830",
          border: `1px solid ${espionageOpen ? "#c8d8ff" : "#224"}`,
          color: "#c8d8ff",
          fontFamily: "monospace",
          padding: "4px 10px",
          cursor: "pointer",
        }}
      >
        ☰ Espionage
      </button>
      <button
        type="button"
        onClick={toggleBlueprintShop}
        aria-label="Research panel"
        aria-pressed={blueprintShopOpen}
        style={{
          position: "absolute",
          top: 8,
          right: 344,
          zIndex: 11,
          background: "#0a1830",
          border: `1px solid ${blueprintShopOpen ? "#c8d8ff" : "#224"}`,
          color: "#c8d8ff",
          fontFamily: "monospace",
          padding: "4px 10px",
          cursor: "pointer",
        }}
      >
        ☰ Research
      </button>
      <button
        type="button"
        onClick={toggleAlerts}
        aria-label="Alerts panel"
        aria-pressed={alertsOpen}
        style={{
          position: "absolute",
          top: 8,
          right: 230,
          zIndex: 11,
          background: "#0a1830",
          border: `1px solid ${alertsOpen ? "#c8d8ff" : "#224"}`,
          color: "#c8d8ff",
          fontFamily: "monospace",
          padding: "4px 10px",
          cursor: "pointer",
        }}
      >
        ☰ Alerts
      </button>
      <button
        type="button"
        onClick={toggleDiplomacy}
        aria-label="Diplomacy panel"
        aria-pressed={diplomacyOpen}
        style={{
          position: "absolute",
          top: 8,
          right: 120,
          zIndex: 11,
          background: "#0a1830",
          border: `1px solid ${diplomacyOpen ? "#c8d8ff" : "#224"}`,
          color: "#c8d8ff",
          fontFamily: "monospace",
          padding: "4px 10px",
          cursor: "pointer",
        }}
      >
        ☰ Diplomacy
      </button>
      <button
        type="button"
        onClick={toggleSaveLoad}
        aria-label="Save/Load panel"
        aria-pressed={saveLoadOpen}
        style={{
          position: "absolute",
          top: 8,
          right: 16,
          zIndex: 11,
          background: "#0a1830",
          border: `1px solid ${saveLoadOpen ? "#c8d8ff" : "#224"}`,
          color: "#c8d8ff",
          fontFamily: "monospace",
          padding: "4px 10px",
          cursor: "pointer",
        }}
      >
        ☰ Save/Load
      </button>
      <div
        style={{
          position: "absolute",
          top: 44,
          left: 0,
          display: "flex",
          gap: 4,
          padding: "2px 8px",
          background: `${tc.bg}cc`,
          borderBottom: `1px solid ${tc.border}`,
          zIndex: 11,
          fontSize: 10,
          fontFamily: "monospace",
          alignItems: "center",
          color: tc.text,
        }}
        role="group"
        aria-label="Accessibility controls"
      >
        <span style={{ color: "#446", marginRight: 4 }}>A11y:</span>
        {(["normal", "deuteranopia", "protanopia"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => { setColorPalette(p); }}
            aria-pressed={colorPalette === p}
            aria-label={`Colour palette: ${p}`}
            style={{
              background: colorPalette === p ? "#1a3860" : "#0a1830",
              border: `1px solid ${colorPalette === p ? "#4488cc" : "#224"}`,
              color: "#c8d8ff",
              fontFamily: "monospace",
              fontSize: 9,
              padding: "2px 5px",
              cursor: "pointer",
            }}
          >
            {p === "normal" ? "Normal" : p === "deuteranopia" ? "Deut" : "Prot"}
          </button>
        ))}
        <span style={{ color: "#446", margin: "0 4px" }}>|</span>
        <span style={{ color: "#667" }}>Text:</span>
        {([100, 125, 150, 175, 200] as const).map((scale) => (
          <button
            key={scale}
            type="button"
            onClick={() => { setFontScale(scale); }}
            aria-pressed={fontScale === scale}
            aria-label={`Font size ${scale}%`}
            style={{
              background: fontScale === scale ? "#1a3860" : "#0a1830",
              border: `1px solid ${fontScale === scale ? "#4488cc" : "#224"}`,
              color: "#c8d8ff",
              fontFamily: "monospace",
              fontSize: 9,
              padding: "2px 5px",
              cursor: "pointer",
            }}
          >
            {scale}%
          </button>
        ))}
        <span style={{ color: "#446", margin: "0 4px" }}>|</span>
        <button
          type="button"
          onClick={toggleEcoMode}
          aria-pressed={ecoMode}
          aria-label="Eco mode — reduces visual effects for performance"
          style={{
            background: ecoMode ? "#0a200a" : "#0a1830",
            border: `1px solid ${ecoMode ? "#44aa44" : "#224"}`,
            color: ecoMode ? "#88cc88" : "#c8d8ff",
            fontFamily: "monospace",
            fontSize: 9,
            padding: "2px 5px",
            cursor: "pointer",
          }}
        >
          Eco
        </button>
        <span style={{ color: "#446", margin: "0 4px" }}>|</span>
        <button
          type="button"
          onClick={toggleHelp}
          aria-pressed={showHelp}
          aria-label="Toggle help tooltips"
          style={{
            background: showHelp ? "#0a1820" : "#0a1830",
            border: `1px solid ${showHelp ? "#4488cc" : "#224"}`,
            color: showHelp ? "#4488cc" : "#c8d8ff",
            fontFamily: "monospace",
            fontSize: 9,
            padding: "2px 5px",
            cursor: "pointer",
          }}
        >
          Help
        </button>
        <span style={{ color: "#446", margin: "0 4px" }}>|</span>
        <button
          type="button"
          onClick={toggleSlowSimMode}
          aria-pressed={slowSimMode}
          aria-label="Slow simulation mode"
          style={{
            background: slowSimMode ? "#0a2010" : "#0a1830",
            border: `1px solid ${slowSimMode ? "#44aa44" : "#224"}`,
            color: slowSimMode ? "#88cc88" : "#c8d8ff",
            fontFamily: "monospace",
            fontSize: 9,
            padding: "2px 5px",
            cursor: "pointer",
          }}
        >
          Turn
        </button>
        <span style={{ color: "#446", margin: "0 4px" }}>|</span>
        <button
          type="button"
          onClick={() => setKeybindingsOpen((v) => !v)}
          aria-pressed={keybindingsOpen}
          aria-label="Keybindings"
          style={{
            background: keybindingsOpen ? "#1a1030" : "#0a1830",
            border: `1px solid ${keybindingsOpen ? "#8844cc" : "#224"}`,
            color: keybindingsOpen ? "#cc88ff" : "#c8d8ff",
            fontFamily: "monospace",
            fontSize: 9,
            padding: "2px 5px",
            cursor: "pointer",
          }}
        >
          Keys
        </button>
        <span style={{ color: "#446", margin: "0 4px" }}>|</span>
        <button
          type="button"
          onClick={() => setAchievementsOpen((v) => !v)}
          aria-pressed={achievementsOpen}
          aria-label="Achievements"
          style={{
            background: achievementsOpen ? "#201820" : "#0a1830",
            border: `1px solid ${achievementsOpen ? "#cc8844" : "#224"}`,
            color: achievementsOpen ? "#ffaa44" : "#c8d8ff",
            fontFamily: "monospace",
            fontSize: 9,
            padding: "2px 5px",
            cursor: "pointer",
          }}
        >
          ★ {unlockedAchs.size}/{ACHIEVEMENTS.length}
        </button>
      </div>
      {keybindingsOpen && (
        <div style={{ position: "absolute", top: 72, left: 0, zIndex: 20, width: 220 }}>
          <KeybindingsPanel />
        </div>
      )}
      {achievementsOpen && (
        <AchievementsPanel onClose={() => setAchievementsOpen(false)} />
      )}
      {achToast && (
        <div
          style={{
            position: "absolute",
            bottom: 80,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1a2820",
            border: "1px solid #fa4",
            color: "#fa4",
            fontFamily: "monospace",
            fontSize: 12,
            padding: "8px 16px",
            zIndex: 50,
            pointerEvents: "none",
          }}
        >
          ★ {achToast}
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
            background: "#1a3860",
            border: "2px solid #4488cc",
            color: "#c8d8ff",
            fontFamily: "monospace",
            fontSize: 14,
            fontWeight: "bold",
            padding: "10px 24px",
            cursor: "pointer",
            letterSpacing: 1,
          }}
        >
          END TURN
        </button>
      )}
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
      <AsteroidInspector onCommand={onCommand} />
      <TutorialTooltip />
    </>
  );
}
