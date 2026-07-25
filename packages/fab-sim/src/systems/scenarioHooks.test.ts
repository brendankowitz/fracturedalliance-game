/**
 * Scenario scripted-trigger runner tests.
 */

import { asAsteroidId, asPlayerId, type ScriptedTrigger, type World } from '@fab/domain';
import { describe, expect, it } from 'vitest';
import { PrngRegistry } from '../rng/subGenerators';
import { CURRENT_SCHEMA_VERSION } from '../serializer/migrations';
import { scenarioTriggersPhase } from './scenarioHooks';

const makeWorld = (triggers: readonly ScriptedTrigger[]): World => {
  const reg = new PrngRegistry(1);
  const human = asPlayerId('p.human');
  const ai = asPlayerId('p.ai');
  return {
    tick: 0,
    seed: 1,
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
          credits: 1000,
          reputation: {},
          federationStanding: 0,
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
          federationStanding: 0,
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
    scenarioTriggers: triggers,
  };
};

describe('scenario scripted triggers', () => {
  it('fires creditGrant exactly once at the scheduled tick', () => {
    const w = makeWorld([{ kind: 'creditGrant', at: 5, recipient: asPlayerId('p.human'), credits: 500 }]);
    w.tick = 5;
    scenarioTriggersPhase(w);
    expect(w.players.get(asPlayerId('p.human'))?.credits).toBe(1500);
    // Re-run at the same tick — should not fire again.
    scenarioTriggersPhase(w);
    expect(w.players.get(asPlayerId('p.human'))?.credits).toBe(1500);
  });

  it('setRelation mutates reputation', () => {
    const w = makeWorld([
      { kind: 'setRelation', at: 10, from: asPlayerId('p.human'), to: asPlayerId('p.ai'), reputation: -50 },
    ]);
    w.tick = 10;
    scenarioTriggersPhase(w);
    expect(w.players.get(asPlayerId('p.human'))?.reputation['p.ai']).toBe(-50);
  });

  it('spawnFleet enqueues produceShip commands', () => {
    const w = makeWorld([
      {
        kind: 'spawnFleet',
        at: 1,
        owner: asPlayerId('p.human'),
        asteroid: asAsteroidId('ast-x'),
        ships: ['scout', 'assault'],
      },
    ]);
    w.tick = 1;
    scenarioTriggersPhase(w);
    expect(w.commandQueue).toHaveLength(2);
    expect(w.commandQueue[0]?.kind).toBe('produceShip');
  });
});
