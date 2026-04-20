import { describe, expect, it } from "vitest";
import type { AsteroidId, PlayerId } from "@fa/domain";
import { agentId, asteroidId, buildingId, playerId } from "@fa/domain";
import type { World } from "@fa/domain";
import { makePrng } from "../prng.ts";
import { tickAgents } from "../systems/agentSystem.ts";

function makeWorld(overrides?: { happiness?: number; asteroidOwnerId?: PlayerId | null }): World {
  const humanId: PlayerId = playerId("player-human");
  const aiId: PlayerId = playerId("player-ai");
  const targetId: AsteroidId = asteroidId("asteroid-target");

  const agent = {
    id: agentId("agent-spy"),
    name: "Spy",
    // stealth=99 ensures outcome=success against security=0
    ownerId: humanId,
    stealth: 99,
    hireCost: 1000,
    missionKind: "liberate" as const,
    missionTarget: targetId,
    missionCompleteTick: 100,
    tributeActive: false,
    tributeEndTick: null as null,
  };

  const happiness = overrides?.happiness ?? 0.1;
  const asteroidOwnerId = overrides?.asteroidOwnerId !== undefined ? overrides.asteroidOwnerId : aiId;

  return {
    tick: 100,
    seed: 1,
    asteroids: new Map([
      [
        targetId,
        {
          id: targetId,
          name: "Target",
          ownerId: asteroidOwnerId,
          sector: { x: 5, y: 5 },
          sizeClass: "M" as const,
          deposits: {},
          radiation: 0,
          stability: 100,
          happiness,
          buildings: [],
          buildQueue: [],
          inOrbit: [],
          engines: { count: 0, destinationId: null, etaTick: null, chargeTick: null },
        },
      ],
    ]),
    buildings: new Map([
      [
        buildingId("cpu-human"),
        {
          id: buildingId("cpu-human"),
          defKind: "cpu",
          asteroidId: asteroidId("asteroid-human"),
          cell: { x: 3, y: 3 },
          hp: 100,
          maxHp: 100,
          constructionProgress: 1,
          active: true,
          damage: 0,
        },
      ],
    ]),
    ships: new Map(),
    players: new Map([
      [
        humanId,
        {
          id: humanId,
          raceId: "helionCorp",
          isHuman: true,
          credits: 10_000,
          oreInventory: {},
          reputation: new Map(),
          federationStanding: 50,
          blueprintsOwned: new Set(),
          eventLog: [],
          alive: true,
          suspicion: 0,
          licenseRevoked: false,
        },
      ],
      [
        aiId,
        {
          id: aiId,
          raceId: "kryllCollective",
          isHuman: false,
          credits: 8_000,
          oreInventory: {},
          reputation: new Map(),
          federationStanding: 30,
          blueprintsOwned: new Set(),
          eventLog: [],
          alive: true,
          suspicion: 0,
          licenseRevoked: false,
        },
      ],
    ]),
    treaties: [],
    marketPrices: {
      selenium: 100,
      asteros: 150,
      barium: 220,
      crystalite: 300,
      quazinc: 380,
      bytanium: 500,
      korellium: 650,
      dragonium: 820,
      traxium: 1100,
      nexos: 1500,
    },
    eventQueue: [],
    prng: makePrng(1),
    schemaVersion: 1,
    nextBuildingSeq: 0,
    nextShipSeq: 0,
    nextTreatySeq: 0,
    gameEndState: null,
    agents: new Map([[agentId("agent-spy"), agent]]),
    difficulty: "manager" as const,
    expeditionFleet: { active: false, ticksRemaining: 0, fleetsLaunched: 0 },
  };
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

    const world = makeWorld({ happiness: 0.1 });
    world.prng = makePrng(1); // seed 1 produces roll=63, outcome="failed"
    const agent = world.agents.get(agentId("agent-spy"))!;
    agent.stealth = 40; // threshold=40: roll 41-80 = failed
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
