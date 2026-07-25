import type { Command } from "@fa/sim";
import { useEffect, useRef, useState } from "react";
import { ACHIEVEMENTS, useAchievementStore } from "../store/achievementStore.ts";
import { useGameStore } from "../store/gameStore.ts";
import { useKeybindStore } from "../store/keybindStore.ts";
import { useTimeStore } from "../store/timeStore.ts";
import { useUiStore } from "../store/uiStore.ts";
import { AchievementsPanel } from "./AchievementsPanel.tsx";
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

// ── NavBar ───────────────────────────────────────────────────────────────────
interface NavBarProps {
  tradePanelOpen: boolean;
  blackMarketOpen: boolean;
  blueprintShopOpen: boolean;
  espionageOpen: boolean;
  alertsOpen: boolean;
  diplomacyOpen: boolean;
  saveLoadOpen: boolean;
  surfaceOpen: boolean;
  colonyName: string | null;
  toggleTradePanel: () => void;
  toggleBlackMarket: () => void;
  toggleBlueprintShop: () => void;
  toggleEspionage: () => void;
  toggleAlerts: () => void;
  toggleDiplomacy: () => void;
  toggleSaveLoad: () => void;
  toggleSurface: () => void;
  paused: boolean;
  setPaused: (v: boolean) => void;
  colorPalette: "normal" | "deuteranopia" | "protanopia";
  setColorPalette: (p: "normal" | "deuteranopia" | "protanopia") => void;
  fontScale: number;
  setFontScale: (v: number) => void;
  ecoMode: boolean;
  toggleEcoMode: () => void;
  showHelp: boolean;
  toggleHelp: () => void;
  slowSimMode: boolean;
  toggleSlowSimMode: () => void;
  keybindingsOpen: boolean;
  setKeybindingsOpen: (v: boolean) => void;
  achievementsOpen: boolean;
  setAchievementsOpen: (v: boolean) => void;
  unlockedCount: number;
  totalAchievements: number;
}

function NavBar({
  tradePanelOpen,
  blackMarketOpen,
  blueprintShopOpen,
  espionageOpen,
  alertsOpen,
  diplomacyOpen,
  saveLoadOpen,
  surfaceOpen,
  colonyName,
  toggleTradePanel,
  toggleBlackMarket,
  toggleBlueprintShop,
  toggleEspionage,
  toggleAlerts,
  toggleDiplomacy,
  toggleSaveLoad,
  toggleSurface,
  paused,
  setPaused,
  colorPalette,
  setColorPalette,
  fontScale,
  setFontScale,
  ecoMode,
  toggleEcoMode,
  showHelp,
  toggleHelp,
  slowSimMode,
  toggleSlowSimMode,
  keybindingsOpen,
  setKeybindingsOpen,
  achievementsOpen,
  setAchievementsOpen,
  unlockedCount,
  totalAchievements,
}: NavBarProps) {
  const navItems = [
    {
      label: colonyName ? `★ ${colonyName}` : "★ Surface",
      key: "—",
      open: surfaceOpen,
      toggle: toggleSurface,
      accent: true,
    },
    { label: "Trade", key: "T", open: tradePanelOpen, toggle: toggleTradePanel },
    { label: "Market", key: "M", open: blackMarketOpen, toggle: toggleBlackMarket },
    { label: "Espionage", key: "E", open: espionageOpen, toggle: toggleEspionage },
    { label: "Research", key: "R", open: blueprintShopOpen, toggle: toggleBlueprintShop },
    { label: "Alerts", key: "A", open: alertsOpen, toggle: toggleAlerts },
    { label: "Diplomacy", key: "D", open: diplomacyOpen, toggle: toggleDiplomacy },
    { label: "Save/Load", key: "⌘S", open: saveLoadOpen, toggle: toggleSaveLoad },
  ];

  return (
    <nav
      style={{
        position: "absolute",
        top: 40,
        left: 0,
        right: 0,
        height: 32,
        display: "flex",
        alignItems: "stretch",
        background: "var(--bg-panel)",
        borderBottom: "1px solid var(--border)",
        zIndex: 29,
      }}
    >
      {/* Pause button */}
      <button
        type="button"
        onClick={() => setPaused(!paused)}
        title="Space — pause/unpause"
        style={{
          background: paused ? "rgba(255,146,0,0.12)" : "transparent",
          border: "none",
          borderRight: "1px solid var(--border)",
          color: paused ? "var(--amber)" : "var(--text-lo)",
          fontFamily: "var(--font-data)",
          fontSize: 13,
          padding: "0 14px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 5,
          transition: "color 0.12s",
        }}
      >
        {paused ? "▶" : "⏸"}
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.5,
          }}
        >
          {paused ? "PAUSED" : "LIVE"}
        </span>
      </button>

      {/* Separator */}
      <div style={{ width: 1, background: "var(--border)", margin: "6px 0" }} />

      {/* Panel nav buttons */}
      {navItems.map(({ label, key, open, toggle, accent }) => (
        <button
          key={label}
          type="button"
          onClick={toggle}
          aria-pressed={open}
          aria-label={`${label} panel`}
          className="fa-nav-btn"
          title={`${key} — toggle ${label}`}
          style={
            accent
              ? {
                  color: open ? "var(--amber)" : "rgba(255,146,0,0.7)",
                  borderBottomColor: open ? "var(--amber)" : "transparent",
                }
              : undefined
          }
        >
          {label}
          {key !== "—" && <span style={{ marginLeft: 5, fontSize: 9, opacity: 0.4 }}>[{key}]</span>}
        </button>
      ))}

      {/* Right side: accessibility + utility */}
      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          borderLeft: "1px solid var(--border)",
          padding: "0 10px",
          gap: 4,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 9,
            color: "var(--text-lo)",
            letterSpacing: 1,
            marginRight: 4,
          }}
        >
          COLOUR
        </span>
        {(["normal", "deuteranopia", "protanopia"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setColorPalette(p)}
            aria-pressed={colorPalette === p}
            style={{
              background: colorPalette === p ? "rgba(0,196,224,0.12)" : "transparent",
              border: `1px solid ${colorPalette === p ? "var(--accent)" : "var(--border)"}`,
              color: colorPalette === p ? "var(--accent)" : "var(--text-lo)",
              fontFamily: "var(--font-data)",
              fontSize: 9,
              padding: "2px 6px",
              cursor: "pointer",
            }}
          >
            {p === "normal" ? "STD" : p === "deuteranopia" ? "DEU" : "PRO"}
          </button>
        ))}

        <span style={{ color: "var(--border)", margin: "0 4px" }}>|</span>
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 9,
            color: "var(--text-lo)",
            letterSpacing: 1,
          }}
        >
          TEXT
        </span>
        {([100, 125, 150, 175, 200] as const).map((scale) => (
          <button
            key={scale}
            type="button"
            onClick={() => setFontScale(scale)}
            aria-pressed={fontScale === scale}
            aria-label={`Font size ${scale}%`}
            style={{
              background: fontScale === scale ? "rgba(0,196,224,0.12)" : "transparent",
              border: `1px solid ${fontScale === scale ? "var(--accent)" : "var(--border)"}`,
              color: fontScale === scale ? "var(--accent)" : "var(--text-lo)",
              fontFamily: "var(--font-data)",
              fontSize: 9,
              padding: "2px 5px",
              cursor: "pointer",
            }}
          >
            {scale}%
          </button>
        ))}

        <span style={{ color: "var(--border)", margin: "0 4px" }}>|</span>
        <button
          type="button"
          onClick={toggleEcoMode}
          aria-pressed={ecoMode}
          aria-label="Eco mode — reduces visual effects for performance"
          style={{
            background: ecoMode ? "rgba(0,204,102,0.12)" : "transparent",
            border: `1px solid ${ecoMode ? "var(--green)" : "var(--border)"}`,
            color: ecoMode ? "var(--green)" : "var(--text-lo)",
            fontFamily: "var(--font-data)",
            fontSize: 9,
            padding: "2px 5px",
            cursor: "pointer",
          }}
        >
          Eco
        </button>
        <button
          type="button"
          onClick={toggleHelp}
          aria-pressed={showHelp}
          aria-label="Toggle help tooltips"
          style={{
            background: showHelp ? "rgba(0,196,224,0.12)" : "transparent",
            border: `1px solid ${showHelp ? "var(--accent)" : "var(--border)"}`,
            color: showHelp ? "var(--accent)" : "var(--text-lo)",
            fontFamily: "var(--font-data)",
            fontSize: 9,
            padding: "2px 5px",
            cursor: "pointer",
          }}
        >
          Help
        </button>
        <button
          type="button"
          onClick={toggleSlowSimMode}
          aria-pressed={slowSimMode}
          aria-label="Slow simulation mode"
          style={{
            background: slowSimMode ? "rgba(0,204,102,0.12)" : "transparent",
            border: `1px solid ${slowSimMode ? "var(--green)" : "var(--border)"}`,
            color: slowSimMode ? "var(--green)" : "var(--text-lo)",
            fontFamily: "var(--font-data)",
            fontSize: 9,
            padding: "2px 5px",
            cursor: "pointer",
          }}
        >
          Turn
        </button>
        <button
          type="button"
          onClick={() => setKeybindingsOpen(!keybindingsOpen)}
          aria-pressed={keybindingsOpen}
          aria-label="Keybindings"
          style={{
            background: keybindingsOpen ? "rgba(136,68,204,0.15)" : "transparent",
            border: `1px solid ${keybindingsOpen ? "#8844cc" : "var(--border)"}`,
            color: keybindingsOpen ? "#cc88ff" : "var(--text-lo)",
            fontFamily: "var(--font-data)",
            fontSize: 9,
            padding: "2px 5px",
            cursor: "pointer",
          }}
        >
          Keys
        </button>
        <button
          type="button"
          onClick={() => setAchievementsOpen(!achievementsOpen)}
          aria-pressed={achievementsOpen}
          aria-label="Achievements"
          style={{
            background: achievementsOpen ? "rgba(255,146,0,0.12)" : "transparent",
            border: `1px solid ${achievementsOpen ? "var(--amber)" : "var(--border)"}`,
            color: achievementsOpen ? "var(--amber)" : "var(--text-lo)",
            fontFamily: "var(--font-data)",
            fontSize: 9,
            padding: "2px 5px",
            cursor: "pointer",
          }}
        >
          ★ {unlockedCount}/{totalAchievements}
        </button>
      </div>
    </nav>
  );
}

// ── HUD ──────────────────────────────────────────────────────────────────────
export function HUD({ onSave, onLoad, onCommand }: HUDProps) {
  const snapshot = useGameStore((s) => s.snapshot);

  // Core UI state
  const paused = useUiStore((s) => s.paused);
  const setPaused = useUiStore((s) => s.setPaused);
  const selectedAsteroidId = useUiStore((s) => s.selectedAsteroidId);
  const lastSelectedAsteroidId = useUiStore((s) => s.lastSelectedAsteroidId);
  const selectAsteroid = useUiStore((s) => s.selectAsteroid);

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

  const toggleSaveLoad = useUiStore((s) => s.toggleSaveLoadPanel);
  const toggleDiplomacy = useUiStore((s) => s.toggleDiplomacyPanel);
  const toggleAlerts = useUiStore((s) => s.toggleNotificationFeed);
  const toggleBlueprintShop = useUiStore((s) => s.toggleBlueprintShop);
  const toggleEspionage = useUiStore((s) => s.toggleEspionagePanel);
  const toggleBlackMarket = useUiStore((s) => s.toggleBlackMarket);
  const toggleTradePanel = useUiStore((s) => s.toggleTradePanel);

  // Keybinds + achievements
  const keybinds = useKeybindStore((s) => s.keybinds);
  const unlockedAchs = useAchievementStore((s) => s.unlocked);

  const [keybindingsOpen, setKeybindingsOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
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

  // Colony quick-access: find the player's own colony from snapshot
  const playerColony = snapshot.asteroids.find((a) => a.ownerId === snapshot.humanPlayerId) ?? null;
  const surfaceOpen = selectedAsteroidId !== null;
  const toggleSurface = () => {
    if (surfaceOpen) {
      selectAsteroid(null);
    } else {
      const target = lastSelectedAsteroidId ?? playerColony?.id ?? null;
      if (target) selectAsteroid(target);
    }
  };

  return (
    <>
      <ResourceBar
        credits={snapshot.credits}
        federationStanding={snapshot.federationStanding}
        date={snapshot.date}
        day={snapshot.day}
        seed={snapshot.seed}
        difficulty={snapshot.difficulty}
      />

      <NavBar
        tradePanelOpen={tradePanelOpen}
        blackMarketOpen={blackMarketOpen}
        blueprintShopOpen={blueprintShopOpen}
        espionageOpen={espionageOpen}
        alertsOpen={alertsOpen}
        diplomacyOpen={diplomacyOpen}
        saveLoadOpen={saveLoadOpen}
        surfaceOpen={surfaceOpen}
        colonyName={playerColony?.name ?? null}
        toggleTradePanel={toggleTradePanel}
        toggleBlackMarket={toggleBlackMarket}
        toggleBlueprintShop={toggleBlueprintShop}
        toggleEspionage={toggleEspionage}
        toggleAlerts={toggleAlerts}
        toggleDiplomacy={toggleDiplomacy}
        toggleSaveLoad={toggleSaveLoad}
        toggleSurface={toggleSurface}
        paused={paused}
        setPaused={setPaused}
        colorPalette={colorPalette}
        setColorPalette={setColorPalette}
        fontScale={fontScale}
        setFontScale={setFontScale}
        ecoMode={ecoMode}
        toggleEcoMode={toggleEcoMode}
        showHelp={showHelp}
        toggleHelp={toggleHelp}
        slowSimMode={slowSimMode}
        toggleSlowSimMode={toggleSlowSimMode}
        keybindingsOpen={keybindingsOpen}
        setKeybindingsOpen={setKeybindingsOpen}
        achievementsOpen={achievementsOpen}
        setAchievementsOpen={setAchievementsOpen}
        unlockedCount={unlockedAchs.size}
        totalAchievements={ACHIEVEMENTS.length}
      />

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

      {keybindingsOpen && (
        <div style={{ position: "absolute", top: 72, left: 0, zIndex: 20, width: 220 }}>
          <KeybindingsPanel />
        </div>
      )}
      {achievementsOpen && <AchievementsPanel onClose={() => setAchievementsOpen(false)} />}
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
    </>
  );
}
