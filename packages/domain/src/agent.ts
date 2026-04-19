import type { AgentId, AsteroidId, PlayerId } from "./ids.ts";

export type AgentMissionKind = "recon" | "techSteal" | "sabotage" | "blackmail" | "liberate";

export interface Agent {
  readonly id: AgentId;
  readonly name: string;
  ownerId: PlayerId | null;
  readonly stealth: number;
  readonly hireCost: number;
  missionKind: AgentMissionKind | null;
  missionTarget: AsteroidId | null;
  missionCompleteTick: number | null;
}
