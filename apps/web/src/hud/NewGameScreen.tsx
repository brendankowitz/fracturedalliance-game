import type { DifficultyLevel } from "@fa/sim";
import { DIFFICULTY_PRESETS } from "@fa/sim";
import type { Scenario } from "@fa/content";
import { SCENARIOS } from "@fa/content";
import { useState } from "react";
import { DifficultySelector } from "./DifficultySelector.tsx";
import { useUiStore } from "../store/uiStore.ts";

interface NewGameScreenProps {
  onStart: (seed: number, difficulty: DifficultyLevel) => void;
}

export function NewGameScreen({ onStart }: NewGameScreenProps) {
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 1_000_000));
  const [inputValue, setInputValue] = useState(() => String(seed));
  const difficulty = useUiStore((s) => s.selectedDifficulty);
  const setDifficulty = useUiStore((s) => s.setDifficulty);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    setInputValue(raw);
    const parsed = parseInt(raw, 10);
    if (!Number.isNaN(parsed)) {
      setSeed(parsed);
      setActiveScenario(null);
    }
  }

  function handleSelectScenario(scenario: Scenario) {
    setSeed(scenario.seed);
    setInputValue(String(scenario.seed));
    setDifficulty(scenario.difficulty);
    setActiveScenario(scenario.id);
  }

  function handleDifficultyChange(level: DifficultyLevel) {
    setDifficulty(level);
    setActiveScenario(null);
  }

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
        overflowY: "auto",
        padding: "20px 0",
      }}
    >
      <h1 style={{ fontSize: 32, margin: 0, letterSpacing: 2 }}>FRACTURED ALLIANCE</h1>

      {/* Scenario selection */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, opacity: 0.7 }}>Scenarios</span>
        <div style={{ display: "flex", gap: 12 }}>
          {SCENARIOS.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              onClick={() => handleSelectScenario(scenario)}
              aria-pressed={activeScenario === scenario.id}
              style={{
                background: activeScenario === scenario.id ? "#1a3860" : "#060f20",
                border: `1px solid ${activeScenario === scenario.id ? "#4488cc" : "#334"}`,
                color: activeScenario === scenario.id ? "#c8d8ff" : "#7890b0",
                fontFamily: "monospace",
                fontSize: 12,
                padding: "10px 14px",
                cursor: "pointer",
                textAlign: "left",
                maxWidth: 200,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <span style={{ fontWeight: "bold", fontSize: 13 }}>{scenario.name}</span>
              <span style={{ opacity: 0.8, fontSize: 11, lineHeight: 1.4 }}>{scenario.description}</span>
              <span style={{ opacity: 0.6, fontSize: 10, marginTop: 4 }}>
                {DIFFICULTY_PRESETS[scenario.difficulty]!.label} · Seed {scenario.seed}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Seed input */}
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
          }}
        />
      </div>

      {/* Difficulty selection */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, opacity: 0.7 }}>Difficulty</span>
        <DifficultySelector value={difficulty} onChange={handleDifficultyChange} />
      </div>

      {/* Launch */}
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
