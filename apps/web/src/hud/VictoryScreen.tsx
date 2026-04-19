import type { GameEndState } from "@fa/domain";

const VICTORY_LABELS: Record<string, string> = {
  "victory.survivor": "Survivor",
  "victory.militaryDominance": "Military Dominance",
};

interface Props {
  condition: GameEndState;
}

export function VictoryScreen({ condition }: Props) {
  const label = VICTORY_LABELS[condition] ?? condition;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0, 8, 24, 0.88)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        fontFamily: "monospace",
        color: "#c8d8ff",
      }}
    >
      <div style={{ fontSize: 36, fontWeight: "bold", color: "#4f8", marginBottom: 12 }}>
        VICTORY
      </div>
      <div style={{ fontSize: 18, color: "#8af", marginBottom: 32 }}>{label}</div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          background: "#0a1830",
          border: "1px solid #4f8",
          color: "#c8d8ff",
          fontFamily: "monospace",
          fontSize: 14,
          padding: "8px 24px",
          cursor: "pointer",
        }}
      >
        Play Again
      </button>
    </div>
  );
}
