import type { Asteroid } from './asteroid';
import type { Building } from './building';
import type { PlayerCommand } from './commands';
import type { DetectionState } from './detection';
import type { Difficulty } from './difficulty';
import type { EspionageState } from './espionage';
import type { GameEvent } from './events';
import type { FederalCouncilState } from './federalCouncil';
import type { AsteroidId, BuildingId, PlayerId, ShipId } from './ids';
import type { GameOutcome } from './outcome';
import type { Player } from './player';
import type { OreKind } from './resources';
import type { Satellite } from './satellite';
import type { ScheduledEvent } from './scheduled';
import type { ScriptedTrigger } from './scriptedTriggers';
import type { Missile, Ship } from './ship';
import type { Treaty } from './treaty';

/** Serialised PRNG state for mulberry32 plus its labelled sub-generators. */
export interface PrngState {
  seed: number;
  subs: Record<string, number>;
}

export interface MarketPrices {
  /** Current universe-wide buy price per ore unit in credits. */
  current: Record<OreKind, number>;
  /** Phase accumulator for the stepped sinusoid (ticks). */
  phase: number;
}

/**
 * Tutorial progression for scripted scenarios. `null` when the scenario is
 * free-form (skirmish / campaign). Field is serialised so save/load carries
 * tutorial progress forward across sessions.
 */
export interface TutorialState {
  activeObjectiveId: string | null;
  completed: string[];
  hintsShown: string[];
}

/**
 * Optional hook called by the `aiPhase` stub. Real AI scoring arrives in
 * Phase 7; in the meantime, tests and scenarios may inject bespoke
 * behaviour through this reference without the sim taking on a hard dep.
 */
export type AiHooks = (world: World) => void;

export interface World {
  tick: number;
  seed: number;
  asteroids: Map<AsteroidId, Asteroid>;
  buildings: Map<BuildingId, Building>;
  ships: Map<ShipId, Ship>;
  missiles: Missile[];
  players: Map<PlayerId, Player>;
  treaties: Treaty[];
  market: MarketPrices;
  /** Outbound delivered events — UI notification feed reads from here. */
  eventQueue: GameEvent[];
  /** Events scheduled for a future tick; drained when `tick >= triggerTick`. */
  scheduledEvents: ScheduledEvent[];
  /** Inbound commands awaiting validation by the `commandPhase`. */
  commandQueue: PlayerCommand[];
  rng: PrngState;
  schemaVersion: number;
  createdAtIso: string;
  scenarioId: string;
  /**
   * Stream E3 — game-wide difficulty selected on the MainMenu. Controls
   * AI aggression, starting-resources multiplier, and survival time
   * limit. Optional for backwards compatibility with v0.1 saves; treat
   * a missing value as `'normal'`.
   */
  difficulty?: Difficulty;
  /** Monotonic id counters for deterministic entity creation. */
  nextBuildingId: number;
  nextShipId: number;
  nextTreatyId: number;
  /** Tick on which the next Federal Transporter delivery resolves. */
  federalTransporterNextTick: number;
  /** Monotonic id counter for deterministic missile creation. */
  nextMissileId: number;
  /** Game-over state. `null` while the match is still active. */
  outcome: GameOutcome | null;
  /** Phase 12 — scripted tutorial progression, or `null` for free-form. */
  tutorialState: TutorialState | null;
  /**
   * Phase 12 — transient trace of successfully-applied command kinds on the
   * current tick. Populated by `commandPhase`, consumed and cleared by
   * `tutorialPhase`. Serialised for save/load robustness; typically empty
   * outside a single tick window.
   */
  commandTrace: string[];
  /** Non-serialised hook used only by AI phase tests/stubs. */
  aiHooks?: AiHooks;
  // ── Phase 0.2 — Stream B additions (all optional; defaulted in deserialise). ──
  /** Espionage agents, missions, suspicion. */
  espionage?: EspionageState;
  /** Per-player visibility set. */
  detection?: DetectionState;
  /** Federal Council state — embargoes, tariffs, votes. */
  council?: FederalCouncilState;
  /** Live in-orbit satellites. */
  satellites?: Satellite[];
  /** Scripted scenario triggers + fired-set. */
  scenarioTriggers?: readonly ScriptedTrigger[];
  scenarioTriggersFired?: number[];
}
