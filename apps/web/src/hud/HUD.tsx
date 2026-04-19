import type { Command } from "@fa/sim";
import { useGameStore } from "../store/gameStore.ts";
import { useUiStore } from "../store/uiStore.ts";
import { BuildingPanel } from "./BuildingPanel.tsx";
import { DiplomacyPanel } from "./DiplomacyPanel.tsx";
import { OrePanel } from "./OrePanel.tsx";
import { ResourceBar } from "./ResourceBar.tsx";
import { SaveLoadPanel } from "./SaveLoadPanel.tsx";
import { TransporterPanel } from "./TransporterPanel.tsx";
import { TutorialTooltip } from "./TutorialTooltip.tsx";

interface HUDProps {
  onSave: (slot: number, label: string) => Promise<void>;
  onLoad: (slot: number) => void;
  onCommand: (cmd: Command) => void;
}

export function HUD({ onSave, onLoad, onCommand }: HUDProps) {
  const snapshot = useGameStore((s) => s.snapshot);
  const toggleSaveLoad = useUiStore((s) => s.toggleSaveLoadPanel);
  const toggleDiplomacy = useUiStore((s) => s.toggleDiplomacyPanel);

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

  return (
    <>
      <ResourceBar
        credits={snapshot.credits}
        federationStanding={snapshot.federationStanding}
        tick={snapshot.tick}
      />
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
      <BuildingPanel onCommand={onCommand} />
      <OrePanel snapshot={snapshot} />
      <TransporterPanel snapshot={snapshot} onCommand={onCommand} />
      <SaveLoadPanel onSave={onSave} onLoad={onLoad} />
      <DiplomacyPanel snapshot={snapshot} onCommand={onCommand} />
      <TutorialTooltip />
    </>
  );
}
