import type { DifficultyLevel } from "@fa/sim";
import { HelpTip } from "./HelpTip.tsx";

interface ResourceBarProps {
  credits: number;
  federationStanding: number;
  tick: number;
  seed: number;
  difficulty: DifficultyLevel;
}

const DIFFICULTY_COLOR: Record<DifficultyLevel, string> = {
  intern:   "#00cc66",
  manager:  "#00c4e0",
  director: "#ff9200",
  ceo:      "#ff5500",
  board:    "#ff2200",
};

function standingColor(v: number): string {
  if (v >= 40)  return "#00cc66";
  if (v >= 10)  return "#00c4e0";
  if (v >= -10) return "#ff9200";
  return "#ff3322";
}

export function ResourceBar({ credits, federationStanding, tick, seed, difficulty }: ResourceBarProps) {
  const mins = Math.floor((tick * 50) / 60000);
  const secs = Math.floor((tick * 50) / 1000) % 60;
  const elapsed = `${String(mins).padStart(3, "0")}:${String(secs).padStart(2, "0")}`;
  const standingBar = Math.max(0, Math.min(100, (federationStanding + 100) / 2));

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 40,
        display: "flex",
        alignItems: "center",
        background: "var(--bg-panel)",
        borderBottom: "1px solid var(--border)",
        zIndex: 30,
        flexShrink: 0,
      }}
    >
      {/* Faction name */}
      <div style={{ padding: "0 16px", borderRight: "1px solid var(--border)", height: "100%", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: "var(--font-head)", fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "var(--accent)", textShadow: "0 0 8px rgba(0,196,224,0.4)" }}>
          HELION CORP
        </span>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: DIFFICULTY_COLOR[difficulty], letterSpacing: 1, fontWeight: 600 }}>
          [{difficulty.toUpperCase()}]
        </span>
      </div>

      {/* Credits */}
      <div style={{ padding: "0 20px", borderRight: "1px solid var(--border)", height: "100%", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--text-lo)", letterSpacing: 1 }}>CREDITS</span>
        <span style={{ fontFamily: "var(--font-data)", fontSize: 18, fontWeight: "bold", color: "var(--amber)", textShadow: "0 0 8px rgba(255,146,0,0.35)", letterSpacing: 1 }}>
          {credits.toLocaleString()}<span style={{ fontSize: 11, opacity: 0.7, marginLeft: 2 }}>¢</span>
        </span>
        <HelpTip text="Your current credits. Earn by selling ore to traders or through income buildings." />
      </div>

      {/* Federation standing */}
      <div style={{ padding: "0 16px", borderRight: "1px solid var(--border)", height: "100%", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--text-lo)", letterSpacing: 1 }}>FEDERATION</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ width: 72, height: 4, background: "var(--bg-raised)", border: "1px solid var(--border)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: `${standingBar}%`, height: "100%", background: standingColor(federationStanding), transition: "width 0.5s ease" }} />
          </div>
          <span style={{ fontFamily: "var(--font-data)", fontSize: 10, color: standingColor(federationStanding), textAlign: "right" }}>
            {federationStanding > 0 ? "+" : ""}{federationStanding}
          </span>
        </div>
      </div>

      {/* Mission time */}
      <div style={{ padding: "0 16px", borderRight: "1px solid var(--border)", height: "100%", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--text-lo)", letterSpacing: 1 }}>TIME</span>
        <span style={{ fontFamily: "var(--font-data)", fontSize: 15, color: "var(--text)", letterSpacing: 2 }}>{elapsed}</span>
        <span style={{ fontFamily: "var(--font-data)", fontSize: 10, color: "var(--text-lo)", marginLeft: 6 }}>Tick {tick}</span>
      </div>

      <div style={{ marginLeft: "auto", padding: "0 14px" }}>
        <span style={{ fontFamily: "var(--font-data)", fontSize: 10, color: "var(--text-lo)" }}>SEED {seed}</span>
      </div>
    </div>
  );
}
