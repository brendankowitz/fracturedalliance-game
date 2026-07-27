/**
 * Federal Council system tests.
 */

import { asPlayerId, COUNCIL_INTERVAL_TICKS, type World } from '@fab/domain';
import { describe, expect, it } from 'vitest';
import { PrngRegistry } from '../rng/subGenerators';
import { CURRENT_SCHEMA_VERSION } from '../serializer/migrations';
import { applyCommand } from './commands';
import { federalCouncilPhase, handleCouncilVoteRespond } from './federalCouncil';

const makeWorld = (seed = 1): World => {
  const reg = new PrngRegistry(seed);
  const human = asPlayerId('p.human');
  const ai = asPlayerId('p.ai');
  return {
    tick: 0,
    seed,
    asteroids: new Map(),
    buildings: new Map(),
    ships: new Map(),
    missiles: [],
    players: new Map([
      [
        human,
        {
          id: human,
          raceId: 'terrans',
          isHuman: true,
          credits: 0,
          reputation: {},
          federationStanding: 50,
          blueprintsOwned: new Set(),
          eventLog: [],
          alive: true,
          suspicion: 0,
          activeResearch: null,
          marketOrders: [],
          totalCreditsEarned: 0,
          economicControlTicks: 0,
        },
      ],
      [
        ai,
        {
          id: ai,
          raceId: 'venta',
          isHuman: false,
          credits: 0,
          reputation: {},
          federationStanding: -50,
          blueprintsOwned: new Set(),
          eventLog: [],
          alive: true,
          suspicion: 0,
          activeResearch: null,
          marketOrders: [],
          totalCreditsEarned: 0,
          economicControlTicks: 0,
        },
      ],
    ]),
    treaties: [],
    market: {
      current: {
        selenium: 1,
        asteros: 1,
        barium: 1,
        crystalite: 1,
        quazinc: 1,
        bytanium: 1,
        korellium: 1,
        dragonium: 1,
        traxium: 1,
        nexos: 1,
      },
      phase: 0,
    },
    eventQueue: [],
    scheduledEvents: [],
    commandQueue: [],
    rng: reg.snapshot(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAtIso: new Date(0).toISOString(),
    scenarioId: 'test',
    nextBuildingId: 1,
    nextShipId: 1,
    nextTreatyId: 1,
    nextMissileId: 1,
    federalTransporterNextTick: 0,
    outcome: null,
    tutorialState: null,
    commandTrace: [],
  };
};

describe('federal council', () => {
  it('initialises state and convenes after the interval', () => {
    const w = makeWorld();
    const reg = PrngRegistry.restore(w.rng);
    federalCouncilPhase(w, reg);
    expect(w.council).toBeDefined();
    expect(w.eventQueue.length).toBe(0);
    w.tick = COUNCIL_INTERVAL_TICKS;
    federalCouncilPhase(w, reg);
    const acted = w.eventQueue.some(
      (e) => e.kind === 'council.embargo' || e.kind === 'council.tariff' || e.kind === 'council.vote.opened',
    );
    expect(acted).toBe(true);
    w.rng = reg.snapshot();
  });

  it('handles a council vote response and removes the vote from the open list', () => {
    const w = makeWorld();
    // Force a vote by seeding state directly.
    w.council = {
      nextActionTick: 100_000,
      embargoes: [],
      tariffs: [],
      openVotes: [
        {
          id: 'vote-test',
          proposedTick: 0,
          resolveTick: 1000,
          title: 'censure',
          description: '',
          onPass: { kind: 'censure', target: asPlayerId('p.ai'), reputationDelta: -10 },
        },
      ],
    };
    const result = handleCouncilVoteRespond(w, {
      kind: 'councilVoteRespond',
      from: asPlayerId('p.human'),
      voteId: 'vote-test',
      accept: true,
    });
    expect(result.ok).toBe(true);
    expect(w.council?.openVotes).toHaveLength(0);
    expect(w.players.get(asPlayerId('p.ai'))?.federationStanding).toBeLessThan(-50);
  });

  it('processes a councilVoteRespond command end-to-end', () => {
    const w = makeWorld();
    w.council = {
      nextActionTick: 100_000,
      embargoes: [],
      tariffs: [],
      openVotes: [
        {
          id: 'vote-x',
          proposedTick: 0,
          resolveTick: 999,
          title: 'x',
          description: '',
          onPass: { kind: 'grant', recipient: asPlayerId('p.human'), credits: 5000 },
        },
      ],
    };
    applyCommand(w, {
      kind: 'councilVoteRespond',
      from: asPlayerId('p.human'),
      voteId: 'vote-x',
      accept: true,
    });
    expect(w.players.get(asPlayerId('p.human'))?.credits).toBe(5000);
  });
});
