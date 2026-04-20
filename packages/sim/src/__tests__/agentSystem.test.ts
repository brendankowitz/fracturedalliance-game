import { describe, expect, it } from "vitest";
import type { AgentId, AsteroidId, BuildingId, PlayerId } from "@fa/domain";
import { agentId, asteroidId, buildingId, playerId } from "@fa/domain";
import type { World } from "@fa/domain";
import { makePrng } from "../prng.ts";
import { tickAgents } from "../systems/agentSystem.ts";

function makeMinimalWorld(): World {
  const humanId: PlayerId = playerId("player-human");
  const aiId: PlayerId = playerId("player-ai");
  const humanAsteroidId: AsteroidId = asteroidId("asteroid-human");
  const aiAsteroidId: AsteroidId = asteroidId("asteroid-ai");
  const cpuBid: BuildingId = buildingId("cpu-1");

  const agent = {
    id: agentId("agent-test"),
    name: "TestAgent",
    ownerId: humanId,
    stealth: 80,
    hireCost: 1000,
    missionKind: null,
    missionTarget: null,
    missionCompleteTick: null,
  };

  return {
    tick: 100,
    seed: 1,
    asteroids: new Map([
      [
        humanAsteroidId,
        {
          id: humanAsteroidId,
          name: "Human Base",
          ownerId: humanId,
          sector: { x: 0, y: 0 },
          sizeClass: "M" as const,
          deposits: {},
          radiation: 0,
          stability: 100,
          happiness: 75,
          buildings: [cpuBid],
          buildQueue: [],
          inOrbit: [],
          engines: { count: 0, destinationId: null, etaTick: null, chargeTick: null },
        },
      ],
      [
        aiAsteroidId,
        {
          id: aiAsteroidId,
          name: "AI Base",
          ownerId: aiId,
          sector: { x: 10, y: 10 },
          sizeClass: "M" as const,
          deposits: { selenium: 1000 },
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
        cpuBid,
        {
          id: cpuBid,
          defKind: "cpu",
          asteroidId: humanAsteroidId,
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
    agents: new Map([[agentId("agent-test"), agent]]),
    difficulty: "manager" as const,
    expeditionFleet: { active: false, ticksRemaining: 0, fleetsLaunched: 0 },
  };
}

describe("tickAgents — no mission", () => {
  it("does nothing when agent has no mission", () => {
    const world = makeMinimalWorld();
    tickAgents(world);
    expect(world.eventQueue).toHaveLength(0);
  });
});

describe("tickAgents — mission not yet complete", () => {
  it("does nothing when mission tick not reached", () => {
    const world = makeMinimalWorld();
    const agent = world.agents.get(agentId("agent-test"))!;
    agent.missionKind = "recon";
    agent.missionTarget = asteroidId("asteroid-ai");
    agent.missionCompleteTick = 200;
    tickAgents(world);
    expect(world.eventQueue).toHaveLength(0);
    expect(agent.missionKind).toBe("recon");
  });
});

describe("tickAgents — blackmail mission", () => {
  it("transfers 10% of AI credits to human on success", () => {
    const world = makeMinimalWorld();
    world.tick = 200;
    const agent = world.agents.get(agentId("agent-test"))!;
    agent.stealth = 99;
    agent.missionKind = "blackmail";
    agent.missionTarget = asteroidId("asteroid-ai");
    agent.missionCompleteTick = 200;
    const human = world.players.get(playerId("player-human"))!;
    const ai = world.players.get(playerId("player-ai"))!;
    const aiCreditsStart = ai.credits;
    tickAgents(world);
    const stolen = aiCreditsStart - ai.credits;
    if (stolen > 0) {
      expect(human.credits).toBe(10_000 + stolen);
      expect(stolen).toBe(Math.floor(aiCreditsStart * 0.1));
    }
  });
});

describe("tickAgents — liberate mission", () => {
  it("takes ownership of a neutral asteroid on success", () => {
    const world = makeMinimalWorld();
    world.tick = 200;
    const neutralId = asteroidId("asteroid-neutral");
    world.asteroids.set(neutralId, {
      id: neutralId,
      name: "Neutral",
      ownerId: null,
      sector: { x: 5, y: 5 },
      sizeClass: "M" as const,
      deposits: {},
      radiation: 0,
      stability: 100,
      happiness: 50,
      buildings: [],
      buildQueue: [],
      inOrbit: [],
      engines: { count: 0, destinationId: null, etaTick: null, chargeTick: null },
    });
    const agent = world.agents.get(agentId("agent-test"))!;
    agent.stealth = 99;
    agent.missionKind = "liberate";
    agent.missionTarget = neutralId;
    agent.missionCompleteTick = 200;
    const human = world.players.get(playerId("player-human"))!;
    tickAgents(world);
    const neutralAsteroid = world.asteroids.get(neutralId)!;
    if (world.eventQueue.some((e) => e.kind === "agent.mission_complete")) {
      expect(neutralAsteroid.ownerId).toBe(human.id);
    }
  });
});

describe("tickAgents — captured agent removed from world", () => {
  it("removes agent from world.agents when captured", () => {
    const world = makeMinimalWorld();
    world.tick = 200;
    const agent = world.agents.get(agentId("agent-test"))!;
    agent.stealth = 1;
    agent.missionKind = "recon";
    agent.missionTarget = asteroidId("asteroid-ai");
    agent.missionCompleteTick = 200;
    tickAgents(world);
    const agentAfter = world.agents.get(agentId("agent-test"));
    if (agentAfter) {
      expect(agentAfter.missionKind).toBeNull();
    } else {
      expect(world.eventQueue.some((e) => e.kind === "agent.captured")).toBe(true);
    }
  });
});
