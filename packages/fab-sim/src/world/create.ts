/**
 * Scenario-driven world construction.
 *
 * Given a `ScenarioDef` (from `CONTENT.scenarios`) we:
 *   1. Seed a `PrngRegistry` from `opts.seed`.
 *   2. Construct the human player plus one AI per `aiRaces[]` entry.
 *   3. Generate `scenario.asteroidCount` asteroids in a deterministic
 *      sector grid. Ore composition is rolled via the `worldGen`
 *      sub-generator, respecting `ORE_RARITY` so common ores appear on
 *      many rocks and legendary ores on few.
 *   4. Assign the first asteroid to the player, install a free CPU Core,
 *      and seed the player's starting resources into that colony.
 *   5. Capture initial market prices from `ORES[kind].baseValue` so every
 *      match begins neutral regardless of the drift state.
 *
 * No wall-clock time is consulted after `createdAtIso` is stamped.
 */

import { BUILDINGS, ORES } from '@fab/content';
import type {
  Asteroid,
  BuildingId,
  Difficulty,
  MarketPrices,
  PlayerId,
  ScenarioDef,
  World,
} from '@fab/domain';
import {
  asAsteroidId,
  asBuildingId,
  asPlayerId,
  DEFAULT_DIFFICULTY,
  DIFFICULTY_MODIFIERS,
  ORE_KINDS,
  type OreKind,
} from '@fab/domain';
import { PrngRegistry } from '../rng/subGenerators';
import { CURRENT_SCHEMA_VERSION } from '../serializer/migrations';
import { FED_TRANSPORTER_INTERVAL_TICKS } from '../time';

export interface CreateWorldOpts {
  seed: number;
  scenarioId: string;
  scenario?: ScenarioDef;
  createdAtIso?: string;
  /** Stream E3 — difficulty tier; defaults to 'normal' when omitted. */
  difficulty?: Difficulty;
}

const SIZE_BY_INDEX: readonly ('S' | 'M' | 'L' | 'XL')[] = ['M', 'M', 'L', 'S', 'M', 'L', 'S', 'XL'];
const GRID: Record<'S' | 'M' | 'L' | 'XL', number> = { S: 5, M: 7, L: 9, XL: 11 };

const emptyOreStock = (): Partial<Record<OreKind, number>> => ({});

const pickInitialPrices = (): MarketPrices => {
  const current = {} as Record<OreKind, number>;
  for (const k of ORE_KINDS) current[k] = ORES[k].baseValue;
  return { current, phase: 0 };
};

const rollDeposits = (
  reg: PrngRegistry,
  sizeClass: 'S' | 'M' | 'L' | 'XL',
): Partial<Record<OreKind, number>> => {
  const gen = reg.get('worldGen');
  const deposits: Partial<Record<OreKind, number>> = {};
  const tierCap = sizeClass === 'XL' ? 5 : sizeClass === 'L' ? 4 : sizeClass === 'M' ? 3 : 2;
  for (const kind of ORE_KINDS) {
    const def = ORES[kind];
    if (def.rarityTier > tierCap) continue;
    // Probability of presence decays with rarity.
    const present = gen.next() < 0.9 / def.rarityTier;
    if (!present) continue;
    // Tonnage skewed so common ores have more.
    const base = 500 / def.rarityTier;
    const tonnes = Math.round(base + gen.next() * base * 2);
    if (tonnes > 0) deposits[kind] = tonnes;
  }
  if (Object.keys(deposits).length === 0) deposits.selenium = 300;
  return deposits;
};

const mintBuildingId = (world: Pick<World, 'nextBuildingId'> & { nextBuildingId: number }): BuildingId => {
  const id = asBuildingId(`bldg-${world.nextBuildingId}`);
  world.nextBuildingId += 1;
  return id;
};

const installBuilding = (
  world: World,
  asteroid: Asteroid,
  defKind: keyof typeof BUILDINGS,
  cell: { x: number; y: number },
): void => {
  const def = BUILDINGS[defKind];
  if (!def) return;
  const id = mintBuildingId(world);
  const maxHp = 100 + Math.round(def.costCredits / 50);
  world.buildings.set(id, {
    id,
    defKind: def.kind,
    asteroidId: asteroid.id,
    cell: { x: cell.x, y: cell.y },
    hp: maxHp,
    maxHp,
    constructionProgress: 1,
    active: true,
    damage: 0,
  });
  asteroid.buildings.push(id);
};

/**
 * Stream E2 — seed life-support buildings on every starting colony so
 * pop=50 doesn't suffocate at t=2400 before the AI has had time to build
 * anything. Without this, the federation-war 10k-tick sanity report
 * showed 7× `colony.starved` events. Layout reserves the centre cell
 * for the CPU core (already installed) and uses the four orthogonal
 * neighbours for life-support. We deliberately install solar-array
 * (gated by the solarMatrix blueprint) as the "free" power source so
 * AIs without research can still keep the lights on.
 */
const installLifeSupport = (world: World, asteroid: Asteroid): void => {
  const cx = Math.floor(asteroid.grid.width / 2);
  const cy = Math.floor(asteroid.grid.height / 2);
  const layout: Array<[keyof typeof BUILDINGS, { x: number; y: number }]> = [
    ['bld.oxygen-generator', { x: cx - 1, y: cy }],
    ['bld.water-recycler', { x: cx + 1, y: cy }],
    ['bld.hydroponics-farm', { x: cx, y: cy - 1 }],
    ['bld.solar-array', { x: cx, y: cy + 1 }],
  ];
  for (const [kind, cell] of layout) {
    if (cell.x < 0 || cell.y < 0) continue;
    if (cell.x >= asteroid.grid.width || cell.y >= asteroid.grid.height) continue;
    installBuilding(world, asteroid, kind, cell);
  }
};

const installCpu = (world: World, asteroid: Asteroid): void => {
  const def = BUILDINGS['bld.cpu-core'];
  const id = mintBuildingId(world);
  world.buildings.set(id, {
    id,
    defKind: def.kind,
    asteroidId: asteroid.id,
    cell: { x: Math.floor(asteroid.grid.width / 2), y: Math.floor(asteroid.grid.height / 2) },
    hp: 500,
    maxHp: 500,
    constructionProgress: 1,
    active: true,
    damage: 0,
  });
  asteroid.buildings.push(id);
};

const MASS_BY_CLASS: Record<'S' | 'M' | 'L' | 'XL', number> = { S: 1, M: 2, L: 4, XL: 8 };

const buildAsteroid = (reg: PrngRegistry, index: number): Asteroid => {
  const sizeClass = SIZE_BY_INDEX[index % SIZE_BY_INDEX.length] ?? 'M';
  const g = GRID[sizeClass];
  const sx = (index % 5) * 100;
  const sy = Math.floor(index / 5) * 100;
  return {
    id: asAsteroidId(`ast-${index}`),
    name: `Rock-${index}`,
    ownerId: null,
    sector: { x: sx, y: sy },
    position: { x: sx, y: sy },
    velocity: { x: 0, y: 0 },
    course: null,
    mass: MASS_BY_CLASS[sizeClass],
    sizeClass,
    grid: { width: g, height: g },
    deposits: rollDeposits(reg, sizeClass),
    radiation: 0,
    stability: 100,
    happiness: 60,
    population: 0,
    stocks: { food: 0, water: 0, air: 0, ores: emptyOreStock() },
    buildings: [],
    buildQueue: [],
    inOrbit: [],
    engines: { count: 0, destination: null, etaTick: null, announcedToAll: false },
  };
};

/** Create a blank World — no scenario wiring. Used by serializer tests. */
export const createWorld = (opts: CreateWorldOpts): World => {
  const reg = new PrngRegistry(opts.seed);
  reg.get('worldGen');
  const world: World = {
    tick: 0,
    seed: opts.seed,
    asteroids: new Map(),
    buildings: new Map(),
    ships: new Map(),
    missiles: [],
    players: new Map(),
    treaties: [],
    market: pickInitialPrices(),
    eventQueue: [],
    scheduledEvents: [],
    commandQueue: [],
    rng: reg.snapshot(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAtIso: opts.createdAtIso ?? new Date(0).toISOString(),
    scenarioId: opts.scenarioId,
    difficulty: opts.difficulty ?? DEFAULT_DIFFICULTY,
    nextBuildingId: 1,
    nextShipId: 1,
    nextTreatyId: 1,
    nextMissileId: 1,
    federalTransporterNextTick: FED_TRANSPORTER_INTERVAL_TICKS,
    outcome: null,
    tutorialState: null,
    commandTrace: [],
  };
  if (opts.scenario) populateFromScenario(world, opts.scenario, reg);
  // Stream B (B5) — copy scripted triggers onto the world for the runner.
  if (opts.scenario?.triggers && opts.scenario.triggers.length > 0) {
    world.scenarioTriggers = opts.scenario.triggers;
    world.scenarioTriggersFired = [];
  }
  // Enable the tutorial runner when the scenario is flagged tutorial/primer,
  // or — for back-compat — when the scenario declares at least one objective.
  if (opts.scenario) {
    const scn = opts.scenario;
    const activatesTutorial = scn.kind === 'tutorial' || scn.kind === 'primer' || scn.objectives.length > 0;
    if (activatesTutorial) {
      world.tutorialState = {
        activeObjectiveId: scn.objectives[0]?.id ?? null,
        completed: [],
        hintsShown: [],
      };
    }
  }
  world.rng = reg.snapshot();
  return world;
};

/** Populate a world in place from a ScenarioDef. */
export const populateFromScenario = (world: World, scenario: ScenarioDef, reg: PrngRegistry): void => {
  // Stream E3 — apply the difficulty multiplier to scenario starting
  // credits at population time. Resource stocks (food/water/air) are
  // intentionally left untouched: the v0.2 balance pass relies on the
  // 500-stock buffer for survivability and we don't want hard mode to
  // re-introduce starvation.
  const mod = DIFFICULTY_MODIFIERS[world.difficulty ?? DEFAULT_DIFFICULTY];
  const startingCredits = Math.round(scenario.startingResources.credits * mod.startingResources);
  // Players.
  const humanId = asPlayerId('p.human');
  world.players.set(humanId, {
    id: humanId,
    raceId: 'terrans',
    isHuman: true,
    credits: startingCredits,
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
  scenario.aiRaces.forEach((raceId, i) => {
    const id = asPlayerId(`p.ai.${i + 1}.${raceId}`);
    world.players.set(id, {
      id,
      raceId,
      isHuman: false,
      credits: startingCredits,
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
  });

  // Asteroids.
  const asteroids: Asteroid[] = [];
  for (let i = 0; i < scenario.asteroidCount; i++) {
    const a = buildAsteroid(reg, i);
    world.asteroids.set(a.id, a);
    asteroids.push(a);
  }

  // Seed the human starting colony.
  const playerIds: PlayerId[] = Array.from(world.players.keys());
  asteroids.forEach((a, i) => {
    const owner = playerIds[i];
    if (!owner) return;
    a.ownerId = owner;
    a.population = 50;
    a.stocks.food = scenario.startingResources.food;
    a.stocks.water = scenario.startingResources.water;
    a.stocks.air = scenario.startingResources.air;
    installCpu(world, a);
    installLifeSupport(world, a);
  });
};
