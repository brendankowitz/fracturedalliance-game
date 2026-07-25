import { playerId, shipId } from "@fa/domain";
import type { HudSnapshot } from "@fa/sim";
import { describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { TUTORIAL_STEPS, tutorialMachine } from "../machines/tutorialMachine.ts";
import { makeTestAsteroid, makeTestSnapshot } from "./testSnapshot.ts";

function makeSnap(overrides: Partial<HudSnapshot> = {}): HudSnapshot {
  return makeTestSnapshot({
    tick: 1,
    federationStanding: 50,
    humanPlayerId: "player-1",
    ...overrides,
  });
}

function requireStep(key: string) {
  const step = TUTORIAL_STEPS[key];
  if (!step) throw new Error(`Unknown tutorial step: ${key}`);
  return step;
}

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

describe("TUTORIAL_STEPS predicates", () => {
  const step1 = requireStep("step1");
  const step2 = requireStep("step2");
  const step3 = requireStep("step3");
  const step4 = requireStep("step4");
  const step5 = requireStep("step5");

  it("step1 true when airProcessor in buildingKinds", () => {
    const snap = makeSnap({
      asteroids: [
        makeTestAsteroid({ ownerId: "player-1", buildingKinds: ["airProcessor"], buildQueue: [] }),
      ],
    });
    expect(step1.predicate(snap)).toBe(true);
  });

  it("step1 true when airProcessor in buildQueue", () => {
    const snap = makeSnap({
      asteroids: [
        makeTestAsteroid({
          ownerId: "player-1",
          buildingKinds: [],
          buildQueue: [
            {
              buildingKind: "airProcessor",
              progressTicks: 0,
              totalTicks: 1,
              queuedAt: 0,
              cell: { x: 0, y: 0 },
            },
          ],
        }),
      ],
    });
    expect(step1.predicate(snap)).toBe(true);
  });

  it("step1 false when no airProcessor", () => {
    const snap = makeSnap({
      asteroids: [makeTestAsteroid({ ownerId: "player-1", buildingKinds: [], buildQueue: [] })],
    });
    expect(step1.predicate(snap)).toBe(false);
  });

  it("step1 false when asteroid owned by another player", () => {
    const snap = makeSnap({
      asteroids: [
        makeTestAsteroid({ ownerId: "player-2", buildingKinds: ["airProcessor"], buildQueue: [] }),
      ],
    });
    expect(step1.predicate(snap)).toBe(false);
  });

  it("step2 true when mineMk1 in buildingKinds", () => {
    const snap = makeSnap({
      asteroids: [
        makeTestAsteroid({ ownerId: "player-1", buildingKinds: ["mineMk1"], buildQueue: [] }),
      ],
    });
    expect(step2.predicate(snap)).toBe(true);
  });

  it("step2 true when mineMk1 in buildQueue", () => {
    const snap = makeSnap({
      asteroids: [
        makeTestAsteroid({
          ownerId: "player-1",
          buildingKinds: [],
          buildQueue: [
            {
              buildingKind: "mineMk1",
              progressTicks: 0,
              totalTicks: 1,
              queuedAt: 0,
              cell: { x: 0, y: 0 },
            },
          ],
        }),
      ],
    });
    expect(step2.predicate(snap)).toBe(true);
  });

  it("step2 false when no mineMk1", () => {
    const snap = makeSnap({
      asteroids: [makeTestAsteroid({ ownerId: "player-1", buildingKinds: [], buildQueue: [] })],
    });
    expect(step2.predicate(snap)).toBe(false);
  });

  it("step3 true when credits > 15000", () => {
    expect(step3.predicate(makeSnap({ credits: 15001 }))).toBe(true);
  });

  it("step3 false when credits <= 15000", () => {
    expect(step3.predicate(makeSnap({ credits: 15000 }))).toBe(false);
  });

  it("step3 false when credits 0", () => {
    expect(step3.predicate(makeSnap({ credits: 0 }))).toBe(false);
  });

  it("step4 true when blueprint owned", () => {
    expect(step4.predicate(makeSnap({ blueprintsOwned: ["mine-mk2"] }))).toBe(true);
  });

  it("step4 false when no blueprints owned", () => {
    expect(step4.predicate(makeSnap({ blueprintsOwned: [] }))).toBe(false);
  });

  it("step5 true when scout ship owned by human player", () => {
    const snap = makeSnap({
      ships: [
        {
          id: shipId("s1"),
          defKind: "scout",
          ownerId: playerId("player-1"),
          position: { x: 0, y: 0 },
          orderKind: "idle",
        },
      ],
    });
    expect(step5.predicate(snap)).toBe(true);
  });

  it("step5 false when no ships", () => {
    expect(step5.predicate(makeSnap({ ships: [] }))).toBe(false);
  });

  it("step5 false when scout owned by another player", () => {
    const snap = makeSnap({
      ships: [
        {
          id: shipId("s1"),
          defKind: "scout",
          ownerId: playerId("player-2"),
          position: { x: 0, y: 0 },
          orderKind: "idle",
        },
      ],
    });
    expect(step5.predicate(snap)).toBe(false);
  });

  it("step5 false when human player has non-scout ship", () => {
    const snap = makeSnap({
      ships: [
        {
          id: shipId("s1"),
          defKind: "freighter",
          ownerId: playerId("player-1"),
          position: { x: 0, y: 0 },
          orderKind: "idle",
        },
      ],
    });
    expect(step5.predicate(snap)).toBe(false);
  });
});
