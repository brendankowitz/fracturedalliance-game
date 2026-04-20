import type { Agent } from "./agent.ts";
import type { Asteroid } from "./asteroid.ts";
import type { Building } from "./building.ts";
import type { GameEvent } from "./events.ts";
import type { AgentId, AsteroidId, BuildingId, PlayerId, ShipId } from "./ids.ts";
import type { Player } from "./player.ts";
import type { Ship } from "./ship.ts";
import type { Treaty } from "./treaty.ts";
import type { GameEndState, OreRecord } from "./types.ts";

export type { GameEndState };

export interface Prng {
  next(): number;
  state(): number;
  restore(state: number): void;
}

export type DifficultyLevel = "intern" | "manager" | "director" | "ceo" | "board";

export interface World {
  tick: number;
  readonly seed: number;
  difficulty: DifficultyLevel;
  asteroids: Map<AsteroidId, Asteroid>;
  buildings: Map<BuildingId, Building>;
  ships: Map<ShipId, Ship>;
  players: Map<PlayerId, Player>;
  treaties: Treaty[];
  marketPrices: OreRecord<number>;
  eventQueue: GameEvent[];
  prng: Prng;
  readonly schemaVersion: number;
  nextBuildingSeq: number;
  nextShipSeq: number;
  nextTreatySeq: number;
  gameEndState: GameEndState | null;
  agents: Map<AgentId, Agent>;
}
