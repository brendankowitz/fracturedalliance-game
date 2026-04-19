import type { Command } from "@fa/sim";
import { useGameStore } from "../store/gameStore.ts";
import { useUiStore } from "../store/uiStore.ts";
import { AsteroidInspector } from "./AsteroidInspector.tsx";
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
        style={{
          position: "absolute",
          top: 8,
          right: 120,
          zIndex: 11,
          background: "#0a1830",
          border: "1px solid #224",
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
        style={{
          position: "absolute",
          top: 8,
          right: 16,
          zIndex: 11,
          background: "#0a1830",
          border: "1px solid #224",
          color: "#c8d8ff",
          fontFamily: "monospace",
          padding: "4px 10px",
          cursor: "pointer",
        }}
      >
        ☰ Save/Load
      </button>
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
