import { getAllAgentDefs } from "@fa/content";
import {
  type Agent,
  type AgentId,
  agentId,
  type AsteroidId,
  type Building,
  type BuildingId,
  buildingId,
  type OreRecord,
  type World,
} from "@fa/domain";
import { generateBelt } from "./beltGenerator.ts";
import type { DifficultyLevel } from "./difficulty.ts";

export interface WorldConfig {
  seed: number;
  humanPlayerRaceId: string;
  difficulty?: DifficultyLevel;
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
  const difficulty: DifficultyLevel = config.difficulty ?? "normal";
  const { asteroids: beltAsteroids, players: beltPlayers, prng } = generateBelt(
    config.seed,
    config.humanPlayerRaceId,
    difficulty,
  );

  const asteroids = new Map(beltAsteroids.map((a) => [a.id, a]));
  const buildings = new Map<BuildingId, Building>();

  // Place a CPU building on each player-owned asteroid at world creation
  let cpuSeq = 0;
  for (const asteroid of beltAsteroids) {
    if (asteroid.ownerId !== null) {
      const bid = buildingId(`building-cpu-${cpuSeq++}`);
      asteroid.buildings.push(bid);
      buildings.set(bid, makeCpuBuilding(bid, asteroid.id));
    }
  }

  const players = new Map(beltPlayers.map((p) => [p.id, p]));

  const agents = new Map<AgentId, Agent>();
  for (const def of getAllAgentDefs()) {
    const id = agentId(def.id);
    agents.set(id, {
      id,
      name: def.name,
      ownerId: null,
      stealth: def.stealth,
      hireCost: def.hireCost,
      missionKind: null,
      missionTarget: null,
      missionCompleteTick: null,
    });
  }

  return {
    tick: 0,
    seed: config.seed,
    difficulty,
    asteroids,
    buildings,
    ships: new Map(),
    players,
    treaties: [],
    marketPrices: { ...BASE_MARKET_PRICES },
    eventQueue: [],
    prng,
    schemaVersion: 1,
    nextBuildingSeq: 0,
    nextShipSeq: 0,
    nextTreatySeq: 0,
    gameEndState: null,
    agents,
  };
}
