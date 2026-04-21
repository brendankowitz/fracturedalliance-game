import type {
  AgentId,
  AgentMissionKind,
  AsteroidId,
  BlackMarketItemKind,
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
  | { kind: "sellOreToTrader"; playerId: PlayerId; oreKind: OreKind }
  | { kind: "proposeTreaty"; targetPlayerId: PlayerId; treatyKind: TreatyKind }
  | { kind: "buyBlueprint"; blueprintId: string }
  | { kind: "hireAgent"; agentId: AgentId }
  | { kind: "assignMission"; agentId: AgentId; missionKind: AgentMissionKind; targetAsteroidId: AsteroidId }
  | { kind: "setAsteroidDestination"; asteroidId: AsteroidId; destinationId: AsteroidId }
  | { kind: "cancelAsteroidEngine"; asteroidId: AsteroidId }
  | { kind: "blackMarketBuy"; itemKind: BlackMarketItemKind }
  | { kind: "bribeOfficial"; targetPlayerId: PlayerId; credits: number }
  | { kind: "sellOre"; oreKind: string; quantity: number }
  | { kind: "buyOre"; oreKind: string; quantity: number }
  | { kind: "fireMissile"; sourceAsteroidId: AsteroidId; targetAsteroidId: AsteroidId }
  | { kind: "settleAsteroid"; asteroidId: AsteroidId };
