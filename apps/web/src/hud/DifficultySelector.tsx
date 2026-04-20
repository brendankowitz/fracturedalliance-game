import type { DifficultyLevel } from "@fa/sim";
import { DIFFICULTY_PRESETS } from "@fa/sim";

const DIFFICULTY_LEVELS: DifficultyLevel[] = ["intern", "manager", "director", "ceo", "board"];

const DIFFICULTY_DESCRIPTIONS: Record<DifficultyLevel, string> = {
  intern: "Learning the ropes. More credits, lenient AI, generous traders.",
  manager: "Standard challenge. Balanced economy, moderate rivals.",
  director: "Tough competition. Scarce resources, aggressive AI.",
  ceo: "High pressure. Relentless rivals, tight margins, Mauna aggressor.",
  board: "Brutal. Everything is against you. Mauna attacks day one.",
};

interface DifficultySelectorProps {
  value: DifficultyLevel;
  onChange: (d: DifficultyLevel) => void;
}

export function DifficultySelector({ value, onChange }: DifficultySelectorProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {DIFFICULTY_LEVELS.map((level) => {
        const preset = DIFFICULTY_PRESETS[level];
        const isSelected = value === level;
        return (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level)}
            aria-pressed={isSelected}
            style={{
              background: isSelected ? "#1a3860" : "#060f20",
              border: `1px solid ${isSelected ? "#4488cc" : "#334"}`,
              color: isSelected ? "#c8d8ff" : "#7890b0",
              fontFamily: "monospace",
              fontSize: 13,
              padding: "8px 14px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <span style={{ fontWeight: "bold" }}>{preset.label}</span>
            <span style={{ marginLeft: 10, fontSize: 11, opacity: 0.7 }}>
              {DIFFICULTY_DESCRIPTIONS[level]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
