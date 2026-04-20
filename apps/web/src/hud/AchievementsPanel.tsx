import { ACHIEVEMENTS, useAchievementStore } from "../store/achievementStore.ts";

interface Props {
  onClose: () => void;
}

export function AchievementsPanel({ onClose }: Props) {
  const unlocked = useAchievementStore((s) => s.unlocked);
  const unlockedCount = unlocked.size;

  return (
    <div
      style={{
        position: "absolute",
        top: 72,
        left: 0,
        width: 260,
        maxHeight: "70vh",
        overflowY: "auto",
        background: "#0a1830",
        border: "1px solid #224",
        color: "#c8d8ff",
        fontFamily: "monospace",
        fontSize: 11,
        zIndex: 20,
      }}
    >
      <div
        style={{
          padding: "6px 8px",
          borderBottom: "1px solid #224",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontWeight: "bold", fontSize: 12 }}>
          Achievements ({unlockedCount}/{ACHIEVEMENTS.length})
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#667",
            fontFamily: "monospace",
            fontSize: 14,
            cursor: "pointer",
            padding: "0 4px",
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
      {ACHIEVEMENTS.map((ach) => {
        const done = unlocked.has(ach.id);
        const hidden = ach.secret && !done;
        return (
          <div
            key={ach.id}
            style={{
              padding: "6px 8px",
              borderBottom: "1px solid #112",
              opacity: done ? 1 : 0.5,
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            <span style={{ fontSize: 14, flexShrink: 0, color: done ? "#fa4" : "#334" }}>
              {done ? "★" : "☆"}
            </span>
            <div>
              <div style={{ fontWeight: "bold", color: done ? "#c8d8ff" : "#667" }}>
                {hidden ? "???" : ach.name}
              </div>
              <div style={{ fontSize: 10, color: "#556", marginTop: 1 }}>
                {hidden ? "Secret achievement" : ach.description}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
