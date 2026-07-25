/**
 * Detection system tests.
 *
 * Covers:
 *   • own asteroids always visible.
 *   • radar tower extends visibility within range.
 *   • spy satellite reveals its orbiting asteroid.
 */

import { asAsteroidId, asBuildingId, asPlayerId, asShipId, RADAR_RANGE_GRID, type World } from '@fab/domain';
import { describe, expect, it } from 'vitest';
import { PrngRegistry } from '../rng/subGenerators';
import { CURRENT_SCHEMA_VERSION } from '../serializer/migrations';
import { detectionPhase } from './detection';

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

const makeWorld = (): World => {
  const reg = new PrngRegistry(1);
  const me = asPlayerId('p.human');
  const them = asPlayerId('p.ai');
  const a1 = baseAsteroid('ast-1', 'p.human', 0, 0);
  const a2 = baseAsteroid('ast-2', 'p.ai', 5, 5); // within radar range
  const a3 = baseAsteroid('ast-3', 'p.ai', 100, 100); // out of range
  const w: World = {
    tick: 0,
    seed: 1,
    asteroids: new Map([
      [a1.id, a1],
      [a2.id, a2],
      [a3.id, a3],
    ]),
    buildings: new Map(),
    ships: new Map(),
    missiles: [],
    players: new Map([
      [
        me,
        {
          id: me,
          raceId: 'terrans',
          isHuman: true,
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
      [
        them,
        {
          id: them,
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
  };
  return w;
};

describe('detection system', () => {
  it('reveals only owned asteroids by default', () => {
    const w = makeWorld();
    detectionPhase(w);
    const visible = w.detection?.visible[asPlayerId('p.human')] ?? [];
    expect(visible).toEqual([asAsteroidId('ast-1')]);
  });

  it('radar tower reveals enemy asteroids within range', () => {
    const w = makeWorld();
    const radarId = asBuildingId('bldg-radar');
    w.buildings.set(radarId, {
      id: radarId,
      defKind: 'bld.radar-tower',
      asteroidId: asAsteroidId('ast-1'),
      cell: { x: 0, y: 0 },
      hp: 100,
      maxHp: 100,
      constructionProgress: 1,
      active: true,
      damage: 0,
    });
    w.asteroids.get(asAsteroidId('ast-1'))?.buildings.push(radarId);
    detectionPhase(w);
    const visible = w.detection?.visible[asPlayerId('p.human')] ?? [];
    expect(visible).toContain(asAsteroidId('ast-2'));
    expect(visible).not.toContain(asAsteroidId('ast-3'));
    expect(RADAR_RANGE_GRID).toBeGreaterThan(0);
  });

  it('spy satellite reveals its orbited asteroid', () => {
    const w = makeWorld();
    w.satellites = [
      {
        id: asShipId('sat-1'),
        ownerId: asPlayerId('p.human'),
        orbiting: asAsteroidId('ast-3'),
        kind: 'spy',
        launchedTick: 0,
        hp: 60,
        range: 14,
      },
    ];
    detectionPhase(w);
    const visible = w.detection?.visible[asPlayerId('p.human')] ?? [];
    expect(visible).toContain(asAsteroidId('ast-3'));
  });
});
