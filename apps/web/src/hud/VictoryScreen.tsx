import type { GameEndState } from "@fa/domain";

type VictoryState = Exclude<GameEndState, "defeat">;

const VICTORY_MESSAGES: Record<VictoryState, string> = {
  "victory:military": "Military Supremacy — All rivals eliminated!",
  "victory:economic": "Economic Supremacy — 1,000,000 credits amassed!",
  "victory:diplomatic": "Federation Champion — Maximum standing achieved!",
  "victory:science": "Scientific Ascension — All blueprints mastered!",
  "victory:independence": "Belt Dominion — Majority of asteroids claimed!",
};

interface Props {
  condition: VictoryState;
}

export function VictoryScreen({ condition }: Props) {
  const message = VICTORY_MESSAGES[condition];
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0, 20, 8, 0.88)",
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
      <div style={{ fontSize: 18, color: "#8af", marginBottom: 32 }}>{message}</div>
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
