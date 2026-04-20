import { useEffect, useState } from "react";
import { DEFAULT_KEYBINDS, useKeybindStore } from "../store/keybindStore.ts";
import type { KeybindAction } from "../store/keybindStore.ts";

const ACTION_LABELS: Record<KeybindAction, string> = {
  pause: "Pause",
  openEspionage: "Espionage",
  openDiplomacy: "Diplomacy",
  openTrade: "Trade",
  openBlueprints: "Research",
  openBlackMarket: "Market",
  openAlerts: "Alerts",
};

export function KeybindingsPanel() {
  const keybinds = useKeybindStore((s) => s.keybinds);
  const setKeybind = useKeybindStore((s) => s.setKeybind);
  const resetKeybinds = useKeybindStore((s) => s.resetKeybinds);
  const [listening, setListening] = useState<KeybindAction | null>(null);

  useEffect(() => {
    if (!listening) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.key === "Escape") {
        setListening(null);
        return;
      }
      setKeybind(listening, e.key === " " ? " " : e.key.toLowerCase());
      setListening(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [listening, setKeybind]);

  const actions = Object.keys(DEFAULT_KEYBINDS) as KeybindAction[];

  return (
    <div
      style={{
        background: "#0a1830",
        border: "1px solid #224",
        color: "#c8d8ff",
        fontFamily: "monospace",
        fontSize: 11,
        padding: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontWeight: "bold", fontSize: 12 }}>Keybindings</span>
        <button
          type="button"
          onClick={resetKeybinds}
          style={{
            background: "#0a1830",
            border: "1px solid #335",
            color: "#7890b0",
            fontFamily: "monospace",
            fontSize: 9,
            padding: "1px 5px",
            cursor: "pointer",
          }}
        >
          Reset
        </button>
      </div>
      {actions.map((action) => {
        const isDupe = Object.entries(keybinds).some(
          ([k, v]) => v === keybinds[action] && k !== action,
        );
        const isListening = listening === action;
        return (
          <div
            key={action}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "3px 0",
              borderBottom: "1px solid #112",
            }}
          >
            <span style={{ color: isDupe ? "#f84" : "#c8d8ff" }}>
              {ACTION_LABELS[action]}
              {isDupe && " ⚠"}
            </span>
            <button
              type="button"
              onClick={() => setListening(isListening ? null : action)}
              style={{
                background: isListening ? "#1a3860" : "#0a1420",
                border: `1px solid ${isDupe ? "#f84" : isListening ? "#4488cc" : "#335"}`,
                color: isListening ? "#4488cc" : isDupe ? "#f84" : "#c8d8ff",
                fontFamily: "monospace",
                fontSize: 11,
                padding: "1px 6px",
                cursor: "pointer",
                minWidth: 30,
                textAlign: "center",
              }}
            >
              {isListening ? "…" : keybinds[action] === " " ? "SPC" : keybinds[action]}
            </button>
          </div>
        );
      })}
    </div>
  );
}
