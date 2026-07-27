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
  | {
      kind: "assignMission";
      agentId: AgentId;
      missionKind: AgentMissionKind;
      targetAsteroidId: AsteroidId;
    }
  | { kind: "setAsteroidDestination"; asteroidId: AsteroidId; destinationId: AsteroidId }
  | { kind: "cancelAsteroidEngine"; asteroidId: AsteroidId }
  | { kind: "blackMarketBuy"; itemKind: BlackMarketItemKind }
  | { kind: "bribeOfficial"; targetPlayerId: PlayerId; credits: number }
  // asteroidId selects which colony's stockpile the order draws from /
  // delivers to under the adopted per-asteroid ore model; the legacy sim
  // ignores it (global inventory).
  | { kind: "sellOre"; oreKind: OreKind; quantity: number; asteroidId?: AsteroidId }
  | { kind: "buyOre"; oreKind: OreKind; quantity: number; asteroidId?: AsteroidId }
  | { kind: "fireMissile"; sourceAsteroidId: AsteroidId; targetAsteroidId: AsteroidId }
  | { kind: "settleAsteroid"; asteroidId: AsteroidId }
  // Adopted-sim commands (Stage 1); the legacy sim ignores them.
  | { kind: "breakTreaty"; targetPlayerId: PlayerId; treatyKind: TreatyKind }
  | { kind: "councilVoteRespond"; voteId: string; accept: boolean };
