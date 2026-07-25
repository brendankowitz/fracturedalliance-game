/**
 * Espionage system smoke + behaviour tests.
 *
 * Covers:
 *   • dispatchAgent → mission scheduled, hire cost deducted.
 *   • mission resolution: success vs failure rolls, capture probability.
 *   • sabotage damages a building.
 *   • suspicion accumulates and crosses the black-market threshold.
 */

import {
  AGENT_CATALOGUE,
  asAsteroidId,
  asBuildingId,
  asPlayerId,
  type EspionageMissionKind,
  type World,
} from '@fab/domain';
import { describe, expect, it } from 'vitest';
import { PrngRegistry } from '../rng/subGenerators';
import { CURRENT_SCHEMA_VERSION } from '../serializer/migrations';
import { applyCommand } from './commands';
import { espionagePhase } from './espionage';

const makeWorld = (): World => {
  const reg = new PrngRegistry(1);
  const employerId = asPlayerId('p.human');
  const targetId = asPlayerId('p.ai');
  const astId = asAsteroidId('ast-0');
  const bldId = asBuildingId('bldg-1');
  const world: World = {
    tick: 0,
    seed: 1,
    asteroids: new Map([
      [
        astId,
        {
          id: astId,
          name: 'Target',
          ownerId: targetId,
          sector: { x: 0, y: 0 },
          position: { x: 0, y: 0 },
          velocity: { x: 0, y: 0 },
          course: null,
          mass: 1,
          sizeClass: 'M',
          grid: { width: 7, height: 7 },
          deposits: {},
          radiation: 0,
          stability: 100,
          happiness: 50,
          population: 50,
          stocks: { food: 0, water: 0, air: 0, ores: {} },
          buildings: [bldId],
          buildQueue: [],
          inOrbit: [],
          engines: { count: 0, destination: null, etaTick: null, announcedToAll: false },
        },
      ],
    ]),
    buildings: new Map([
      [
        bldId,
        {
          id: bldId,
          defKind: 'bld.oxygen-generator',
          asteroidId: astId,
          cell: { x: 0, y: 0 },
          hp: 500,
          maxHp: 500,
          constructionProgress: 1,
          active: true,
          damage: 0,
        },
      ],
    ]),
    ships: new Map(),
    missiles: [],
    players: new Map([
      [
        employerId,
        {
          id: employerId,
          raceId: 'terrans',
          isHuman: true,
          credits: 100_000,
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
        targetId,
        {
          id: targetId,
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
    nextBuildingId: 2,
    nextShipId: 1,
    nextTreatyId: 1,
    nextMissileId: 1,
    federalTransporterNextTick: 0,
    outcome: null,
    tutorialState: null,
    commandTrace: [],
  };
  return world;
};

describe('espionage system', () => {
  it('dispatchAgent schedules a mission and deducts hire cost', () => {
    const world = makeWorld();
    const agent = AGENT_CATALOGUE[0];
    if (!agent) throw new Error('catalogue empty');
    const employer = world.players.get(asPlayerId('p.human'));
    if (!employer) throw new Error('employer missing');
    const startCredits = employer.credits;

    applyCommand(world, {
      kind: 'dispatchAgent',
      agentId: agent.id,
      targetPlayer: asPlayerId('p.ai'),
      mission: 'recon' satisfies EspionageMissionKind,
      targetAsteroid: asAsteroidId('ast-0'),
    });

    expect(world.espionage).toBeDefined();
    expect(world.espionage?.missions).toHaveLength(1);
    expect(employer.credits).toBe(startCredits - agent.hireCost);
    const dispatched = world.eventQueue.some((e) => e.kind === 'espionage.mission.dispatched');
    expect(dispatched).toBe(true);
  });

  it('rejects dispatch when employer lacks credits', () => {
    const world = makeWorld();
    const employer = world.players.get(asPlayerId('p.human'));
    if (!employer) throw new Error();
    employer.credits = 0;
    const agent = AGENT_CATALOGUE[0];
    if (!agent) throw new Error();

    applyCommand(world, {
      kind: 'dispatchAgent',
      agentId: agent.id,
      targetPlayer: asPlayerId('p.ai'),
      mission: 'recon',
    });
    expect(world.espionage?.missions ?? []).toHaveLength(0);
    expect(world.eventQueue.some((e) => e.kind === 'command.rejected')).toBe(true);
  });

  it('resolveMission damages a building on successful sabotage', () => {
    const world = makeWorld();
    const agent = AGENT_CATALOGUE[0]; // skill 90 — high success rate
    if (!agent) throw new Error();
    applyCommand(world, {
      kind: 'dispatchAgent',
      agentId: agent.id,
      targetPlayer: asPlayerId('p.ai'),
      mission: 'sabotageLifeSupport',
      targetAsteroid: asAsteroidId('ast-0'),
    });
    // Fast-forward to mission resolution.
    const reg = PrngRegistry.restore(world.rng);
    const mission = world.espionage?.missions[0];
    if (!mission) throw new Error('mission missing');
    world.tick = mission.resolveTick;
    espionagePhase(world, reg);
    world.rng = reg.snapshot();

    const bld = world.buildings.get(asBuildingId('bldg-1'));
    if (!bld) throw new Error('building missing');
    // Either the mission succeeded (building damaged) or failed (counter-intel rose);
    // in this seeded case skill=90 vs Security=0 → roll<=90 is overwhelmingly likely.
    const succeeded = world.eventQueue.some(
      (e) => e.kind === 'espionage.mission.resolved' && e.success === true,
    );
    expect(succeeded).toBe(true);
    expect(bld.hp).toBeLessThan(500);
  });

  it('crosses the black-market suspicion threshold after repeated dispatches', () => {
    const world = makeWorld();
    const employer = world.players.get(asPlayerId('p.human'));
    if (!employer) throw new Error();
    // Dispatch & resolve many missions; suspicion adds 4..8 per resolution.
    for (let i = 0; i < 20; i++) {
      // On the first iteration espionage state may be uninitialised — fall through
      // to AGENT_CATALOGUE[0]. After ensureState runs, subsequent picks consult
      // the live agent pool to skip captured/in-flight agents.
      let agent: (typeof AGENT_CATALOGUE)[number] | undefined = AGENT_CATALOGUE[0];
      if (world.espionage) {
        agent = AGENT_CATALOGUE.find((a) => {
          const live = world.espionage?.agents.find((x) => x.id === a.id);
          return live ? live.employer === null && !live.captured : false;
        });
      }
      if (!agent) break;
      applyCommand(world, {
        kind: 'dispatchAgent',
        agentId: agent.id,
        targetPlayer: asPlayerId('p.ai'),
        mission: 'intelGather',
        targetAsteroid: asAsteroidId('ast-0'),
      });
      const reg = PrngRegistry.restore(world.rng);
      const mission = world.espionage?.missions[world.espionage.missions.length - 1];
      if (!mission) break;
      world.tick = mission.resolveTick;
      espionagePhase(world, reg);
      world.rng = reg.snapshot();
      employer.credits = 100_000; // refill so we can keep dispatching
    }
    expect(employer.suspicion).toBeGreaterThan(0);
    // We expect the threshold to have been crossed at some point.
    const unlocked = world.eventQueue.some((e) => e.kind === 'blackMarket.unlocked');
    expect(unlocked).toBe(true);
  });
});
