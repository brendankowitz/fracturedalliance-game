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
      "Build an Air Processor to give your colony breathable air. Open the Building panel and select Air Processor.",
    position: { bottom: 120, left: 16 },
  },
  step2: {
    message: "Build a Mine to extract ore from the asteroid. More mines means more income.",
    position: { bottom: 120, left: 16 },
  },
  step3: {
    message: "The Federal Transporter arrives monthly. When it docks, sell your ore for credits.",
    position: { top: 60, left: "calc(50% - 140px)" },
  },
  step4: {
    message:
      "Launch a Scout ship to explore the belt. Open the Building panel and launch from a Ship Yard.",
    position: { bottom: 120, left: 16 },
  },
  step5: {
    message:
      "The Kryll Collective is watching you. Open Diplomacy to manage relations and propose a Non-Aggression Pact.",
    position: { top: 48, right: 16 },
  },
};
