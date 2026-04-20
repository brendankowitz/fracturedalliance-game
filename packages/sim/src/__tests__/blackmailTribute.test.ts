import { describe, expect, it } from "vitest";
import type { AsteroidId, PlayerId } from "@fa/domain";
import { agentId, asteroidId, buildingId, playerId } from "@fa/domain";
import type { World } from "@fa/domain";
import { makePrng } from "../prng.ts";
import { tickAgents } from "../systems/agentSystem.ts";

function makeWorld(): World {
  const humanId: PlayerId = playerId("player-human");
  const aiId: PlayerId = playerId("player-ai");
  const aiAsteroidId: AsteroidId = asteroidId("asteroid-ai");

  const agent = {
    id: agentId("agent-spy"),
    name: "Spy",
    ownerId: humanId,
    stealth: 99,
    hireCost: 1000,
    missionKind: null as null,
    missionTarget: null as null,
    missionCompleteTick: null as null,
    tributeActive: false,
    tributeEndTick: null as null,
  };

  return {
    tick: 100,
    seed: 42,
    asteroids: new Map([
      [
        aiAsteroidId,
        {
          id: aiAsteroidId,
          name: "AI Base",
          ownerId: aiId,
          sector: { x: 10, y: 10 },
          sizeClass: "M" as const,
          deposits: {},
          radiation: 0,
          stability: 100,
          happiness: 75,
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
    prng: makePrng(42),
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

describe("blackmail — recurring tribute", () => {
  it("sets tributeActive and tributeEndTick on successful blackmail", () => {
    const world = makeWorld();
    world.tick = 100;
    const agent = world.agents.get(agentId("agent-spy"))!;
    agent.missionKind = "blackmail";
    agent.missionTarget = asteroidId("asteroid-ai");
    agent.missionCompleteTick = 100;
    // stealth=99 guarantees success vs security=0

    tickAgents(world);

    const missionComplete = world.eventQueue.some((e) => e.kind === "agent.mission_complete");
    if (missionComplete) {
      expect(agent.tributeActive).toBe(true);
      expect(agent.tributeEndTick).toBe(300); // tick 100 + 200
      expect(agent.missionTarget).toBe(asteroidId("asteroid-ai")); // retained for tribute
    }
  });

  it("transfers 2% of AI credits to human each tick while tribute active", () => {
    const world = makeWorld();
    // Set up tribute directly without going through mission resolution
    const agent = world.agents.get(agentId("agent-spy"))!;
    agent.tributeActive = true;
    agent.tributeEndTick = 300;
    agent.missionTarget = asteroidId("asteroid-ai");
    world.tick = 150;

    const human = world.players.get(playerId("player-human"))!;
    const ai = world.players.get(playerId("player-ai"))!;
    const humanBefore = human.credits;
    const aiBefore = ai.credits;

    tickAgents(world);

    const expectedTribute = Math.floor(aiBefore * 0.02);
    expect(ai.credits).toBe(aiBefore - expectedTribute);
    expect(human.credits).toBe(humanBefore + expectedTribute);
  });

  it("clears tribute when tick >= tributeEndTick", () => {
    const world = makeWorld();
    const agent = world.agents.get(agentId("agent-spy"))!;
    agent.tributeActive = true;
    agent.tributeEndTick = 100;
    agent.missionTarget = asteroidId("asteroid-ai");
    world.tick = 100; // exactly at end

    tickAgents(world);

    expect(agent.tributeActive).toBe(false);
    expect(agent.tributeEndTick).toBeNull();
    expect(agent.missionTarget).toBeNull();
  });

  it("clears tribute when agent ownerId becomes null (recalled/captured)", () => {
    const world = makeWorld();
    const agent = world.agents.get(agentId("agent-spy"))!;
    agent.tributeActive = true;
    agent.tributeEndTick = 300;
    agent.missionTarget = asteroidId("asteroid-ai");
    agent.ownerId = null; // agent was recalled/captured
    world.tick = 150;

    tickAgents(world);

    expect(agent.tributeActive).toBe(false);
    expect(agent.tributeEndTick).toBeNull();
  });
});
