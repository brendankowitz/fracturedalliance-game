/**
 * Satellites + ODP intercept tests.
 */

import {
  asAsteroidId,
  asBuildingId,
  asPlayerId,
  type Missile,
  ODP_INTERCEPT_PROBABILITY,
  type World,
} from '@fab/domain';
import { describe, expect, it } from 'vitest';
import { PrngRegistry } from '../rng/subGenerators';
import { CURRENT_SCHEMA_VERSION } from '../serializer/migrations';
import { applyCommand } from './commands';
import { handleLaunchSatellite, satellitesPhase } from './satellites';

const baseAsteroid = (id: string, owner: string | null, x: number, y: number) => ({
  id: asAsteroidId(id),
  name: id,
  ownerId: owner ? asPlayerId(owner) : null,
  sector: { x, y },
  position: { x, y },
  velocity: { x: 0, y: 0 },
  course: null,
  mass: 1,
  sizeClass: 'M' as const,
  grid: { width: 7, height: 7 },
  deposits: {},
  radiation: 0,
  stability: 100,
  happiness: 50,
  population: 0,
  stocks: { food: 0, water: 0, air: 0, ores: {} },
  buildings: [] as ReturnType<typeof asBuildingId>[],
  buildQueue: [],
  inOrbit: [],
  engines: { count: 0, destination: null, etaTick: null, announcedToAll: false },
});

const makeWorld = (seed = 1): World => {
  const reg = new PrngRegistry(seed);
  const me = asPlayerId('p.human');
  const enemy = asPlayerId('p.ai');
  const myAst = baseAsteroid('ast-1', 'p.human', 0, 0);
  const enemyAst = baseAsteroid('ast-2', 'p.ai', 5, 0);
  // Install a satellite silo on the source asteroid.
  const siloId = asBuildingId('bldg-silo');
  myAst.buildings.push(siloId);
  return {
    tick: 0,
    seed,
    asteroids: new Map([
      [myAst.id, myAst],
      [enemyAst.id, enemyAst],
    ]),
    buildings: new Map([
      [
        siloId,
        {
          id: siloId,
          defKind: 'bld.satellite-silo',
          asteroidId: myAst.id,
          cell: { x: 0, y: 0 },
          hp: 1000,
          maxHp: 1000,
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
        me,
        {
          id: me,
          raceId: 'terrans',
          isHuman: true,
          credits: 50_000,
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
        enemy,
        {
          id: enemy,
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
};

describe('satellites & ODP', () => {
  it('launchSatellite mints a satellite and deducts credits', () => {
    const w = makeWorld();
    const startCredits = w.players.get(asPlayerId('p.human'))?.credits ?? 0;
    const r = handleLaunchSatellite(w, {
      kind: 'launchSatellite',
      from: asPlayerId('p.human'),
      fromAsteroid: asAsteroidId('ast-1'),
      target: asAsteroidId('ast-2'),
      satellite: 'spy',
    });
    expect(r.ok).toBe(true);
    expect(w.satellites).toHaveLength(1);
    expect(w.players.get(asPlayerId('p.human'))?.credits).toBeLessThan(startCredits);
    expect(w.eventQueue.some((e) => e.kind === 'satellite.launched')).toBe(true);
  });

  it('rejects launch when source asteroid lacks a silo', () => {
    const w = makeWorld();
    // Strip the silo.
    const a1 = w.asteroids.get(asAsteroidId('ast-1'));
    if (a1) a1.buildings = [];
    const r = handleLaunchSatellite(w, {
      kind: 'launchSatellite',
      from: asPlayerId('p.human'),
      fromAsteroid: asAsteroidId('ast-1'),
      target: asAsteroidId('ast-2'),
      satellite: 'spy',
    });
    expect(r.ok).toBe(false);
  });

  it('ODP intercepts at least some incoming missiles over many trials', () => {
    const w = makeWorld();
    // Install an ODP on the defender.
    const odpId = asBuildingId('bldg-odp');
    w.buildings.set(odpId, {
      id: odpId,
      defKind: 'bld.orbital-defence-platform',
      asteroidId: asAsteroidId('ast-2'),
      cell: { x: 0, y: 0 },
      hp: 1000,
      maxHp: 1000,
      constructionProgress: 1,
      active: true,
      damage: 0,
    });
    w.asteroids.get(asAsteroidId('ast-2'))?.buildings.push(odpId);

    // Fire 100 incoming missiles aimed at ast-2 from p.human.
    const reg = PrngRegistry.restore(w.rng);
    const missiles: Missile[] = [];
    for (let i = 0; i < 100; i++) {
      missiles.push({
        id: `m-${i}` as Missile['id'],
        ownerId: asPlayerId('p2'),
        kind: 'basic',
        targetAsteroid: asAsteroidId('ast-2'),
        targetShip: null,
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        damage: 10,
        remainingTicks: 100,
      });
    }
    w.missiles = missiles;
    satellitesPhase(w, reg);
    const intercepted = 100 - w.missiles.length;
    // Empirical: with p≈0.35 over 100 trials we expect ~35; require at least 10.
    expect(intercepted).toBeGreaterThan(10);
    expect(w.eventQueue.filter((e) => e.kind === 'odp.intercepted').length).toBe(intercepted);
    expect(ODP_INTERCEPT_PROBABILITY).toBeGreaterThan(0);
  });

  it('processes a launchSatellite command via applyCommand', () => {
    const w = makeWorld();
    applyCommand(w, {
      kind: 'launchSatellite',
      from: asPlayerId('p.human'),
      fromAsteroid: asAsteroidId('ast-1'),
      target: asAsteroidId('ast-2'),
      satellite: 'comms',
    });
    expect(w.satellites).toHaveLength(1);
    expect(w.satellites?.[0]?.kind).toBe('comms');
  });
});
