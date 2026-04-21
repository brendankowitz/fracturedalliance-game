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
}

export const TUTORIAL_STEPS: Record<string, StepConfig> = {
  step1: {
    message:
      "Click your colony ★ on the map to open its surface. Then click any empty cell and place an Air Processor — your colony needs breathable air.",
    position: { bottom: 120, left: 16 },
  },
  step2: {
    message:
      "Good. Now click your colony again, select an empty cell, and build a Mine to extract ore. More mines = more income.",
    position: { bottom: 120, left: 16 },
  },
  step3: {
    message:
      "A Federal Transporter docks periodically. Open Trade (top bar) when it arrives to sell your ore for credits.",
    position: { top: 80, left: "calc(50% - 160px)" },
  },
  step4: {
    message:
      "Build a Ship Yard on your colony, then commission a Scout to explore the belt and find unclaimed asteroids.",
    position: { bottom: 120, left: 16 },
  },
  step5: {
    message:
      "Rival factions are watching. Open Diplomacy (top bar) to propose a Non-Aggression Pact before they attack.",
    position: { top: 80, right: 16 },
  },
};
