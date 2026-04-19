import { getAllBuildingDefs } from "@fa/content";
import { useUiStore } from "../store/uiStore.ts";

const PHASE_0_BUILDINGS = [
  "airProcessor",
  "hydrationPlant",
  "hydroponics",
  "livingQuarters",
  "powerPlant",
  "mineMk1",
  "storageTower",
];

export function BuildingPanel() {
  const buildingPanelOpen = useUiStore((s) => s.buildingPanelOpen);
  const selectedAsteroidId = useUiStore((s) => s.selectedAsteroidId);
  const selectedCell = useUiStore((s) => s.selectedCell);

  if (!buildingPanelOpen || !selectedAsteroidId || !selectedCell) return null;

  const defs = getAllBuildingDefs().filter((d) => PHASE_0_BUILDINGS.includes(d.kind));

  return (
    <div
      style={{
        position: "absolute",
        right: 0,
        top: 40,
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
      <strong style={{ color: "#ffffff" }}>Place Building</strong>
      {defs.map((def) => (
        <button
          key={def.kind}
          type="button"
          style={{
            background: "#0a1830",
            border: "1px solid #224",
            color: "#c8d8ff",
            padding: "6px 8px",
            cursor: "pointer",
            textAlign: "left",
          }}
          onClick={() => {
            // Wired to render loop in Task 16
            console.log("place", def.kind, "at", selectedCell);
          }}
        >
          {def.label} — {def.costCredits.toLocaleString()}¢
        </button>
      ))}
    </div>
  );
}
