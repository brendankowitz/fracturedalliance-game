import { getAllBuildingDefs } from "@fa/content";
import { useUiStore } from "../store/uiStore.ts";

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
];

const BLUEPRINT_GATED = new Set(["mineMk2", "deepBoreMine"]);

export function BuildingPanel() {
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
      {defs.map((def) => {
        const locked = BLUEPRINT_GATED.has(def.kind);
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
              if (locked) return;
              console.log("place", def.kind, "at", selectedCell);
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
