import type {
  AgentId,
  AgentMissionKind,
  AsteroidId,
  OreKind,
  PlayerId,
  ShipId,
  ShipOrder,
  TreatyKind,
} from "@fa/domain";

export type Command =
  | {
      kind: "placeBuilding";
      asteroidId: AsteroidId;
      buildingKind: string;
      cell: { x: number; y: number };
    }
  | { kind: "cancelBuildQueue"; asteroidId: AsteroidId; index: number }
  | { kind: "launchShip"; asteroidId: AsteroidId; shipKind: string }
  | { kind: "orderShip"; shipId: ShipId; order: ShipOrder }
  | { kind: "sellOre"; playerId: PlayerId; oreKind: OreKind }
  | { kind: "proposeTreaty"; targetPlayerId: PlayerId; treatyKind: TreatyKind }
  | { kind: "buyBlueprint"; blueprintId: string }
  | { kind: "hireAgent"; agentId: AgentId }
  | { kind: "assignMission"; agentId: AgentId; missionKind: AgentMissionKind; targetAsteroidId: AsteroidId };
