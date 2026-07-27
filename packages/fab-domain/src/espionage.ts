/**
 * Espionage — agents, missions, and counter-intelligence (spec §C.7, §A.6).
 *
 * Twenty named operatives are spawned at world creation and pooled across all
 * players. A player "dispatches" an agent by paying their hire cost; the
 * mission resolves N ticks later via a d100 roll modified by the agent's
 * skill and the target's `Security` rating. On capture (p ≥ 0.4) the agent
 * is removed from the pool, the employer is revealed via an
 * `espionage.agent.captured` event, and the target's rep with the employer
 * collapses by 30. Successful sabotage missions damage buildings; recon
 * missions reveal the target colony's grid for 200 ticks via the Detection
 * system (B2).
 */

import type { AsteroidId, BuildingId, PlayerId } from './ids';

export type EspionageMissionKind =
  | 'recon'
  | 'techSteal'
  | 'sabotageLifeSupport'
  | 'sabotagePower'
  | 'sabotageDefences'
  | 'sabotageConstruction'
  | 'plantVirus'
  | 'blackmail'
  | 'intelGather'
  | 'liberate';

export type AgentSpeciality = 'infiltrator' | 'saboteur' | 'analyst' | 'liberator';

/** Static catalogue entry — spawned into AgentState at world-create. */
export interface AgentDef {
  readonly id: string;
  readonly name: string;
  readonly speciality: AgentSpeciality;
  /** 1..100 base mission roll modifier. */
  readonly skill: number;
  /** Credits cost to dispatch on a single mission. */
  readonly hireCost: number;
}

/** Live agent — mutable instance held in EspionageState.agents. */
export interface Agent {
  readonly id: string;
  /** null = in pool / available; otherwise = currently employed by this player. */
  employer: PlayerId | null;
  /** True after a captured-and-revealed event; agent is permanently removed. */
  captured: boolean;
  /** Total successful missions, used for veteran bonus (+5/lvl, capped at +25). */
  successes: number;
}

export interface EspionageMission {
  readonly id: string;
  readonly agentId: string;
  readonly employer: PlayerId;
  readonly target: PlayerId;
  readonly targetAsteroid: AsteroidId | null;
  readonly kind: EspionageMissionKind;
  /** Tick on which the mission resolves. */
  readonly resolveTick: number;
  /** Snapshot of the agent's effective skill on dispatch (incl. veteran bonus). */
  readonly skill: number;
}

/** Global espionage state held on World. Optional — defaults to empty. */
export interface EspionageState {
  /** Static catalogue snapshot — repeated on World for save-game robustness. */
  readonly agents: readonly Agent[];
  /** Active missions awaiting resolution. */
  readonly missions: readonly EspionageMission[];
  /** Per-player counter-intel suspicion meter (0..100). Distinct from market suspicion. */
  readonly counterIntel: Readonly<Record<PlayerId, number>>;
  /** Buildings damaged this tick — drained by detection/UI systems. */
  readonly recentSabotage: readonly BuildingId[];
}

/**
 * Canonical 20 named operatives (spec §C.7). Skills sum ≈ 1100 so the average
 * agent is a 55, with two outliers at 90+ for late-game espionage races.
 */
export const AGENT_CATALOGUE: readonly AgentDef[] = [
  { id: 'agt.azure-fox', name: 'Azure Fox', speciality: 'infiltrator', skill: 90, hireCost: 4000 },
  { id: 'agt.ghost-quill', name: 'Ghost Quill', speciality: 'analyst', skill: 85, hireCost: 3500 },
  { id: 'agt.rust-talon', name: 'Rust Talon', speciality: 'saboteur', skill: 80, hireCost: 3500 },
  { id: 'agt.silent-monsoon', name: 'Silent Monsoon', speciality: 'infiltrator', skill: 75, hireCost: 3000 },
  { id: 'agt.iron-vesper', name: 'Iron Vesper', speciality: 'saboteur', skill: 70, hireCost: 3000 },
  { id: 'agt.glass-warden', name: 'Glass Warden', speciality: 'liberator', skill: 65, hireCost: 2750 },
  { id: 'agt.mercury-hare', name: 'Mercury Hare', speciality: 'infiltrator', skill: 60, hireCost: 2500 },
  { id: 'agt.cobalt-thorn', name: 'Cobalt Thorn', speciality: 'saboteur', skill: 60, hireCost: 2500 },
  { id: 'agt.ember-clerk', name: 'Ember Clerk', speciality: 'analyst', skill: 55, hireCost: 2250 },
  { id: 'agt.violet-mason', name: 'Violet Mason', speciality: 'liberator', skill: 55, hireCost: 2250 },
  { id: 'agt.brass-ophir', name: 'Brass Ophir', speciality: 'analyst', skill: 50, hireCost: 2000 },
  { id: 'agt.spruce-archer', name: 'Spruce Archer', speciality: 'infiltrator', skill: 50, hireCost: 2000 },
  { id: 'agt.nickel-hymn', name: 'Nickel Hymn', speciality: 'saboteur', skill: 45, hireCost: 1800 },
  { id: 'agt.amber-jury', name: 'Amber Jury', speciality: 'analyst', skill: 45, hireCost: 1800 },
  { id: 'agt.tungsten-oracle', name: 'Tungsten Oracle', speciality: 'analyst', skill: 40, hireCost: 1600 },
  { id: 'agt.silver-rook', name: 'Silver Rook', speciality: 'infiltrator', skill: 40, hireCost: 1600 },
  { id: 'agt.zinc-wisp', name: 'Zinc Wisp', speciality: 'saboteur', skill: 35, hireCost: 1400 },
  { id: 'agt.opal-mariner', name: 'Opal Mariner', speciality: 'liberator', skill: 35, hireCost: 1400 },
  { id: 'agt.verdigris-mute', name: 'Verdigris Mute', speciality: 'saboteur', skill: 30, hireCost: 1200 },
  { id: 'agt.copper-runt', name: 'Copper Runt', speciality: 'infiltrator', skill: 25, hireCost: 1000 },
] as const;

/** Suspicion threshold above which the Federal Council unlocks black-market accusations. */
export const BLACK_MARKET_SUSPICION_THRESHOLD = 70;

/** Probability captured agents reveal their employer. Tuned per spec §A.6. */
export const CAPTURE_REVEAL_PROBABILITY = 0.4;

/** Default mission resolution latency (ticks). 20 Hz × 12 s = 240. */
export const DEFAULT_MISSION_RESOLUTION_TICKS = 240;

/** Mission damage applied to a single sabotaged building, in HP. */
export const SABOTAGE_BUILDING_DAMAGE = 200;

/** Build a fresh EspionageState with all 20 agents in the pool. */
export const initialEspionageState = (): EspionageState => ({
  agents: AGENT_CATALOGUE.map((d) => ({
    id: d.id,
    employer: null,
    captured: false,
    successes: 0,
  })),
  missions: [],
  counterIntel: {},
  recentSabotage: [],
});
