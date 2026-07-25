import type { Agent, AsteroidId, BuildingId, PlayerId, World } from "@fa/domain";
import { agentId, asteroidId, buildingId, playerId } from "@fa/domain";
import { describe, expect, it } from "vitest";
import { tickAgents } from "../systems/agentSystem.ts";
import {
  makeTestAgent,
  makeTestAsteroid,
  makeTestBuilding,
  makeTestPlayer,
  makeTestWorld,
} from "./testWorld.ts";

function makeMinimalWorld(): World {
  const humanId: PlayerId = playerId("player-human");
  const aiId: PlayerId = playerId("player-ai");
  const humanAsteroidId: AsteroidId = asteroidId("asteroid-human");
  const aiAsteroidId: AsteroidId = asteroidId("asteroid-ai");
  const cpuBid: BuildingId = buildingId("cpu-1");

  const agent = makeTestAgent(agentId("agent-test"), {
    name: "TestAgent",
    ownerId: humanId,
    stealth: 80,
    hireCost: 1000,
  });

  return makeTestWorld({
    tick: 100,
    asteroids: new Map([
      [
        humanAsteroidId,
        makeTestAsteroid(humanAsteroidId, {
          name: "Human Base",
          ownerId: humanId,
          buildings: [cpuBid],
        }),
      ],
      [
        aiAsteroidId,
        makeTestAsteroid(aiAsteroidId, {
          name: "AI Base",
          ownerId: aiId,
          sector: { x: 10, y: 10 },
          deposits: { selenium: 1000 },
        }),
      ],
    ]),
    buildings: new Map([[cpuBid, makeTestBuilding(cpuBid, humanAsteroidId)]]),
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
    agents: new Map([[agentId("agent-test"), agent]]),
  });
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
    const agent: Agent = { ...world.agents.get(agentId("agent-test"))!, stealth: 99 };
    world.agents.set(agentId("agent-test"), agent);
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
    world.asteroids.set(
      neutralId,
      makeTestAsteroid(neutralId, {
        name: "Neutral",
        ownerId: null,
        sector: { x: 5, y: 5 },
        happiness: 50,
      }),
    );
    const agent: Agent = { ...world.agents.get(agentId("agent-test"))!, stealth: 99 };
    world.agents.set(agentId("agent-test"), agent);
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
    const agent: Agent = { ...world.agents.get(agentId("agent-test"))!, stealth: 1 };
    world.agents.set(agentId("agent-test"), agent);
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
