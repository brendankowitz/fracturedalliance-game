import { useMachine } from "@xstate/react";
import { useEffect, useState } from "react";
import { TUTORIAL_STEPS, tutorialMachine } from "../machines/tutorialMachine.ts";
import { useGameStore } from "../store/gameStore.ts";

const STEP_NUMBERS: Record<string, number> = {
  step1: 1, step2: 2, step3: 3, step4: 4, step5: 5,
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
        zIndex: 25,
        width: 300,
        background: "var(--bg-panel)",
        border: "1px solid var(--amber)",
        boxShadow: "0 0 20px rgba(255,146,0,0.2), inset 0 0 30px rgba(255,146,0,0.03)",
        color: "var(--text)",
        fontFamily: "var(--font-data)",
        ...stepConfig.position,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: "1px solid rgba(255,146,0,0.2)", background: "rgba(255,146,0,0.06)" }}>
        <div className="fa-tutorial-dot" />
        <span style={{ fontFamily: "var(--font-head)", fontSize: 9, letterSpacing: 2, color: "var(--amber)", fontWeight: 700, flex: 1 }}>
          MISSION BRIEFING
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: i < stepNumber ? "var(--amber)" : "var(--border)" }} />
          ))}
        </div>
      </div>

      <div style={{ padding: "6px 12px 0" }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--amber)", letterSpacing: 1, fontWeight: 600 }}>STEP {stepNumber} OF 5</span>
      </div>

      <div style={{ padding: "6px 12px 10px", fontSize: 13, lineHeight: 1.6, color: "var(--text-hi)", fontFamily: "var(--font-ui)", fontWeight: 500 }}>
        {stepConfig.message}
      </div>

      {!predicateMet && (
        <div style={{ padding: "0 12px 8px", fontSize: 11, color: "var(--text-lo)", fontStyle: "italic", fontFamily: "var(--font-ui)" }}>
          Waiting for objective...
        </div>
      )}

      <div style={{ display: "flex", gap: 8, padding: "8px 12px", borderTop: "1px solid rgba(255,146,0,0.15)" }}>
        {isStep5 && predicateMet && (
          <button type="button" onClick={() => send({ type: "ADVANCE" })} className="fa-btn fa-btn-primary" style={{ flex: 1 }}>
            Got it
          </button>
        )}
        <button type="button" onClick={() => send({ type: "DISMISS" })} className="fa-btn" style={{ marginLeft: isStep5 && predicateMet ? 0 : "auto" }}>
          Skip Tutorial
        </button>
      </div>
    </div>
  );
}
