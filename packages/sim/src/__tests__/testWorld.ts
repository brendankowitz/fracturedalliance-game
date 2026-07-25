import type {
  Agent,
  AgentId,
  Asteroid,
  AsteroidId,
  Building,
  BuildingId,
  Player,
  PlayerId,
  World,
} from "@fa/domain";
import { makePrng } from "../prng.ts";
import { BASE_PRICES } from "../systems/economySystem.ts";

export function makeTestAsteroid(id: AsteroidId, overrides: Partial<Asteroid> = {}): Asteroid {
  return {
    id,
    name: `Asteroid ${id}`,
    ownerId: null,
    sector: { x: 0, y: 0 },
    sizeClass: "M",
    deposits: {},
    radiation: 0,
    stability: 100,
    happiness: 75,
    buildings: [],
    buildQueue: [],
    inOrbit: [],
    engines: { count: 0, destinationId: null, etaTick: null, chargeTick: null },
    ...overrides,
  };
}

export function makeTestPlayer(id: PlayerId, overrides: Partial<Player> = {}): Player {
  return {
    id,
    raceId: "helionCorp",
    isHuman: true,
    credits: 10_000,
    oreInventory: {},
    reputation: new Map(),
    federationStanding: 50,
    blueprintsOwned: new Set(),
    eventLog: [],
    alive: true,
    suspicion: 0,
    licenseRevoked: false,
    ...overrides,
  };
}

export function makeTestBuilding(
  id: BuildingId,
  asteroidId: AsteroidId,
  overrides: Partial<Building> = {},
): Building {
  return {
    id,
    defKind: "cpu",
    asteroidId,
    cell: { x: 3, y: 3 },
    hp: 100,
    maxHp: 100,
    constructionProgress: 1,
    active: true,
    damage: 0,
    ...overrides,
  };
}

export function makeTestAgent(id: AgentId, overrides: Partial<Agent> = {}): Agent {
  return {
    id,
    name: "Test Agent",
    ownerId: null,
    stealth: 80,
    hireCost: 1000,
    missionKind: null,
    missionTarget: null,
    missionCompleteTick: null,
    tributeActive: false,
    tributeEndTick: null,
    ...overrides,
  };
}

export function makeTestWorld(overrides: Partial<World> = {}): World {
  return {
    tick: 0,
    seed: 1,
    difficulty: "manager",
    asteroids: new Map(),
    buildings: new Map(),
    ships: new Map(),
    players: new Map(),
    treaties: [],
    marketPrices: { ...BASE_PRICES },
    eventQueue: [],
    prng: makePrng(1),
    schemaVersion: 1,
    nextBuildingSeq: 0,
    nextShipSeq: 0,
    nextTreatySeq: 0,
    nextMissileSeq: 1,
    missiles: [],
    gameEndState: null,
    agents: new Map(),
    expeditionFleet: { active: false, ticksRemaining: 0, fleetsLaunched: 0 },
    ...overrides,
  };
}
