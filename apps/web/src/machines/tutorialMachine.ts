import type { HudSnapshot } from "@fa/sim";
import { setup } from "xstate";

export type TutorialEvent = { type: "ADVANCE" } | { type: "DISMISS" };

export const tutorialMachine = setup({
  types: { events: {} as TutorialEvent },
}).createMachine({
  id: "tutorial",
  initial: "step1",
  states: {
    step1: { on: { ADVANCE: "step2", DISMISS: "dismissed" } },
    step2: { on: { ADVANCE: "step3", DISMISS: "dismissed" } },
    step3: { on: { ADVANCE: "step4", DISMISS: "dismissed" } },
    step4: { on: { ADVANCE: "step5", DISMISS: "dismissed" } },
    step5: { on: { ADVANCE: "done", DISMISS: "dismissed" } },
    done: { type: "final" },
    dismissed: { type: "final" },
  },
});

interface StepConfig {
  message: string;
  position: {
    bottom?: number;
    top?: number;
    left?: number | string;
    right?: number | string;
  };
  predicate: (snap: HudSnapshot) => boolean;
}

export const TUTORIAL_STEPS: Record<string, StepConfig> = {
  step1: {
    message:
      "Build an Air Processor to give your colony breathable air. Open the Building panel and select Air Processor.",
    position: { bottom: 120, left: 16 },
    predicate: (snap) =>
      snap.asteroids.some(
        (a) =>
          a.ownerId === snap.humanPlayerId &&
          (a.buildingKinds.includes("airProcessor") ||
            a.buildQueue.some((q) => q.buildingKind === "airProcessor")),
      ),
  },
  step2: {
    message: "Build a Mine to extract ore from the asteroid. More mines means more income.",
    position: { bottom: 120, left: 16 },
    predicate: (snap) =>
      snap.asteroids.some(
        (a) =>
          a.ownerId === snap.humanPlayerId &&
          (a.buildingKinds.includes("mineMk1") ||
            a.buildQueue.some((q) => q.buildingKind === "mineMk1")),
      ),
  },
  step3: {
    message: "The Federal Transporter arrives monthly. When it docks, sell your ore for credits.",
    position: { top: 60, left: "calc(50% - 140px)" },
    predicate: (snap) => snap.credits > 15000,
  },
  step4: {
    message:
      "Visit the Blueprint Shop to unlock advanced technologies. Purchase your first blueprint to gain an edge.",
    position: { bottom: 120, left: 16 },
    predicate: (snap) => snap.blueprintsOwned.length > 0,
  },
  step5: {
    message:
      "Launch a Scout ship to explore the belt. Open the Building panel and queue a Scout from a Ship Yard.",
    position: { top: 48, right: 16 },
    predicate: (snap) =>
      snap.ships.some((s) => s.ownerId === snap.humanPlayerId && s.defKind === "scout"),
  },
};
