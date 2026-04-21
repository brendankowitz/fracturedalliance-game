import type { Command } from "@fa/sim";
import { useEffect } from "react";
import { useGameStore } from "../store/gameStore.ts";
import { useUiStore } from "../store/uiStore.ts";
import { SurfaceView } from "./SurfaceView.tsx";
import { BlackMarketPanel } from "./BlackMarketPanel.tsx";
import { BlueprintShop } from "./BlueprintShop.tsx";
import { BuildingPanel } from "./BuildingPanel.tsx";
import { DiplomacyPanel } from "./DiplomacyPanel.tsx";
import { EspionagePanel } from "./EspionagePanel.tsx";
import { GameOverScreen } from "./GameOverScreen.tsx";
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

// ── Keyboard shortcut hook ───────────────────────────────────────────────────
function useHotkeys() {
  const {
    selectedAsteroidId, selectAsteroid,
    paused, setPaused,
    toggleTradePanel, toggleBlackMarket, toggleBlueprintShop,
    toggleEspionagePanel, toggleNotificationFeed, toggleDiplomacyPanel,
    toggleSaveLoadPanel,
  } = useUiStore.getState();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      const s = useUiStore.getState();
      switch (e.key) {
        case "Escape":
          if (s.selectedAsteroidId) { s.selectAsteroid(null); e.preventDefault(); }
          break;
        case " ":
          s.setPaused(!s.paused); e.preventDefault();
          break;
        case "t": case "T":
          s.toggleTradePanel(); break;
        case "m": case "M":
          s.toggleBlackMarket(); break;
        case "r": case "R":
          s.toggleBlueprintShop(); break;
        case "e": case "E":
          s.toggleEspionagePanel(); break;
        case "a": case "A":
          s.toggleNotificationFeed(); break;
        case "d": case "D":
          s.toggleDiplomacyPanel(); break;
        case "s": case "S":
          if (e.ctrlKey || e.metaKey) { s.toggleSaveLoadPanel(); e.preventDefault(); }
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
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
}

function NavBar({
  tradePanelOpen, blackMarketOpen, blueprintShopOpen, espionageOpen,
  alertsOpen, diplomacyOpen, saveLoadOpen, surfaceOpen, colonyName,
  toggleTradePanel, toggleBlackMarket, toggleBlueprintShop,
  toggleEspionage, toggleAlerts, toggleDiplomacy, toggleSaveLoad, toggleSurface,
  paused, setPaused, colorPalette, setColorPalette,
}: NavBarProps) {
  const navItems = [
    { label: colonyName ? `★ ${colonyName}` : "★ Surface", key: "—", open: surfaceOpen, toggle: toggleSurface, accent: true },
    { label: "Trade",      key: "T", open: tradePanelOpen,     toggle: toggleTradePanel },
    { label: "Market",     key: "M", open: blackMarketOpen,     toggle: toggleBlackMarket },
    { label: "Espionage",  key: "E", open: espionageOpen,       toggle: toggleEspionage },
    { label: "Research",   key: "R", open: blueprintShopOpen,   toggle: toggleBlueprintShop },
    { label: "Alerts",     key: "A", open: alertsOpen,          toggle: toggleAlerts },
    { label: "Diplomacy",  key: "D", open: diplomacyOpen,       toggle: toggleDiplomacy },
    { label: "Save/Load",  key: "⌘S", open: saveLoadOpen,       toggle: toggleSaveLoad },
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
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>
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
          style={accent ? {
            color: open ? "var(--amber)" : "rgba(255,146,0,0.7)",
            borderBottomColor: open ? "var(--amber)" : "transparent",
          } : undefined}
        >
          {label}
          {key !== "—" && <span style={{ marginLeft: 5, fontSize: 9, opacity: 0.4 }}>[{key}]</span>}
        </button>
      ))}

      {/* Right side: accessibility */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", borderLeft: "1px solid var(--border)", padding: "0 10px", gap: 4 }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, color: "var(--text-lo)", letterSpacing: 1, marginRight: 4 }}>COLOUR</span>
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
      </div>
    </nav>
  );
}

// ── HUD ──────────────────────────────────────────────────────────────────────
export function HUD({ onSave, onLoad, onCommand }: HUDProps) {
  useHotkeys();

  const snapshot    = useGameStore((s) => s.snapshot);
  const paused      = useUiStore((s) => s.paused);
  const setPaused   = useUiStore((s) => s.setPaused);
  const selectedAsteroidId     = useUiStore((s) => s.selectedAsteroidId);
  const lastSelectedAsteroidId = useUiStore((s) => s.lastSelectedAsteroidId);
  const selectAsteroid         = useUiStore((s) => s.selectAsteroid);

  // Colony quick-access: find the player's own colony from snapshot
  const playerColony = snapshot?.asteroids.find((a) => a.ownerId === snapshot.humanPlayerId) ?? null;
  const surfaceOpen = selectedAsteroidId !== null;
  const toggleSurface = () => {
    if (surfaceOpen) {
      selectAsteroid(null);
    } else {
      const target = lastSelectedAsteroidId ?? playerColony?.id ?? null;
      if (target) selectAsteroid(target);
    }
  };
  const alertsOpen  = useUiStore((s) => s.notificationFeedOpen);
  const blueprintShopOpen = useUiStore((s) => s.blueprintShopOpen);
  const espionageOpen     = useUiStore((s) => s.espionagePanelOpen);
  const blackMarketOpen   = useUiStore((s) => s.blackMarketOpen);
  const tradePanelOpen    = useUiStore((s) => s.tradePanelOpen);
  const saveLoadOpen      = useUiStore((s) => s.saveLoadPanelOpen);
  const diplomacyOpen     = useUiStore((s) => s.diplomacyPanelOpen);
  const colorPalette      = useUiStore((s) => s.colorPalette);
  const setColorPalette   = useUiStore((s) => s.setColorPalette);
  const toggleSaveLoad    = useUiStore((s) => s.toggleSaveLoadPanel);
  const toggleDiplomacy   = useUiStore((s) => s.toggleDiplomacyPanel);
  const toggleAlerts      = useUiStore((s) => s.toggleNotificationFeed);
  const toggleBlueprintShop = useUiStore((s) => s.toggleBlueprintShop);
  const toggleEspionage   = useUiStore((s) => s.toggleEspionagePanel);
  const toggleBlackMarket = useUiStore((s) => s.toggleBlackMarket);
  const toggleTradePanel  = useUiStore((s) => s.toggleTradePanel);

  if (!snapshot) {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text)", fontFamily: "var(--font-head)", fontSize: 13, letterSpacing: 2 }}>
        INITIALIZING…
      </div>
    );
  }

  if (snapshot.gameEndState === "defeat") return <GameOverScreen />;
  if (snapshot.gameEndState !== null) return <VictoryScreen condition={snapshot.gameEndState} />;

  return (
    <>
      <ResourceBar
        credits={snapshot.credits}
        federationStanding={snapshot.federationStanding}
        tick={snapshot.tick}
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

    </>
  );
}
