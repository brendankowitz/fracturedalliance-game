import { getOreDef } from "@fa/content";
import type { HudSnapshot } from "@fa/sim";
import { useUiStore } from "../store/uiStore.ts";

interface OrePanelProps {
  snapshot: HudSnapshot;
}

const PHASE1_ORES = ["selenium", "asteros", "barium", "crystalite"] as const;

export function OrePanel({ snapshot }: OrePanelProps) {
  const selectedAsteroidId = useUiStore((s) => s.selectedAsteroidId);

  if (!selectedAsteroidId) return null;

  const asteroid = snapshot.asteroids.find((a) => a.id === selectedAsteroidId);
  if (!asteroid) return null;

  const deposits = PHASE1_ORES.flatMap((kind) => {
    const amount = asteroid.deposits[kind];
    if (amount === undefined || amount <= 0) return [];
    const def = getOreDef(kind);
    if (!def) return [];
    return [{ kind, label: def.label, amount }];
  });

  if (deposits.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 8,
        left: 8,
        background: "rgba(0,8,20,0.9)",
        color: "#c8d8ff",
        fontFamily: "monospace",
        fontSize: 12,
        padding: "8px 12px",
        borderRadius: 4,
        border: "1px solid #224",
        minWidth: 160,
        zIndex: 10,
      }}
    >
      <div style={{ color: "#8ab0ff", marginBottom: 6, fontSize: 11, letterSpacing: 1 }}>
        {asteroid.name} — Deposits
      </div>
      {deposits.map(({ kind, label, amount }) => (
        <div key={kind} style={{ display: "flex", justifyContent: "space-between", gap: 16, lineHeight: "1.6" }}>
          <span style={{ color: "#99bbdd" }}>{label}</span>
          <span style={{ color: "#ffffff" }}>{Math.floor(amount).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
