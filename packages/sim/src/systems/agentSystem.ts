import { getAllBlueprintDefs } from "@fa/content";
import type { Agent, AgentMissionKind, AsteroidId, Player, World } from "@fa/domain";
import { blueprintId } from "@fa/domain";

const MISSION_LABELS: Record<AgentMissionKind, string> = {
  recon: "Recon",
  techSteal: "Tech Steal",
  sabotage: "Sabotage",
  blackmail: "Blackmail",
  liberate: "Liberate",
};

function defenderSecurity(world: World, asteroidId: AsteroidId): number {
  const asteroid = world.asteroids.get(asteroidId);
  if (!asteroid) return 0;
  const secCount = asteroid.buildings.filter((bid) => {
    const b = world.buildings.get(bid);
    return b?.defKind === "securityCentre" && b.constructionProgress >= 1;
  }).length;
  return Math.min(secCount * 15, 85);
}

function resolveSuccess(agent: Agent, security: number, world: World): boolean {
  const roll = Math.floor(world.prng.next() * 100) + 1;
  const threshold = agent.stealth - security;
  return roll <= threshold;
}

function isCaptured(agent: Agent, security: number, world: World): boolean {
  const roll = Math.floor(world.prng.next() * 100) + 1;
  const threshold = agent.stealth - security;
  return roll > threshold + 40;
}

function applyMissionEffect(world: World, agent: Agent, human: Player): void {
  const targetId = agent.missionTarget;
  if (!targetId) return;
  const target = world.asteroids.get(targetId);
  if (!target) return;
  const targetName = target.name;

  switch (agent.missionKind) {
    case "recon": {
      world.eventQueue.push({
        kind: "agent.mission_complete",
        priority: "grey",
        agentName: agent.name,
        missionKind: "recon",
        targetAsteroidName: targetName,
      });
      break;
    }
    case "techSteal": {
      const allBps = getAllBlueprintDefs();
      const unowned = allBps.filter((bp) => !human.blueprintsOwned.has(blueprintId(bp.id)));
      if (unowned.length > 0) {
        const idx = Math.floor(world.prng.next() * unowned.length);
        const stolen = unowned[idx];
        if (stolen) {
          human.blueprintsOwned.add(blueprintId(stolen.id));
        }
      }
      world.eventQueue.push({
        kind: "agent.mission_complete",
        priority: "grey",
        agentName: agent.name,
        missionKind: "techSteal",
        targetAsteroidName: targetName,
      });
      break;
    }
    case "sabotage": {
      const completeBids = target.buildings.filter((bid) => {
        const b = world.buildings.get(bid);
        return b && b.constructionProgress >= 1 && b.defKind !== "cpu";
      });
      if (completeBids.length > 0) {
        const idx = Math.floor(world.prng.next() * completeBids.length);
        const bidToRemove = completeBids[idx];
        if (bidToRemove) {
          world.buildings.delete(bidToRemove);
          target.buildings = target.buildings.filter((bid) => bid !== bidToRemove);
        }
      }
      world.eventQueue.push({
        kind: "agent.mission_complete",
        priority: "grey",
        agentName: agent.name,
        missionKind: "sabotage",
        targetAsteroidName: targetName,
      });
      break;
    }
    case "blackmail": {
      if (target.ownerId) {
        const targetOwner = world.players.get(target.ownerId);
        if (targetOwner && !targetOwner.isHuman) {
          const stolen = Math.floor(targetOwner.credits * 0.1);
          targetOwner.credits -= stolen;
          human.credits += stolen;
        }
      }
      world.eventQueue.push({
        kind: "agent.mission_complete",
        priority: "grey",
        agentName: agent.name,
        missionKind: "blackmail",
        targetAsteroidName: targetName,
      });
      break;
    }
    case "liberate": {
      if (!target.ownerId) {
        target.ownerId = human.id;
      }
      world.eventQueue.push({
        kind: "agent.mission_complete",
        priority: "grey",
        agentName: agent.name,
        missionKind: "liberate",
        targetAsteroidName: targetName,
      });
      break;
    }
    default:
      break;
  }
}

function clearMission(agent: Agent): void {
  agent.missionKind = null;
  agent.missionTarget = null;
  agent.missionCompleteTick = null;
}

export function tickAgents(world: World): void {
  const human = [...world.players.values()].find((p) => p.isHuman);
  if (!human) return;

  for (const agent of world.agents.values()) {
    if (agent.ownerId !== human.id) continue;
    if (agent.missionKind === null || agent.missionCompleteTick === null) continue;
    if (world.tick < agent.missionCompleteTick) continue;

    const security = defenderSecurity(world, agent.missionTarget ?? ("" as AsteroidId));
    const succeeded = resolveSuccess(agent, security, world);

    if (succeeded) {
      applyMissionEffect(world, agent, human);
      clearMission(agent);
    } else {
      const captured = isCaptured(agent, security, world);
      if (captured) {
        world.eventQueue.push({
          kind: "agent.captured",
          priority: "amber",
          agentName: agent.name,
        });
        world.agents.delete(agent.id);
      } else {
        world.eventQueue.push({
          kind: "agent.mission_failed",
          priority: "grey",
          agentName: agent.name,
        });
        clearMission(agent);
      }
    }
  }
}

// Suppress unused variable warning — MISSION_LABELS is intentionally exported for UI use
export { MISSION_LABELS };
