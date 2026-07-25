import type { AsteroidId, BlueprintId, PlayerId, ShipId } from './ids';
import type { TreatyKind } from './treaty';

export type EventSeverity = 'red' | 'amber' | 'grey';

export type GameEvent =
  | {
      kind: 'colony.under_attack';
      severity: 'red';
      asteroidId: AsteroidId;
      attackerId: PlayerId;
      tick: number;
    }
  | { kind: 'colony.starved'; severity: 'red'; asteroidId: AsteroidId; tick: number }
  | { kind: 'colony.seceded'; severity: 'red'; asteroidId: AsteroidId; toRaceId: string; tick: number }
  | { kind: 'trader.arrived'; severity: 'grey'; asteroidId: AsteroidId; tick: number }
  | {
      kind: 'blueprint.unlocked';
      severity: 'grey';
      playerId: PlayerId;
      blueprintId: BlueprintId;
      tick: number;
    }
  | {
      kind: 'treaty.signed';
      severity: 'grey';
      treaty: TreatyKind;
      parties: [PlayerId, PlayerId];
      tick: number;
    }
  | {
      kind: 'treaty.broken';
      severity: 'amber';
      by: PlayerId;
      against: PlayerId;
      treaty: TreatyKind;
      tick: number;
    }
  | { kind: 'asteroid.incoming'; severity: 'red'; asteroidId: AsteroidId; etaTick: number; tick: number }
  | { kind: 'federal.transporter'; severity: 'grey'; asteroidId: AsteroidId; tick: number }
  | { kind: 'federal.investigation'; severity: 'amber'; playerId: PlayerId; suspicion: number; tick: number }
  | { kind: 'ship.destroyed'; severity: 'amber'; shipId: ShipId; ownerId: PlayerId; tick: number }
  | { kind: 'famine.projected'; severity: 'amber'; asteroidId: AsteroidId; inDays: number; tick: number }
  | {
      kind: 'resource.deficit';
      severity: 'amber';
      asteroidId: AsteroidId;
      resource: 'food' | 'water' | 'air' | 'power' | 'credits';
      tick: number;
    }
  | {
      kind: 'population.unrest';
      severity: 'amber';
      asteroidId: AsteroidId;
      happiness: number;
      tick: number;
    }
  | {
      kind: 'research.started';
      severity: 'grey';
      playerId: PlayerId;
      blueprintId: BlueprintId;
      tick: number;
    }
  | {
      kind: 'research.completed';
      severity: 'grey';
      playerId: PlayerId;
      blueprintId: BlueprintId;
      tick: number;
    }
  | {
      kind: 'market.shock';
      severity: 'amber';
      ore: import('./resources').OreKind;
      multiplier: number;
      tick: number;
    }
  | {
      kind: 'buildQueue.completed';
      severity: 'grey';
      asteroidId: AsteroidId;
      buildingKind: string;
      tick: number;
    }
  | {
      kind: 'command.rejected';
      severity: 'amber';
      reason: string;
      tick: number;
    }
  | {
      kind: 'tutorial.objective.completed';
      severity: 'grey';
      objectiveId: string;
      rewardCredits: number;
      tick: number;
    }
  | {
      // Stream E5 — emitted whenever the runner promotes an objective
      // into the active slot, so the HUD can flash the new step's
      // description without polling tutorialState every frame.
      kind: 'tutorial.objective.activated';
      severity: 'grey';
      objectiveId: string;
      tick: number;
    }
  // ── Phase 0.2 — Stream B additions ──
  | {
      kind: 'espionage.mission.dispatched';
      severity: 'grey';
      employer: PlayerId;
      target: PlayerId;
      agentId: string;
      mission: string;
      tick: number;
    }
  | {
      kind: 'espionage.mission.resolved';
      severity: 'amber';
      employer: PlayerId;
      target: PlayerId;
      agentId: string;
      mission: string;
      success: boolean;
      tick: number;
    }
  | {
      kind: 'espionage.agent.captured';
      severity: 'red';
      employer: PlayerId;
      target: PlayerId;
      agentId: string;
      revealed: boolean;
      tick: number;
    }
  | {
      kind: 'blackMarket.unlocked';
      severity: 'grey';
      playerId: PlayerId;
      tick: number;
    }
  | {
      kind: 'council.embargo';
      severity: 'amber';
      target: PlayerId;
      reason: string;
      expiresTick: number;
      tick: number;
    }
  | {
      kind: 'council.tariff';
      severity: 'amber';
      ore: import('./resources').OreKind;
      multiplier: number;
      expiresTick: number;
      tick: number;
    }
  | {
      kind: 'council.vote.opened';
      severity: 'grey';
      voteId: string;
      title: string;
      resolveTick: number;
      tick: number;
    }
  | {
      kind: 'satellite.launched';
      severity: 'grey';
      ownerId: PlayerId;
      asteroidId: AsteroidId;
      satelliteId: ShipId;
      kind_: 'spy' | 'comms' | 'weapons';
      tick: number;
    }
  | {
      kind: 'satellite.destroyed';
      severity: 'amber';
      satelliteId: ShipId;
      ownerId: PlayerId;
      tick: number;
    }
  | {
      kind: 'odp.intercepted';
      severity: 'grey';
      defenderId: PlayerId;
      attackerId: PlayerId;
      tick: number;
    }
  | {
      // Stream E6 — terminal end-of-match marker. Emitted exactly once,
      // at the same tick `world.outcome` is populated. The HUD listens
      // for this to surface the post-match summary screen.
      kind: 'game.over';
      severity: 'amber';
      winnerId: PlayerId;
      condition: 'economic' | 'military' | 'diplomatic' | 'scientific' | 'survival';
      tick: number;
    };
