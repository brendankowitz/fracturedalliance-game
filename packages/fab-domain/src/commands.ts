import type { AsteroidId, BlueprintId, BuildingId, PlayerId, ShipId } from './ids';
import type { OreKind } from './resources';
import type { BombardmentKind, MissileKind, ShipKind, ShipOrder } from './ship';
import type { TreatyKind } from './treaty';

/** Commands posted from the main thread (UI) to the sim worker. */
export type PlayerCommand =
  | { kind: 'queueBuild'; asteroid: AsteroidId; building: string; cell: { x: number; y: number } }
  | { kind: 'cancelBuild'; asteroid: AsteroidId; index: number }
  | { kind: 'demolishBuilding'; building: BuildingId }
  | { kind: 'setSpeed'; multiplier: 0 | 0.5 | 1 | 2 | 4 | 8 }
  | { kind: 'purchaseBlueprint'; playerId: PlayerId; blueprint: BlueprintId }
  | { kind: 'startResearch'; playerId: PlayerId; blueprint: BlueprintId }
  | { kind: 'issueShipOrder'; ship: ShipId; order: ShipOrder }
  | {
      kind: 'sellOres';
      asteroid: AsteroidId;
      ores: Partial<Record<OreKind, number>>;
      channel: 'federal' | 'merchant' | 'blackMarket';
    }
  | { kind: 'queueSellOrder'; playerId: PlayerId; asteroid: AsteroidId; ore: OreKind; tonnes: number }
  | { kind: 'queueBuyOrder'; playerId: PlayerId; asteroid: AsteroidId; ore: OreKind; tonnes: number }
  | { kind: 'proposeTreaty'; from: PlayerId; with: PlayerId; treaty: TreatyKind }
  | { kind: 'respondTreaty'; from: PlayerId; with: PlayerId; treaty: TreatyKind; accept: boolean }
  | { kind: 'breakTreaty'; from: PlayerId; with: PlayerId; treaty: TreatyKind }
  | { kind: 'declareWar'; from: PlayerId; against: PlayerId }
  | { kind: 'launchMission'; fromAsteroid: AsteroidId; target: AsteroidId; mission: string }
  | { kind: 'launchEngine'; asteroid: AsteroidId; destination: AsteroidId }
  | { kind: 'abortEngine'; asteroid: AsteroidId }
  | {
      kind: 'dispatchAgent';
      agentId: string;
      targetPlayer: PlayerId;
      mission: string;
      targetAsteroid?: AsteroidId;
    }
  // ── Phase 6 — combat ───────────────────────────────────────────────────────
  | {
      kind: 'launchMissile';
      from: PlayerId;
      fromAsteroid: AsteroidId;
      target: AsteroidId;
      missile: MissileKind;
    }
  | {
      kind: 'bombardAsteroid';
      from: PlayerId;
      fromAsteroid: AsteroidId;
      target: AsteroidId;
      bombardment: BombardmentKind;
    }
  | {
      kind: 'launchFleet';
      from: PlayerId;
      sourceAsteroid: AsteroidId;
      targetAsteroid: AsteroidId;
      ships: ShipId[];
    }
  | { kind: 'recallFleet'; from: PlayerId; ships: ShipId[] }
  | {
      kind: 'produceShip';
      from: PlayerId;
      asteroid: AsteroidId;
      ship: ShipKind;
    }
  // ── Phase 9 — asteroid engine ──────────────────────────────────────────────
  | {
      kind: 'setAsteroidCourse';
      from: PlayerId;
      asteroid: AsteroidId;
      targetX: number;
      targetY: number;
      thrust: number;
    }
  // ── Phase 0.2 — Stream B additions ──
  | {
      kind: 'launchSatellite';
      from: PlayerId;
      fromAsteroid: AsteroidId;
      target: AsteroidId;
      satellite: 'spy' | 'comms' | 'weapons';
    }
  | {
      kind: 'councilVoteRespond';
      from: PlayerId;
      voteId: string;
      accept: boolean;
    }
  // ── opus Stage-1 delta — expansion (see systems/settlement.ts in @fab/sim) ──
  | { kind: 'settleAsteroid'; from: PlayerId; asteroid: AsteroidId };
