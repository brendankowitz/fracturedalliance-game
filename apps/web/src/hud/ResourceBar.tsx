import type { DifficultyLevel } from "@fa/sim";

interface ResourceBarProps {
  credits: number;
  federationStanding: number;
  tick: number;
  seed: number;
  difficulty: DifficultyLevel;
}

export function ResourceBar({
  credits,
  federationStanding,
  tick,
  seed,
  difficulty,
}: ResourceBarProps) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        display: "flex",
        gap: 24,
        padding: "8px 16px",
        background: "rgba(0,8,20,0.85)",
        color: "#c8d8ff",
        fontFamily: "monospace",
        fontSize: 14,
        zIndex: 10,
      }}
    >
      <span>
        Credits: <strong>{credits.toLocaleString()}</strong>
      </span>
      <span>
        Standing: <strong>{federationStanding}</strong>
      </span>
      <span style={{ marginLeft: "auto", opacity: 0.6, fontSize: 12 }}>
        {difficulty} · Seed: {seed}
      </span>
      <span>Tick {tick}</span>
    </div>
  );
}
