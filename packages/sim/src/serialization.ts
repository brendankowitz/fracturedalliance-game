import type {
  Agent,
  AgentId,
  AgentMissionKind,
  AiEventRecord,
  Asteroid,
  AsteroidEngineState,
  AsteroidId,
  BlueprintId,
  Building,
  BuildingId,
  BuildQueueItem,
  DifficultyLevel,
  GameEndState,
  OreRecord,
  PendingMissile,
  Player,
  PlayerId,
  Ship,
  ShipId,
  ShipOrder,
  Treaty,
  TreatyId,
  TreatyKind,
  World,
} from "@fa/domain";
import { agentId, asteroidId, blueprintId, buildingId, playerId, shipId, treatyId } from "@fa/domain";
import { makePrng } from "./prng.ts";

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

export function serializeWorld(world: World): Record<string, unknown> {
  return {
    tick: world.tick,
    seed: world.seed,
    difficulty: world.difficulty,
    schemaVersion: world.schemaVersion,
    nextBuildingSeq: world.nextBuildingSeq,
    nextShipSeq: world.nextShipSeq,
    nextTreatySeq: world.nextTreatySeq,
    nextMissileSeq: world.nextMissileSeq,
    missiles: world.missiles.map((m) => ({ ...m })),
    gameEndState: world.gameEndState,
    marketPrices: { ...world.marketPrices },
    treaties: world.treaties.map(serializeTreaty),
    asteroids: [...world.asteroids.values()].map(serializeAsteroid),
    buildings: [...world.buildings.values()].map(serializeBuilding),
    ships: [...world.ships.values()].map(serializeShip),
    players: [...world.players.values()].map(serializePlayer),
    agents: [...world.agents.values()].map((a) => ({
      id: a.id,
      name: a.name,
      ownerId: a.ownerId ?? null,
      stealth: a.stealth,
      hireCost: a.hireCost,
      missionKind: a.missionKind ?? null,
      missionTarget: a.missionTarget ?? null,
      missionCompleteTick: a.missionCompleteTick ?? null,
      tributeActive: a.tributeActive,
      tributeEndTick: a.tributeEndTick ?? null,
    })),
    expeditionFleet: {
      active: world.expeditionFleet.active,
      ticksRemaining: world.expeditionFleet.ticksRemaining,
      fleetsLaunched: world.expeditionFleet.fleetsLaunched,
    },
  };
}

function serializeTreaty(t: Treaty): Record<string, unknown> {
  return {
    id: t.id,
    parties: [t.parties[0], t.parties[1]],
    kind: t.kind,
    signedTick: t.signedTick,
    expiresTick: t.expiresTick ?? null,
  };
}

function serializeAsteroid(a: Asteroid): Record<string, unknown> {
  return {
    id: a.id,
    name: a.name,
    ownerId: a.ownerId,
    sector: { x: a.sector.x, y: a.sector.y },
    sizeClass: a.sizeClass,
    radiation: a.radiation,
    stability: a.stability,
    happiness: a.happiness,
    deposits: { ...a.deposits },
    buildings: [...a.buildings],
    inOrbit: [...a.inOrbit],
    buildQueue: a.buildQueue.map(serializeBuildQueueItem),
    engines: { ...a.engines },
  };
}

function serializeBuildQueueItem(q: BuildQueueItem): Record<string, unknown> {
  return {
    buildingKind: q.buildingKind,
    progressTicks: q.progressTicks,
    totalTicks: q.totalTicks,
    cell: { x: q.cell.x, y: q.cell.y },
    queuedAt: q.queuedAt,
  };
}

function serializeBuilding(b: Building): Record<string, unknown> {
  return {
    id: b.id,
    defKind: b.defKind,
    asteroidId: b.asteroidId,
    cell: { x: b.cell.x, y: b.cell.y },
    hp: b.hp,
    maxHp: b.maxHp,
    constructionProgress: b.constructionProgress,
    active: b.active,
    damage: b.damage,
  };
}

function serializeShip(s: Ship): Record<string, unknown> {
  return {
    id: s.id,
    defKind: s.defKind,
    ownerId: s.ownerId,
    hullHp: s.hullHp,
    shieldHp: s.shieldHp,
    position: { x: s.position.x, y: s.position.y },
    velocity: { x: s.velocity.x, y: s.velocity.y },
    order: serializeShipOrder(s.order),
    cargo: { ...s.cargo },
  };
}

function serializeShipOrder(order: ShipOrder): Record<string, unknown> {
  return { ...order } as Record<string, unknown>;
}

function serializePlayer(p: Player): Record<string, unknown> {
  return {
    id: p.id,
    raceId: p.raceId,
    isHuman: p.isHuman,
    alive: p.alive,
    credits: p.credits,
    federationStanding: p.federationStanding,
    suspicion: p.suspicion,
    licenseRevoked: p.licenseRevoked,
    oreInventory: { ...p.oreInventory },
    reputation: [...p.reputation.entries()],
    blueprintsOwned: [...p.blueprintsOwned],
    eventLog: p.eventLog.map((e) => ({ ...e, data: { ...e.data } })),
  };
}

// ---------------------------------------------------------------------------
// Deserialization
// ---------------------------------------------------------------------------

export function deserializeWorld(snapshot: Record<string, unknown>, rngState: number): World {
  const seed = snapshot["seed"] as number;
  const prng = makePrng(seed);
  prng.restore(rngState);

  const rawAsteroids = snapshot["asteroids"] as Array<Record<string, unknown>>;
  const asteroids = new Map<AsteroidId, Asteroid>(
    rawAsteroids.map((raw) => {
      const a = deserializeAsteroid(raw);
      return [a.id, a];
    }),
  );

  const rawBuildings = snapshot["buildings"] as Array<Record<string, unknown>>;
  const buildings = new Map<BuildingId, Building>(
    rawBuildings.map((raw) => {
      const b = deserializeBuilding(raw);
      return [b.id, b];
    }),
  );

  const rawShips = snapshot["ships"] as Array<Record<string, unknown>>;
  const ships = new Map<ShipId, Ship>(
    rawShips.map((raw) => {
      const s = deserializeShip(raw);
      return [s.id, s];
    }),
  );

  const rawPlayers = snapshot["players"] as Array<Record<string, unknown>>;
  const players = new Map<PlayerId, Player>(
    rawPlayers.map((raw) => {
      const p = deserializePlayer(raw);
      return [p.id, p];
    }),
  );

  const rawTreaties = snapshot["treaties"] as Array<Record<string, unknown>>;

  const agents = new Map<AgentId, Agent>(
    ((snapshot["agents"] ?? []) as Array<Record<string, unknown>>).map((a) => {
      const id = agentId(a["id"] as string);
      const agent: Agent = {
        id,
        name: a["name"] as string,
        ownerId: a["ownerId"] != null ? playerId(a["ownerId"] as string) : null,
        stealth: a["stealth"] as number,
        hireCost: a["hireCost"] as number,
        missionKind: (a["missionKind"] as AgentMissionKind | null) ?? null,
        missionTarget: a["missionTarget"] != null ? asteroidId(a["missionTarget"] as string) : null,
        missionCompleteTick: (a["missionCompleteTick"] as number | null) ?? null,
        tributeActive: (a["tributeActive"] as boolean | undefined) ?? false,
        tributeEndTick: (a["tributeEndTick"] as number | null | undefined) ?? null,
      };
      return [id, agent];
    }),
  );

  const rawExpeditionFleet = snapshot["expeditionFleet"] as
    | { active?: boolean; ticksRemaining?: number; fleetsLaunched?: number }
    | undefined;

  return {
    tick: snapshot["tick"] as number,
    seed,
    difficulty: (snapshot["difficulty"] as DifficultyLevel | undefined) ?? "manager",
    prng,
    schemaVersion: snapshot["schemaVersion"] as number,
    nextBuildingSeq: snapshot["nextBuildingSeq"] as number,
    nextShipSeq: snapshot["nextShipSeq"] as number,
    nextTreatySeq: snapshot["nextTreatySeq"] as number,
    nextMissileSeq: (snapshot["nextMissileSeq"] as number | undefined) ?? 0,
    missiles: ((snapshot["missiles"] as unknown[] | undefined) ?? []).map((m): PendingMissile => {
      const r = m as Record<string, unknown>;
      return {
        id: r["id"] as string,
        ownerId: playerId(r["ownerId"] as string),
        sourceId: asteroidId(r["sourceId"] as string),
        targetId: asteroidId(r["targetId"] as string),
        arrivalTick: r["arrivalTick"] as number,
      };
    }),
    gameEndState: (snapshot["gameEndState"] as GameEndState | null) ?? null,
    marketPrices: snapshot["marketPrices"] as OreRecord<number>,
    treaties: rawTreaties.map(deserializeTreaty),
    asteroids,
    buildings,
    ships,
    players,
    eventQueue: [],
    agents,
    expeditionFleet: {
      active: rawExpeditionFleet?.active ?? false,
      ticksRemaining: rawExpeditionFleet?.ticksRemaining ?? 0,
      fleetsLaunched: rawExpeditionFleet?.fleetsLaunched ?? 0,
    },
  };
}

function deserializeTreaty(raw: Record<string, unknown>): Treaty {
  const parties = raw["parties"] as [string, string];
  const base: Treaty = {
    id: treatyId(raw["id"] as string),
    parties: [playerId(parties[0]), playerId(parties[1])],
    kind: raw["kind"] as TreatyKind,
    signedTick: raw["signedTick"] as number,
  };
  const expiresTick = raw["expiresTick"];
  if (expiresTick !== null && expiresTick !== undefined) {
    return { ...base, expiresTick: expiresTick as number };
  }
  return base;
}

function deserializeAsteroid(raw: Record<string, unknown>): Asteroid {
  const rawSector = raw["sector"] as { x: number; y: number };
  const rawEngines = raw["engines"] as Record<string, unknown>;
  const rawBuildQueue = raw["buildQueue"] as Array<Record<string, unknown>>;
  const rawBuildings = raw["buildings"] as string[];
  const rawInOrbit = raw["inOrbit"] as string[];

  return {
    id: asteroidId(raw["id"] as string),
    name: raw["name"] as string,
    ownerId: raw["ownerId"] !== null ? playerId(raw["ownerId"] as string) : null,
    sector: { x: rawSector.x, y: rawSector.y },
    sizeClass: raw["sizeClass"] as Asteroid["sizeClass"],
    radiation: raw["radiation"] as number,
    stability: raw["stability"] as number,
    happiness: raw["happiness"] as number,
    deposits: raw["deposits"] as Asteroid["deposits"],
    buildings: rawBuildings.map((id) => buildingId(id)),
    inOrbit: rawInOrbit.map((id) => shipId(id)),
    buildQueue: rawBuildQueue.map(deserializeBuildQueueItem),
    engines: {
      count: rawEngines["count"] as number,
      destinationId:
        rawEngines["destinationId"] !== null
          ? asteroidId(rawEngines["destinationId"] as string)
          : null,
      etaTick: rawEngines["etaTick"] as number | null,
      chargeTick: rawEngines["chargeTick"] as number | null,
    } satisfies AsteroidEngineState,
  };
}

function deserializeBuildQueueItem(raw: Record<string, unknown>): BuildQueueItem {
  const rawCell = raw["cell"] as { x: number; y: number };
  return {
    buildingKind: raw["buildingKind"] as string,
    progressTicks: raw["progressTicks"] as number,
    totalTicks: raw["totalTicks"] as number,
    cell: { x: rawCell.x, y: rawCell.y },
    queuedAt: raw["queuedAt"] as number,
  };
}

function deserializeBuilding(raw: Record<string, unknown>): Building {
  const rawCell = raw["cell"] as { x: number; y: number };
  return {
    id: buildingId(raw["id"] as string),
    defKind: raw["defKind"] as string,
    asteroidId: asteroidId(raw["asteroidId"] as string),
    cell: { x: rawCell.x, y: rawCell.y },
    hp: raw["hp"] as number,
    maxHp: raw["maxHp"] as number,
    constructionProgress: raw["constructionProgress"] as number,
    active: raw["active"] as boolean,
    damage: raw["damage"] as number,
  };
}

function deserializeShip(raw: Record<string, unknown>): Ship {
  const rawPos = raw["position"] as { x: number; y: number };
  const rawVel = raw["velocity"] as { x: number; y: number };
  return {
    id: shipId(raw["id"] as string),
    defKind: raw["defKind"] as Ship["defKind"],
    ownerId: playerId(raw["ownerId"] as string),
    hullHp: raw["hullHp"] as number,
    shieldHp: raw["shieldHp"] as number,
    position: { x: rawPos.x, y: rawPos.y },
    velocity: { x: rawVel.x, y: rawVel.y },
    order: raw["order"] as ShipOrder,
    cargo: raw["cargo"] as Ship["cargo"],
  };
}

function deserializePlayer(raw: Record<string, unknown>): Player {
  const rawReputation = raw["reputation"] as Array<[string, number]>;
  const rawBlueprints = raw["blueprintsOwned"] as string[];
  const rawEventLog = raw["eventLog"] as Array<Record<string, unknown>>;

  return {
    id: playerId(raw["id"] as string),
    raceId: raw["raceId"] as string,
    isHuman: raw["isHuman"] as boolean,
    alive: raw["alive"] as boolean,
    credits: raw["credits"] as number,
    federationStanding: raw["federationStanding"] as number,
    suspicion: raw["suspicion"] as number,
    licenseRevoked: (raw["licenseRevoked"] as boolean | undefined) ?? false,
    oreInventory: raw["oreInventory"] as Player["oreInventory"],
    reputation: new Map<PlayerId, number>(rawReputation.map(([id, val]) => [playerId(id), val])),
    blueprintsOwned: new Set<BlueprintId>(rawBlueprints.map((id) => blueprintId(id))),
    eventLog: rawEventLog.map(deserializeAiEventRecord),
  };
}

function deserializeAiEventRecord(raw: Record<string, unknown>): AiEventRecord {
  return {
    tick: raw["tick"] as number,
    kind: raw["kind"] as string,
    data: raw["data"] as Record<string, unknown>,
  };
}
