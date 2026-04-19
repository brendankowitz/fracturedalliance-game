import { DIFFICULTY_PRESETS, type DifficultyLevel } from "@fa/sim";
import { useState } from "react";

const DIFFICULTY_LEVELS: DifficultyLevel[] = ["easy", "normal", "hard", "brutal", "nightmare"];

interface NewGameScreenProps {
  onStart: (seed: number, difficulty: DifficultyLevel) => void;
}

export function NewGameScreen({ onStart }: NewGameScreenProps) {
  const initialSeed = Math.floor(Math.random() * 1_000_000);
  const [seed, setSeed] = useState<number>(initialSeed);
  const [inputValue, setInputValue] = useState<string>(String(initialSeed));
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("normal");

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    setInputValue(raw);
    const parsed = parseInt(raw, 10);
    if (!Number.isNaN(parsed)) {
      setSeed(parsed);
    }
  }

  // Keep display in sync with seed state when input is initialised
  function handleStart() {
    const parsed = parseInt(inputValue, 10);
    onStart(Number.isNaN(parsed) ? seed : parsed, difficulty);
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,8,20,0.95)",
        color: "#c8d8ff",
        fontFamily: "monospace",
        gap: 24,
        zIndex: 100,
      }}
    >
      <h1 style={{ fontSize: 32, margin: 0, letterSpacing: 2 }}>FRACTURED ALLIANCE</h1>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <label style={{ fontSize: 13, opacity: 0.7 }} htmlFor="seed-input">
          Seed
        </label>
        <input
          id="seed-input"
          type="text"
          inputMode="numeric"
          value={inputValue}
          onChange={handleInputChange}
          style={{
            background: "#0a1830",
            border: "1px solid #446",
            color: "#c8d8ff",
            fontFamily: "monospace",
            fontSize: 18,
            padding: "6px 12px",
            textAlign: "center",
            width: 160,
            outline: "none",
          }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, opacity: 0.7 }}>Difficulty</span>
        <div style={{ display: "flex", gap: 8 }}>
          {DIFFICULTY_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setDifficulty(level)}
              style={{
                background: difficulty === level ? "#1a3860" : "#060f20",
                border: `1px solid ${difficulty === level ? "#4488cc" : "#334"}`,
                color: difficulty === level ? "#c8d8ff" : "#7890b0",
                fontFamily: "monospace",
                fontSize: 13,
                padding: "6px 14px",
                cursor: "pointer",
                letterSpacing: 0.5,
              }}
            >
              {DIFFICULTY_PRESETS[level].label}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={handleStart}
        style={{
          background: "#1a3860",
          border: "1px solid #4488cc",
          color: "#c8d8ff",
          fontFamily: "monospace",
          fontSize: 16,
          padding: "10px 32px",
          cursor: "pointer",
          letterSpacing: 1,
        }}
      >
        Launch Game
      </button>
    </div>
  );
}
