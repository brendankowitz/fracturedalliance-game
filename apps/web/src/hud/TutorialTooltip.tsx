import { useMachine } from "@xstate/react";
import { useEffect, useState } from "react";
import { TUTORIAL_STEPS, tutorialMachine } from "../machines/tutorialMachine.ts";
import { useGameStore } from "../store/gameStore.ts";

const STEP_NUMBERS: Record<string, number> = {
  step1: 1,
  step2: 2,
  step3: 3,
  step4: 4,
  step5: 5,
};

export function TutorialTooltip() {
  const [state, send] = useMachine(tutorialMachine);
  const snapshot = useGameStore((s) => s.snapshot);
  const [predicateMet, setPredicateMet] = useState(false);

  useEffect(() => {
    if (!snapshot) return;

    const current = state.value as string;
    if (current === "done" || current === "dismissed") return;

    const stepConfig = TUTORIAL_STEPS[current];
    if (!stepConfig) return;

    const met = stepConfig.predicate(snapshot);
    setPredicateMet(met);

    // Steps 1-4 auto-advance; step5 requires manual "Got it"
    if (met && current !== "step5") {
      send({ type: "ADVANCE" });
    }
  }, [snapshot, state.value, send]);

  if (state.matches("done") || state.matches("dismissed")) return null;

  const current = state.value as string;
  const stepConfig = TUTORIAL_STEPS[current];
  if (!stepConfig) return null;

  const stepNumber = STEP_NUMBERS[current] ?? 0;
  const isStep5 = current === "step5";

  return (
    <div
      style={{
        position: "absolute",
        zIndex: 20,
        width: 280,
        background: "#0a1830",
        border: "1px solid #224",
        color: "#c8d8ff",
        fontFamily: "monospace",
        padding: 12,
        ...stepConfig.position,
      }}
    >
      {/* Progress dots */}
      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: i < stepNumber ? "#4488cc" : "#224",
            }}
          />
        ))}
      </div>
      <div style={{ fontWeight: "bold", marginBottom: 4 }}>Tutorial — Step {stepNumber} of 5</div>
      <div style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 8 }}>{stepConfig.message}</div>
      {!predicateMet && (
        <div style={{ fontSize: 11, color: "#667", fontStyle: "italic", marginBottom: 6 }}>
          Waiting for objective...
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        {isStep5 && predicateMet && (
          <button
            type="button"
            onClick={() => send({ type: "ADVANCE" })}
            style={{
              background: "#1a2840",
              border: "1px solid #449",
              color: "#c8d8ff",
              fontFamily: "monospace",
              padding: "4px 10px",
              cursor: "pointer",
            }}
          >
            Got it
          </button>
        )}
        <button
          type="button"
          onClick={() => send({ type: "DISMISS" })}
          style={{
            background: "#1a2840",
            border: "1px solid #449",
            color: "#c8d8ff",
            fontFamily: "monospace",
            padding: "4px 10px",
            cursor: "pointer",
          }}
        >
          Skip Tutorial
        </button>
      </div>
    </div>
  );
}
