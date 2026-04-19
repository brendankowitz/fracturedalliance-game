import { describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { tutorialMachine } from "../machines/tutorialMachine.ts";

describe("tutorialMachine", () => {
  it("starts at step1", () => {
    const actor = createActor(tutorialMachine);
    actor.start();
    expect(actor.getSnapshot().value).toBe("step1");
  });

  it("advances through all 5 steps", () => {
    const actor = createActor(tutorialMachine);
    actor.start();
    actor.send({ type: "ADVANCE" });
    expect(actor.getSnapshot().value).toBe("step2");
    actor.send({ type: "ADVANCE" });
    expect(actor.getSnapshot().value).toBe("step3");
    actor.send({ type: "ADVANCE" });
    expect(actor.getSnapshot().value).toBe("step4");
    actor.send({ type: "ADVANCE" });
    expect(actor.getSnapshot().value).toBe("step5");
    actor.send({ type: "ADVANCE" });
    expect(actor.getSnapshot().value).toBe("done");
  });

  it("dismisses from any step", () => {
    for (const startStep of ["step1", "step2", "step3", "step4", "step5"]) {
      const actor = createActor(tutorialMachine);
      actor.start();
      const stepsToAdvance = parseInt(startStep.replace("step", ""), 10) - 1;
      for (let i = 0; i < stepsToAdvance; i++) actor.send({ type: "ADVANCE" });
      expect(actor.getSnapshot().value).toBe(startStep);
      actor.send({ type: "DISMISS" });
      expect(actor.getSnapshot().value).toBe("dismissed");
    }
  });

  it("done is a final state", () => {
    const actor = createActor(tutorialMachine);
    actor.start();
    for (let i = 0; i < 5; i++) actor.send({ type: "ADVANCE" });
    expect(actor.getSnapshot().status).toBe("done");
  });

  it("dismissed is a final state", () => {
    const actor = createActor(tutorialMachine);
    actor.start();
    actor.send({ type: "DISMISS" });
    expect(actor.getSnapshot().status).toBe("done");
  });
});
