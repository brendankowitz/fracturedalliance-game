import { useMachine } from "@xstate/react";
import { useEffect } from "react";
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

  useEffect(() => {
    if (!snapshot) return;

    const current = state.value as string;
    if (current === "done" || current === "dismissed") return;

    if (current === "step1") {
      const met = snapshot.asteroids.some(
        (a) =>
          a.ownerId === snapshot.humanPlayerId &&
          (a.buildingKinds.includes("airProcessor") ||
            a.buildQueue.some((q) => q.buildingKind === "airProcessor")),
      );
      if (met) send({ type: "ADVANCE" });
    } else if (current === "step2") {
      const met = snapshot.asteroids.some(
        (a) =>
          a.ownerId === snapshot.humanPlayerId &&
          (a.buildingKinds.includes("mineMk1") ||
            a.buildQueue.some((q) => q.buildingKind === "mineMk1")),
      );
      if (met) send({ type: "ADVANCE" });
    } else if (current === "step3") {
      if (snapshot.traderActive) send({ type: "ADVANCE" });
    } else if (current === "step4") {
      const met = snapshot.ships.some(
        (s) => s.ownerId === snapshot.humanPlayerId && s.defKind === "scout",
      );
      if (met) send({ type: "ADVANCE" });
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
      <div style={{ fontWeight: "bold", marginBottom: 4 }}>Tutorial — Step {stepNumber} of 5</div>
      <div style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 8 }}>{stepConfig.message}</div>
      <div style={{ display: "flex", gap: 8 }}>
        {isStep5 && (
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
