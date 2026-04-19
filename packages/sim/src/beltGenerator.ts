import { getAllRaceDefs } from "@fa/content";
import {
  type Asteroid,
  type AsteroidId,
  asteroidId,
  type OreKind,
  type Player,
  type PlayerId,
  playerId,
  type SizeClass,
} from "@fa/domain";
import type { Prng } from "@fa/domain";
import { makePrng } from "./prng.ts";

export interface GeneratedBelt {
  asteroids: Asteroid[];
  players: Player[];
}

const ASTEROID_NAMES: readonly string[] = [
  "Vesta",
  "Ceres",
  "Pallas",
  "Juno",
  "Hygeia",
  "Eunomia",
  "Davida",
  "Interamnia",
  "Europa",
  "Sylvia",
  "Cybele",
  "Herculina",
  "Alauda",
  "Doris",
  "Ursula",
  "Camilla",
  "Eugenia",
  "Iris",
  "Hebe",
  "Flora",
  "Metis",
  "Themis",
  "Fortuna",
  "Bamberga",
  "Amphitrite",
  "Nemausa",
  "Niobe",
  "Egeria",
  "Ausonia",
  "Massalia",
];

const BELT_ORES: readonly OreKind[] = [
  "selenium",
  "asteros",
  "barium",
  "crystalite",
  "quazinc",
  "bytanium",
];

const ASTEROID_COUNT = 20;
const GRID_SIZE = 7;
const HUMAN_PLAYER_ID = playerId("player-human");

function rollSizeClass(rand: number): SizeClass {
  if (rand < 0.4) return "S";
  if (rand < 0.8) return "M";
  return "L";
}

function round2dp(n: number): number {
  return Math.round(n * 100) / 100;
}

function fisherYates<T>(arr: T[], prng: Prng): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(prng.next() * (i + 1));
    // biome-ignore lint/style/noNonNullAssertion -- bounds guaranteed by loop
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

function generateDeposits(prng: Prng): Partial<Record<OreKind, number>> {
  const deposits: Partial<Record<OreKind, number>> = {};
  for (const ore of BELT_ORES) {
    if (prng.next() > 0.4) {
      deposits[ore] = Math.round(prng.next() * 800 + 100);
    }
  }
  return deposits;
}

function generateSectors(prng: Prng): Array<{ x: number; y: number }> {
  const all: Array<{ x: number; y: number }> = [];
  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      all.push({ x, y });
    }
  }
  return fisherYates(all, prng).slice(0, ASTEROID_COUNT);
}

function generateAsteroids(prng: Prng): Asteroid[] {
  const names = fisherYates([...ASTEROID_NAMES], prng).slice(0, ASTEROID_COUNT);
  const sectors = generateSectors(prng);

  return names.map((name, index) => {
    const sizeClass = rollSizeClass(prng.next());
    const radiation = round2dp(prng.next() * 0.6);
    const stability = round2dp(0.4 + prng.next() * 0.6);
    const happiness = round2dp(0.5 + prng.next() * 0.5);
    const deposits = generateDeposits(prng);

    const id: AsteroidId = asteroidId(`a${index + 1}`);
    // biome-ignore lint/style/noNonNullAssertion -- sectors has ASTEROID_COUNT entries
    const sector = sectors[index]!;

    const asteroid: Asteroid = {
      id,
      name,
      ownerId: null,
      sector,
      sizeClass,
      deposits,
      radiation,
      stability,
      happiness,
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
    return asteroid;
  });
}

function generatePlayers(prng: Prng): Player[] {
  const allRaces = getAllRaceDefs();

  const humanPlayer: Player = {
    id: HUMAN_PLAYER_ID,
    raceId: allRaces.find((r) => r.playable)?.id ?? allRaces[0]?.id ?? "helionCorp",
    isHuman: true,
    alive: true,
    credits: 10_000,
    federationStanding: 0,
    suspicion: 0,
    oreInventory: {},
    reputation: new Map(),
    blueprintsOwned: new Set(),
    eventLog: [],
  };

  const aiRaces = allRaces.filter((r) => !r.playable);
  const aiPlayers: Player[] = aiRaces.map((race, index) => ({
    id: playerId(`p${index + 1}`),
    raceId: race.id,
    isHuman: false,
    alive: true,
    credits: Math.round(8_000 + prng.next() * 4_000),
    federationStanding: 0,
    suspicion: 0,
    oreInventory: {},
    reputation: new Map(),
    blueprintsOwned: new Set(),
    eventLog: [],
  }));

  return [humanPlayer, ...aiPlayers];
}

function assignStartingAsteroids(
  asteroids: Asteroid[],
  players: Player[],
  prng: Prng,
): void {
  const unowned = [...asteroids];
  const shuffled = fisherYates(unowned, prng);
  let cursor = 0;

  for (const player of players) {
    const count = player.isHuman ? 1 : 1 + (prng.next() < 0.5 ? 0 : 1);
    for (let i = 0; i < count && cursor < shuffled.length; i++) {
      // biome-ignore lint/style/noNonNullAssertion -- cursor bounded by shuffled.length check
      shuffled[cursor]!.ownerId = player.id as PlayerId;
      cursor++;
    }
  }
}

export function generateBelt(seed: number): GeneratedBelt {
  const prng = makePrng(seed);
  const asteroids = generateAsteroids(prng);
  const players = generatePlayers(prng);
  assignStartingAsteroids(asteroids, players, prng);
  return { asteroids, players };
}
