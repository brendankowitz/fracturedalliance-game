import { getAllBuildingDefs } from "@fa/content";
import type { Command } from "@fa/sim";
import { useUiStore } from "../store/uiStore.ts";
import { HelpTip } from "./HelpTip.tsx";

const PHASE_1_BUILDINGS = [
  "airProcessor",
  "hydrationPlant",
  "hydroponics",
  "livingQuarters",
  "resiblock",
  "powerPlant",
  "mineMk1",
  "storageTower",
  "pleasureDome",
  "medicalCentre",
  "securityCentre",
  "ecc",
  "mineMk2",
  "deepBoreMine",
  "radiationFilter",
  "repairFacility",
  "shipYard",
];

interface BuildingPanelProps {
  onCommand: (cmd: Command) => void;
}

export function BuildingPanel({ onCommand }: BuildingPanelProps) {
  const buildingPanelOpen = useUiStore((s) => s.buildingPanelOpen);
  const selectedAsteroidId = useUiStore((s) => s.selectedAsteroidId);
  const selectedCell = useUiStore((s) => s.selectedCell);

  if (!buildingPanelOpen || !selectedAsteroidId || !selectedCell) return null;

  const defs = getAllBuildingDefs().filter((d) => PHASE_1_BUILDINGS.includes(d.kind));

  return (
    <div
      style={{
        position: "absolute",
        right: 0,
        top: 72,
        bottom: 0,
        width: 220,
        background: "rgba(0,8,20,0.9)",
        color: "#c8d8ff",
        fontFamily: "monospace",
        fontSize: 13,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        zIndex: 10,
      }}
    >
      <strong style={{ color: "#ffffff" }}>Place Building<HelpTip text="Place buildings on your asteroid to generate income, defense, and production." /></strong>
      {defs.map((def) => {
        const locked = def.blueprintRequired !== undefined;
        return (
          <button
            key={def.kind}
            type="button"
            disabled={locked}
            style={{
              background: locked ? "#050d1a" : "#0a1830",
              border: "1px solid #224",
              color: locked ? "#446" : "#c8d8ff",
              padding: "6px 8px",
              cursor: locked ? "default" : "pointer",
              textAlign: "left",
              opacity: locked ? 0.5 : 1,
            }}
            onClick={() => {
              if (locked || !selectedAsteroidId || !selectedCell) return;
              onCommand({
                kind: "placeBuilding",
                asteroidId: selectedAsteroidId,
                buildingKind: def.kind,
                cell: selectedCell,
              });
            }}
          >
            {locked ? "🔒 " : ""}
            {def.label} — {def.costCredits.toLocaleString()}¢
          </button>
        );
      })}
    </div>
  );
}
