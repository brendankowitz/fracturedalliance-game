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

  it("dismisses from step1", () => {
    const actor = createActor(tutorialMachine);
    actor.start();
    expect(actor.getSnapshot().value).toBe("step1");
    actor.send({ type: "DISMISS" });
    expect(actor.getSnapshot().value).toBe("dismissed");
  });

  it("dismisses from step2", () => {
    const actor = createActor(tutorialMachine);
    actor.start();
    actor.send({ type: "ADVANCE" });
    expect(actor.getSnapshot().value).toBe("step2");
    actor.send({ type: "DISMISS" });
    expect(actor.getSnapshot().value).toBe("dismissed");
  });

  it("dismisses from step3", () => {
    const actor = createActor(tutorialMachine);
    actor.start();
    actor.send({ type: "ADVANCE" });
    actor.send({ type: "ADVANCE" });
    expect(actor.getSnapshot().value).toBe("step3");
    actor.send({ type: "DISMISS" });
    expect(actor.getSnapshot().value).toBe("dismissed");
  });

  it("dismisses from step4", () => {
    const actor = createActor(tutorialMachine);
    actor.start();
    actor.send({ type: "ADVANCE" });
    actor.send({ type: "ADVANCE" });
    actor.send({ type: "ADVANCE" });
    expect(actor.getSnapshot().value).toBe("step4");
    actor.send({ type: "DISMISS" });
    expect(actor.getSnapshot().value).toBe("dismissed");
  });

  it("dismisses from step5", () => {
    const actor = createActor(tutorialMachine);
    actor.start();
    actor.send({ type: "ADVANCE" });
    actor.send({ type: "ADVANCE" });
    actor.send({ type: "ADVANCE" });
    actor.send({ type: "ADVANCE" });
    expect(actor.getSnapshot().value).toBe("step5");
    actor.send({ type: "DISMISS" });
    expect(actor.getSnapshot().value).toBe("dismissed");
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
