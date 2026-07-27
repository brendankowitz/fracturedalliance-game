import { SPEED_PRESETS, type SpeedPreset, useTimeStore } from "../store/timeStore.ts";
import { useUiStore } from "../store/uiStore.ts";

interface SpeedControlProps {
  date: string;
  day: number;
}

const buttonStyle = (active: boolean): React.CSSProperties => ({
  background: active ? "rgba(0,196,224,0.14)" : "transparent",
  border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
  color: active ? "var(--accent)" : "var(--text-lo)",
  fontFamily: "var(--font-data)",
  fontSize: 10,
  minWidth: 26,
  padding: "2px 5px",
  cursor: "pointer",
});

export function SpeedControl({ date, day }: SpeedControlProps) {
  const paused = useUiStore((s) => s.paused);
  const setPaused = useUiStore((s) => s.setPaused);
  const timeScale = useTimeStore((s) => s.timeScale);
  const setTimeScale = useTimeStore((s) => s.setTimeScale);

  const select = (scale: SpeedPreset) => {
    setTimeScale(scale);
    if (paused) setPaused(false);
  };

  return (
    <div
      style={{
        padding: "0 16px",
        borderRight: "1px solid var(--border)",
        height: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
        <span
          style={{
            fontFamily: "var(--font-data)",
            fontSize: 16,
            color: "var(--text)",
            letterSpacing: 2,
          }}
        >
          {date}
        </span>
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 9,
            color: "var(--text-lo)",
            letterSpacing: 1,
          }}
        >
          DAY {day}
        </span>
      </div>

      <div style={{ display: "flex", gap: 3 }} role="toolbar" aria-label="Simulation speed">
        <button
          type="button"
          onClick={() => setPaused(!paused)}
          aria-pressed={paused}
          aria-label="Pause"
          title="Space — pause/unpause"
          style={{
            ...buttonStyle(paused),
            background: paused ? "rgba(255,146,0,0.14)" : "transparent",
            border: `1px solid ${paused ? "var(--amber)" : "var(--border)"}`,
            color: paused ? "var(--amber)" : "var(--text-lo)",
          }}
        >
          ⏸
        </button>
        {SPEED_PRESETS.map((scale) => (
          <button
            key={scale}
            type="button"
            onClick={() => select(scale)}
            aria-pressed={!paused && timeScale === scale}
            aria-label={`Speed ${scale} times`}
            title={`${scale}× speed — +/− to step`}
            style={buttonStyle(!paused && timeScale === scale)}
          >
            {scale}×
          </button>
        ))}
      </div>
    </div>
  );
}
