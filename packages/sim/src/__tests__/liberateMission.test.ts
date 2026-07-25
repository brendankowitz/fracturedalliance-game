import type { AsteroidId, PlayerId, World } from "@fa/domain";
import { agentId, asteroidId, buildingId, playerId } from "@fa/domain";
import { describe, expect, it } from "vitest";
import { makePrng } from "../prng.ts";
import { tickAgents } from "../systems/agentSystem.ts";
import {
  makeTestAgent,
  makeTestAsteroid,
  makeTestBuilding,
  makeTestPlayer,
  makeTestWorld,
} from "./testWorld.ts";

function makeWorld(overrides?: {
  happiness?: number;
  asteroidOwnerId?: PlayerId | null;
  agentStealth?: number;
}): World {
  const humanId: PlayerId = playerId("player-human");
  const aiId: PlayerId = playerId("player-ai");
  const targetId: AsteroidId = asteroidId("asteroid-target");

  const agent = makeTestAgent(agentId("agent-spy"), {
    name: "Spy",
    // stealth=99 ensures outcome=success against security=0 (unless agentStealth override is passed)
    ownerId: humanId,
    stealth: overrides?.agentStealth ?? 99,
    hireCost: 1000,
    missionKind: "liberate",
    missionTarget: targetId,
    missionCompleteTick: 100,
  });

  const happiness = overrides?.happiness ?? 0.1;
  const asteroidOwnerId =
    overrides?.asteroidOwnerId !== undefined ? overrides.asteroidOwnerId : aiId;

  return makeTestWorld({
    tick: 100,
    asteroids: new Map([
      [
        targetId,
        makeTestAsteroid(targetId, {
          name: "Target",
          ownerId: asteroidOwnerId,
          sector: { x: 5, y: 5 },
          happiness,
        }),
      ],
    ]),
    buildings: new Map([
      [
        buildingId("cpu-human"),
        makeTestBuilding(buildingId("cpu-human"), asteroidId("asteroid-human")),
      ],
    ]),
    players: new Map([
      [humanId, makeTestPlayer(humanId, { raceId: "helionCorp", isHuman: true, credits: 10_000 })],
      [
        aiId,
        makeTestPlayer(aiId, {
          raceId: "kryllCollective",
          isHuman: false,
          credits: 8_000,
          federationStanding: 30,
        }),
      ],
    ]),
    agents: new Map([[agentId("agent-spy"), agent]]),
  });
}

describe("liberate mission — preconditions", () => {
  it("succeeds when happiness < 0.2 and asteroid is enemy-owned", () => {
    // happiness = 0.1 (< 0.2), owned by AI
    const world = makeWorld({ happiness: 0.1 });
    tickAgents(world);

    const target = world.asteroids.get(asteroidId("asteroid-target"))!;
    const human = world.players.get(playerId("player-human"))!;
    // stealth=99 ensures outcome=success, precondition met → ownership changes
    expect(target.ownerId).toBe(human.id);
    expect(world.eventQueue.some((e) => e.kind === "agent.mission_complete")).toBe(true);
  });

  it("fails when happiness >= 0.2 even though outcome roll would succeed", () => {
    // happiness = 0.5 (>= 0.2)
    const world = makeWorld({ happiness: 0.5 });
    tickAgents(world);

    const target = world.asteroids.get(asteroidId("asteroid-target"))!;
    // Ownership must NOT have changed to human
    expect(target.ownerId).toBe(playerId("player-ai"));
    expect(world.eventQueue.some((e) => e.kind === "agent.mission_failed")).toBe(true);
    expect(world.eventQueue.some((e) => e.kind === "agent.mission_complete")).toBe(false);
  });

  it("fails when happiness is exactly 0.2 (boundary: must be strictly < 0.2)", () => {
    const world = makeWorld({ happiness: 0.2 });
    tickAgents(world);

    const target = world.asteroids.get(asteroidId("asteroid-target"))!;
    expect(target.ownerId).toBe(playerId("player-ai"));
    expect(world.eventQueue.some((e) => e.kind === "agent.mission_failed")).toBe(true);
  });

  it("fails when asteroid is unowned (ownerId === null)", () => {
    const world = makeWorld({ happiness: 0.1, asteroidOwnerId: null });
    tickAgents(world);

    const target = world.asteroids.get(asteroidId("asteroid-target"))!;
    expect(target.ownerId).toBeNull();
    expect(world.eventQueue.some((e) => e.kind === "agent.mission_failed")).toBe(true);
  });

  it("fails when asteroid is already owned by human", () => {
    const world = makeWorld({ happiness: 0.1, asteroidOwnerId: playerId("player-human") });
    tickAgents(world);

    const target = world.asteroids.get(asteroidId("asteroid-target"))!;
    expect(target.ownerId).toBe(playerId("player-human")); // unchanged
    expect(world.eventQueue.some((e) => e.kind === "agent.mission_failed")).toBe(true);
  });
});

describe("liberate mission — failure happiness spike", () => {
  it("spikes target happiness +0.1 on failed outcome (dice roll)", () => {
    // Setup: happiness=0.1 (passes precondition), stealth=40, security=0
    // With these values: threshold = 40 - 0 = 40
    // resolveOutcome logic: roll <= 40 → success, roll > 80 → captured, 41-80 → failed
    // Seed 1 produces roll=63, which is in the failed range (41-80)
    const targetId = asteroidId("asteroid-target");

    // threshold=40: roll 41-80 = failed
    const world = makeWorld({ happiness: 0.1, agentStealth: 40 });
    world.prng = makePrng(1); // seed 1 produces roll=63, outcome="failed"
    const target = world.asteroids.get(targetId)!;
    const happinessBefore = target.happiness;

    tickAgents(world);

    // Verify the dice failure happened and happiness spiked
    expect(world.eventQueue.some((e) => e.kind === "agent.mission_failed")).toBe(true);
    expect(target.happiness).toBeCloseTo(Math.min(1.0, happinessBefore + 0.1), 5);
  });

  it("does not spike happiness on precondition failure (happiness >= 0.2 case)", () => {
    // Precondition fails → mission_failed but NO happiness spike (only dice-failure triggers spike)
    const world = makeWorld({ happiness: 0.5 });
    const target = world.asteroids.get(asteroidId("asteroid-target"))!;
    const happinessBefore = target.happiness;

    tickAgents(world);

    expect(world.eventQueue.some((e) => e.kind === "agent.mission_failed")).toBe(true);
    // Happiness should be unchanged — precondition failure doesn't spike
    expect(target.happiness).toBe(happinessBefore);
  });
});
