/**
 * Per-race personality weighting of the AI action catalogue.
 */

import type { RaceDef } from '@fab/domain';

export type ActionKind =
  | 'buildBuilding'
  | 'research'
  | 'produceShip'
  | 'dispatchFleet'
  | 'launchMissile'
  | 'proposeTreaty'
  | 'declareWar'
  | 'tradeOnMarket'
  | 'scout'
  | 'activateAsteroidEngine'
  | 'dispatchAgent';

export const personalityWeight = (race: RaceDef, action: ActionKind): number => {
  const p = race.personality;
  switch (action) {
    case 'buildBuilding':
      // Build is the AI's highest-leverage action — without buildings it
      // can't mine, ship, or wage war. Heavily weighted so it always
      // contests the top-2 slot until the colony is built out.
      return 1.0 + p.expansionBias * 0.6;
    case 'research':
      return 0.5 + p.techBias * 0.8;
    case 'produceShip':
      // Once a shipyard exists, ship production must compete with build/
      // research for slot 2 — bumped from 0.4 to 0.7 baseline.
      return 0.7 + p.aggression * 0.6;
    case 'dispatchFleet':
      return 0.5 + p.aggression * 0.9;
    case 'launchMissile':
      return 0.4 + p.aggression * 1.0;
    case 'proposeTreaty':
      // Halved baseline (was 0.5) so the AI doesn't spam treaty proposals
      // every turn — the action's `score()` already gates on having
      // viable partners. Stream E1 (2026-04-23 sanity rev2 retune).
      return 0.25 + p.treatyRespect * 0.4 + p.tradeBias * 0.2;
    case 'declareWar':
      return p.aggression * 1.0 - p.treatyRespect * 0.4;
    case 'tradeOnMarket':
      return 0.6 + p.tradeBias * 0.8;
    case 'scout':
      // Bumped so scout production shows up at least once per match.
      return 0.55 + p.expansionBias * 0.4;
    case 'activateAsteroidEngine':
      return 0.1 + p.ramWillingness * 1.0;
    case 'dispatchAgent':
      return 0.2 + p.aggression * 0.4;
  }
};
