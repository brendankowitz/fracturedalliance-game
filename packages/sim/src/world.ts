import {
  type Asteroid,
  type AsteroidId,
  asteroidId,
  type Building,
  type BuildingId,
  buildingId,
  type OreKind,
  type OreRecord,
  type Player,
  type PlayerId,
  playerId,
  type SizeClass,
  type World,
} from "@fa/domain";
import { PHASE1_ORES } from "@fa/content";
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

const NEUTRAL_NAMES: readonly string[] = [
  "Cygni Station",
  "Rigel Outpost",
  "Capella Base",
  "Aldebaran Point",
  "Arcturus Drift",
  "Procyon Field",
  "Sirius Reach",
  "Deneb Crossing",
  "Altair Depths",
  "Fomalhaut Ridge",
];

function rollSizeClass(rand: number): SizeClass {
  if (rand < 0.5) return "M";
  if (rand < 0.8) return "S";
  return "L";
}

function rollDeposits(size: SizeClass, prng: { next(): number }): Partial<OreRecord<number>> {
  const oreCount =
    size === "S"
      ? 1 + Math.round(prng.next())
      : size === "M"
        ? 2 + Math.round(prng.next())
        : 3 + Math.round(prng.next());

  const shuffled: OreKind[] = [...PHASE1_ORES];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(prng.next() * (i + 1));
    // biome-ignore lint/style/noNonNullAssertion -- bounds guaranteed by loop
    [shuffled[i], shuffled[j]] = [shuffled[i]!, shuffled[j]!];
  }
  const chosen = shuffled.slice(0, oreCount);

  const result: Partial<OreRecord<number>> = {};
  for (const ore of chosen) {
    let amount: number;
    if (size === "S") {
      amount = 500 + Math.round(prng.next() * 1500);
    } else if (size === "M") {
      amount = 1000 + Math.round(prng.next() * 4000);
    } else {
      amount = 2000 + Math.round(prng.next() * 8000);
    }
    result[ore] = amount;
  }
  return result;
}

function makeCpuBuilding(bid: BuildingId, aid: AsteroidId): Building {
  return {
    id: bid,
    defKind: "cpu",
    asteroidId: aid,
    cell: { x: 3, y: 3 },
    hp: 100,
    maxHp: 100,
    constructionProgress: 1,
    active: true,
    damage: 0,
  };
}

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
      crystalite: 200,
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

  // Procedural neutral asteroid belt
  const neutralCount = 6 + Math.floor(prng.next() * 5); // 6-10
  const asteroids: Map<AsteroidId, Asteroid> = new Map([[starterAsteroidId, starterAsteroid]]);
  const buildings: Map<BuildingId, Building> = new Map([
    [cpuBuildingId, makeCpuBuilding(cpuBuildingId, starterAsteroidId)],
  ]);

  const namePool = [...NEUTRAL_NAMES];

  for (let i = 0; i < neutralCount; i++) {
    const angle = (i * (2 * Math.PI)) / neutralCount + (prng.next() - 0.5) * 0.4;
    const radius = 8 + (prng.next() - 0.5) * 2;
    const sector = {
      x: Math.round(Math.cos(angle) * radius),
      y: Math.round(Math.sin(angle) * radius),
    };

    const sizeClass = rollSizeClass(prng.next());
    const deposits = rollDeposits(sizeClass, prng);

    const nameIndex = Math.floor(prng.next() * namePool.length);
    const name = namePool.splice(nameIndex, 1)[0] ?? `Belt ${i + 1}`;

    const aid = asteroidId(`asteroid-n${i}`);
    const neutralAsteroid: Asteroid = {
      id: aid,
      name,
      ownerId: null,
      sector,
      sizeClass,
      deposits,
      radiation: 0,
      stability: 100,
      happiness: 50,
      buildings: [],
      buildQueue: [],
      inOrbit: [],
      engines: {
        count: 0,
        destinationId: null,
        etaTick: null,
        chargeTick: null,
      },
    };
    asteroids.set(aid, neutralAsteroid);
  }

  // Kryll AI player — placed at the edge of the neutral belt, offset from center along the negative-y axis
  const kryllId: PlayerId = playerId("player-kryll");
  const kryllAsteroidId: AsteroidId = asteroidId("asteroid-kryll");
  const kryllCpuId: BuildingId = buildingId("building-cpu-kryll");

  const kryllSector = { x: 0, y: -10 };

  const kryllSizeClass = rollSizeClass(prng.next());
  const kryllDeposits = rollDeposits(kryllSizeClass, prng);

  const kryllAsteroid: Asteroid = {
    id: kryllAsteroidId,
    name: "Kryll Nexus",
    ownerId: kryllId,
    sector: kryllSector,
    sizeClass: kryllSizeClass,
    deposits: kryllDeposits,
    radiation: 0,
    stability: 100,
    happiness: 60,
    buildings: [kryllCpuId],
    buildQueue: [],
    inOrbit: [],
    engines: {
      count: 0,
      destinationId: null,
      etaTick: null,
      chargeTick: null,
    },
  };

  const kryllPlayer: Player = {
    id: kryllId,
    raceId: "kryllCollective",
    isHuman: false,
    credits: 8_000,
    reputation: new Map(),
    federationStanding: 30,
    blueprintsOwned: new Set(),
    eventLog: [],
    alive: true,
    suspicion: 0,
  };

  asteroids.set(kryllAsteroidId, kryllAsteroid);
  buildings.set(kryllCpuId, makeCpuBuilding(kryllCpuId, kryllAsteroidId));

  return {
    tick: 0,
    seed: config.seed,
    asteroids,
    buildings,
    ships: new Map(),
    players: new Map([
      [humanId, humanPlayer],
      [kryllId, kryllPlayer],
    ]),
    treaties: [],
    marketPrices: { ...BASE_MARKET_PRICES },
    eventQueue: [],
    prng,
    schemaVersion: 1,
    nextBuildingSeq: 0,
  };
}
