/**
 * Federal Council — embargo / tariff / vote system (spec §A.4).
 *
 * The Council ticks on a slow cadence (every COUNCIL_INTERVAL_TICKS) and
 * stochastically schedules one of three event kinds:
 *   • embargo — bans a target player from selling to the federal market for N ticks.
 *   • tariff  — applies a sell-price multiplier (<1) on a target ore for N ticks.
 *   • vote    — opens an inbox prompt; the human player accepts/rejects via UI.
 *
 * Active embargoes & tariffs are stored on World.councilState so the market
 * phase can consult them without mutating ScenarioDef.
 */

import type { PlayerId } from './ids';
import type { OreKind } from './resources';

export interface ActiveEmbargo {
  readonly target: PlayerId;
  readonly expiresTick: number;
  readonly reason: string;
}

export interface ActiveTariff {
  readonly ore: OreKind;
  /** Multiplier applied to federal sell price (e.g. 0.7 for 30% tariff). */
  readonly multiplier: number;
  readonly expiresTick: number;
}

export interface OpenVote {
  readonly id: string;
  readonly proposedTick: number;
  readonly resolveTick: number;
  readonly title: string;
  readonly description: string;
  /** Outcome applied if the vote passes — encoded as a discriminated union. */
  readonly onPass: VoteEffect;
}

export type VoteEffect =
  | { kind: 'embargo'; target: PlayerId; ticks: number; reason: string }
  | { kind: 'tariff'; ore: OreKind; multiplier: number; ticks: number }
  | { kind: 'grant'; recipient: PlayerId; credits: number }
  | { kind: 'censure'; target: PlayerId; reputationDelta: number };

export interface FederalCouncilState {
  readonly nextActionTick: number;
  readonly embargoes: readonly ActiveEmbargo[];
  readonly tariffs: readonly ActiveTariff[];
  readonly openVotes: readonly OpenVote[];
}

/** Council convenes every 1200 ticks (~60 s @ 20 Hz). */
export const COUNCIL_INTERVAL_TICKS = 1200;

export const initialFederalCouncilState = (): FederalCouncilState => ({
  nextActionTick: COUNCIL_INTERVAL_TICKS,
  embargoes: [],
  tariffs: [],
  openVotes: [],
});
