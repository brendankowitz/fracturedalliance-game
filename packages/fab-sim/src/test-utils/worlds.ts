/**
 * Test helpers — tiny factories for building self-contained worlds the
 * system unit-tests can manipulate without touching scenario content.
 * Using `createWorld` with `opts.scenario` omitted gives us a blank
 * world we can mutate to the precise shape each test needs.
 */

import { BUILDINGS } from '@fab/content';
import type { AsteroidId, Building, BuildingId, PlayerId, World } from '@fab/domain';
import { asAsteroidId, asBuildingId, asPlayerId } from '@fab/domain';
import { createWorld } from '../world/create';

export interface MiniWorldOpts {
  seed?: number;
  credits?: number;
  population?: number;
  food?: number;
  water?: number;
  air?: number;
  happiness?: number;
}

export interface MiniWorld {
  world: World;
  playerId: PlayerId;
  asteroidId: AsteroidId;
}

/**
 * Build a minimal world: one player, one medium asteroid, no buildings.
 * All state is deterministic and seeded.
 */
export const makeMiniWorld = (opts: MiniWorldOpts = {}): MiniWorld => {
  const world = createWorld({ seed: opts.seed ?? 1, scenarioId: 'test' });
  const playerId = asPlayerId('p.test');
  world.players.set(playerId, {
    id: playerId,
    raceId: 'terrans',
    isHuman: true,
    credits: opts.credits ?? 100_000,
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
  });
  const asteroidId = asAsteroidId('ast.test');
  world.asteroids.set(asteroidId, {
    id: asteroidId,
    name: 'Test Rock',
    ownerId: playerId,
    sector: { x: 0, y: 0 },
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    course: null,
    mass: 2,
    sizeClass: 'M',
    grid: { width: 7, height: 7 },
    deposits: { selenium: 1_000, asteros: 500 },
    radiation: 0,
    stability: 100,
    happiness: opts.happiness ?? 60,
    population: opts.population ?? 50,
    stocks: {
      food: opts.food ?? 100,
      water: opts.water ?? 100,
      air: opts.air ?? 100,
      ores: {},
    },
    buildings: [],
    buildQueue: [],
    inOrbit: [],
    engines: { count: 0, destination: null, etaTick: null, announcedToAll: false },
  });
  return { world, playerId, asteroidId };
};

/** Install a fully-built building on the given asteroid. Returns its id. */
export const installBuilding = (
  world: World,
  asteroidId: AsteroidId,
  kind: keyof typeof BUILDINGS,
): BuildingId => {
  const def = BUILDINGS[kind];
  const id = asBuildingId(`bldg-test-${world.nextBuildingId}`);
  world.nextBuildingId += 1;
  const building: Building = {
    id,
    defKind: def.kind,
    asteroidId,
    cell: { x: 0, y: 0 },
    hp: 500,
    maxHp: 500,
    constructionProgress: 1,
    active: true,
    damage: 0,
  };
  world.buildings.set(id, building);
  const a = world.asteroids.get(asteroidId);
  if (a) a.buildings.push(id);
  return id;
};
