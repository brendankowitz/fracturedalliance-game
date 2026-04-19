import { describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { gameMachine } from "../machines/gameMachine.ts";

describe("gameMachine", () => {
  it("starts in mainMenu state", () => {
    const actor = createActor(gameMachine).start();
    expect(actor.getSnapshot().value).toBe("mainMenu");
  });

  it("transitions to loading on START_GAME", () => {
    const actor = createActor(gameMachine).start();
    actor.send({ type: "START_GAME", seed: 42, difficulty: "manager" });
    expect(actor.getSnapshot().value).toBe("loading");
  });

  it("transitions from playing to paused on PAUSE", () => {
    const actor = createActor(gameMachine).start();
    actor.send({ type: "START_GAME", seed: 42, difficulty: "manager" });
    actor.send({ type: "LOADED" });
    actor.send({ type: "PAUSE" });
    expect(actor.getSnapshot().value).toBe("paused");
  });
});
