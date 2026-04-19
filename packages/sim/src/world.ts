import {
  type Asteroid,
  type AsteroidId,
  asteroidId,
  type Building,
  type BuildingId,
  buildingId,
  type OreRecord,
  type Player,
  type PlayerId,
  playerId,
  type World,
} from "@fa/domain";
import { makePrng } from "./prng.ts";

export interface WorldConfig {
  seed: number;
  humanPlayerRaceId: string;
}

const BASE_MARKET_PRICES: OreRecord<number> = {
  selenium: 100,
  asteros: 150,
  barium: 220,
  crystalite: 300,
  quazinc: 380,
  bytanium: 500,
  korellium: 650,
  dragonium: 820,
  traxium: 1100,
  nexos: 1500,
};

export function createWorld(config: WorldConfig): World {
  const prng = makePrng(config.seed);

  const humanId: PlayerId = playerId("player-human");
  const starterAsteroidId: AsteroidId = asteroidId("asteroid-0");
  const cpuBuildingId: BuildingId = buildingId("building-cpu-0");

  const starterAsteroid: Asteroid = {
    id: starterAsteroidId,
    name: "Vega Prime",
    ownerId: humanId,
    sector: { x: 0, y: 0 },
    sizeClass: "M",
    deposits: {
      selenium: 5000,
      asteros: 2000,
      barium: 800,
    },
    radiation: 0,
    stability: 100,
    happiness: 75,
    buildings: [cpuBuildingId],
    buildQueue: [],
    inOrbit: [],
    engines: {
      count: 0,
      destinationId: null,
      etaTick: null,
      chargeTick: null,
    },
  };

  const cpuBuilding: Building = {
    id: cpuBuildingId,
    defKind: "cpu",
    asteroidId: starterAsteroidId,
    cell: { x: 3, y: 3 },
    hp: 100,
    maxHp: 100,
    constructionProgress: 1,
    active: true,
    damage: 0,
  };

  const humanPlayer: Player = {
    id: humanId,
    raceId: config.humanPlayerRaceId,
    isHuman: true,
    credits: 10_000,
    reputation: new Map(),
    federationStanding: 50,
    blueprintsOwned: new Set(),
    eventLog: [],
    alive: true,
    suspicion: 0,
  };

  // TODO(phase-1): Replace this advance with procedural belt generation calls.
  // Remove this line and use PRNG results directly — do not add new calls after
  // this one, as that would shift the sequence for existing saves.
  void prng.next();

  return {
    tick: 0,
    seed: config.seed,
    asteroids: new Map([[starterAsteroidId, starterAsteroid]]),
    buildings: new Map([[cpuBuildingId, cpuBuilding]]),
    ships: new Map(),
    players: new Map([[humanId, humanPlayer]]),
    treaties: [],
    marketPrices: { ...BASE_MARKET_PRICES },
    eventQueue: [],
    prng,
    schemaVersion: 1,
    nextBuildingSeq: 0,
  };
}
