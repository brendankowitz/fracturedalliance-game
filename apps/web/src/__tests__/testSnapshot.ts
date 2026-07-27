import { asteroidId } from "@fa/domain";
import type { AsteroidSnapshot, HudSnapshot } from "@fa/sim";

export function makeTestSnapshot(overrides: Partial<HudSnapshot> = {}): HudSnapshot {
  return {
    tick: 0,
    day: 0,
    date: "25-05-2496",
    seed: 1,
    difficulty: "manager",
    credits: 0,
    federationStanding: 0,
    suspicion: 0,
    humanPlayerId: "human",
    traderActive: false,
    oreInventory: {},
    players: [],
    asteroids: [],
    ships: [],
    events: [],
    marketPrices: {},
    combatFlashes: [],
    diplomacy: [],
    gameEndState: null,
    blueprintsOwned: [],
    agents: [],
    ...overrides,
  };
}

export function makeTestAsteroid(overrides: Partial<AsteroidSnapshot> = {}): AsteroidSnapshot {
  return {
    id: asteroidId("a1"),
    name: "Vega Prime",
    ownerId: null,
    sector: { x: 0, y: 0 },
    sizeClass: "medium",
    deposits: {},
    radiation: 0,
    stability: 1,
    happiness: 1,
    buildingKinds: [],
    buildingsGrid: [],
    buildQueue: [],
    powerBalance: 0,
    engines: { count: 0, destinationId: null, etaTick: null, chargeTick: null },
    incomingMissile: null,
    ...overrides,
  };
}
