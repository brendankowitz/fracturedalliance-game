import type { AgentMissionKind } from "./agent.ts";
import type { AsteroidId, BlueprintId, PlayerId } from "./ids.ts";
import type { TreatyKind } from "./treaty.ts";
import type { GameEndState } from "./types.ts";

export type EventPriority = "red" | "amber" | "grey" | "green";

export type GameEvent =
  | { kind: "colony.under_attack"; priority: "red"; asteroidId: AsteroidId; attackerId: PlayerId }
  | { kind: "colony.starved"; priority: "red"; asteroidId: AsteroidId }
  | { kind: "colony.captured"; priority: "red"; asteroidId: AsteroidId; byPlayerId: PlayerId }
  | { kind: "asteroid.incoming"; priority: "red"; targetId: AsteroidId; etaTick: number }
  | { kind: "trader.arrived"; priority: "amber"; asteroidId: AsteroidId }
  | { kind: "construction.done"; priority: "grey"; asteroidId: AsteroidId; buildingKind: string }
  | {
      kind: "treaty.broken";
      priority: "amber";
      by: PlayerId;
      against: PlayerId;
      treaty: TreatyKind;
    }
  | { kind: "blueprint.purchased"; priority: "grey"; playerId: PlayerId; blueprintId: BlueprintId }
  | {
      kind: "agent.mission_complete";
      priority: "grey";
      agentName: string;
      missionKind: AgentMissionKind;
      targetAsteroidName: string;
    }
  | { kind: "agent.captured"; priority: "amber"; agentName: string }
  | { kind: "agent.mission_failed"; priority: "grey"; agentName: string }
  | { kind: "asteroid.engine_charging"; priority: "amber"; asteroidName: string; destinationName: string }
  | { kind: "asteroid.engine_fired"; priority: "red"; asteroidName: string; destinationName: string }
  | { kind: "asteroid.lost_in_collision"; priority: "red"; asteroidName: string }
  | { kind: "asteroid.captured_in_collision"; priority: "green"; asteroidName: string }
  | { kind: "asteroid.deflected"; priority: "amber"; asteroidName: string }
  | { kind: "blackmarket.purchase"; priority: "grey"; itemKind: string }
  | { kind: "bribe.accepted"; priority: "green"; targetRaceId: string }
  | { kind: "bribe.rejected"; priority: "grey"; targetRaceId: string }
  | { kind: "federation.investigation_warning"; priority: "amber" }
  | { kind: "federation.license_revoked"; priority: "red" }
  | { kind: "expedition.enforcer_arrived"; priority: "red"; asteroidName: string }
  | { kind: "victory.independence"; priority: "green" }
  | { kind: "asteroid.independence"; priority: "amber"; asteroidName: string }
  | { kind: "game.ended"; priority: "red"; state: GameEndState };
