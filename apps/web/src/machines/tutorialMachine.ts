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
      "Click your colony ★ on the map to open its surface. Then click any empty cell and place an Air Processor — your colony needs breathable air.",
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
    message:
      "Good. Now click your colony again, select an empty cell, and build a Mine to extract ore. More mines = more income.",
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
    message:
      "A Federal Transporter docks periodically. When it arrives, sell your ore for credits via the Trade panel.",
    position: { top: 80, left: "calc(50% - 160px)" },
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
