import type { BlueprintId, Player, ScriptedTrigger, World } from '@fab/domain';
import pako from 'pako';

/** JSON-serialisable mirror of World — Maps become records, Sets become arrays. */
export interface SerializedWorld {
  schemaVersion: number;
  tick: number;
  seed: number;
  asteroids: Array<[string, unknown]>;
  buildings: Array<[string, unknown]>;
  ships: Array<[string, unknown]>;
  missiles: unknown[];
  players: Array<[string, unknown]>;
  treaties: unknown[];
  market: unknown;
  eventQueue: unknown[];
  scheduledEvents: unknown[];
  commandQueue: unknown[];
  rng: unknown;
  createdAtIso: string;
  scenarioId: string;
  /** Stream E3 — optional difficulty tier; defaults to 'normal' on load. */
  difficulty?: string;
  nextBuildingId: number;
  nextShipId: number;
  nextTreatyId: number;
  nextMissileId: number;
  federalTransporterNextTick: number;
  outcome: unknown;
  /** Phase 12 — scripted tutorial progression, `null` when not applicable. */
  tutorialState: unknown;
  /** Phase 12 — transient trace of applied commands per tick. */
  commandTrace: unknown;
  // ── Phase 0.2 — Stream B optional fields ──
  espionage?: unknown;
  detection?: unknown;
  council?: unknown;
  satellites?: unknown[];
  scenarioTriggers?: ScriptedTrigger[];
  scenarioTriggersFired?: number[];
}

/** Convert a live World into a plain JSON-safe object. */
export const serializeWorld = (world: World): SerializedWorld => {
  const out: SerializedWorld = {
    schemaVersion: world.schemaVersion,
    tick: world.tick,
    seed: world.seed,
    asteroids: Array.from(world.asteroids.entries()),
    buildings: Array.from(world.buildings.entries()),
    ships: Array.from(world.ships.entries()),
    missiles: world.missiles,
    players: Array.from(world.players.entries()).map(([id, p]: [string, Player]) => [
      id,
      { ...p, blueprintsOwned: Array.from(p.blueprintsOwned) },
    ]),
    treaties: world.treaties,
    market: world.market,
    eventQueue: world.eventQueue,
    scheduledEvents: world.scheduledEvents,
    commandQueue: world.commandQueue,
    rng: world.rng,
    createdAtIso: world.createdAtIso,
    scenarioId: world.scenarioId,
    nextBuildingId: world.nextBuildingId,
    nextShipId: world.nextShipId,
    nextTreatyId: world.nextTreatyId,
    nextMissileId: world.nextMissileId,
    federalTransporterNextTick: world.federalTransporterNextTick,
    outcome: world.outcome,
    tutorialState: world.tutorialState,
    commandTrace: world.commandTrace,
  };
  if (world.espionage) out.espionage = world.espionage;
  if (world.difficulty) out.difficulty = world.difficulty;
  if (world.detection) out.detection = world.detection;
  if (world.council) out.council = world.council;
  if (world.satellites) out.satellites = world.satellites;
  if (world.scenarioTriggers) out.scenarioTriggers = world.scenarioTriggers as ScriptedTrigger[];
  if (world.scenarioTriggersFired) out.scenarioTriggersFired = world.scenarioTriggersFired;
  return out;
};

/** Recover a live World from its plain-object mirror. Assumes latest schema. */
export const deserializeWorld = (raw: SerializedWorld): World => {
  const players = new Map();
  for (const [id, p] of raw.players) {
    const anyP = p as { blueprintsOwned: string[] };
    players.set(id, {
      ...(p as object),
      blueprintsOwned: new Set(anyP.blueprintsOwned as BlueprintId[]),
    });
  }
  const world: World = {
    tick: raw.tick,
    seed: raw.seed,
    asteroids: new Map(raw.asteroids as []),
    buildings: new Map(raw.buildings as []),
    ships: new Map(raw.ships as []),
    missiles: raw.missiles as World['missiles'],
    players,
    treaties: raw.treaties as World['treaties'],
    market: raw.market as World['market'],
    eventQueue: raw.eventQueue as World['eventQueue'],
    scheduledEvents: (raw.scheduledEvents ?? []) as World['scheduledEvents'],
    commandQueue: (raw.commandQueue ?? []) as World['commandQueue'],
    rng: raw.rng as World['rng'],
    schemaVersion: raw.schemaVersion,
    createdAtIso: raw.createdAtIso,
    scenarioId: raw.scenarioId,
    difficulty: (raw.difficulty as World['difficulty']) ?? 'normal',
    nextBuildingId: raw.nextBuildingId ?? 1,
    nextShipId: raw.nextShipId ?? 1,
    nextTreatyId: raw.nextTreatyId ?? 1,
    nextMissileId: raw.nextMissileId ?? 1,
    federalTransporterNextTick: raw.federalTransporterNextTick ?? 0,
    outcome: (raw.outcome ?? null) as World['outcome'],
    tutorialState: (raw.tutorialState ?? null) as World['tutorialState'],
    commandTrace: (raw.commandTrace ?? []) as World['commandTrace'],
  };
  if (raw.espionage) world.espionage = raw.espionage as NonNullable<World['espionage']>;
  if (raw.detection) world.detection = raw.detection as NonNullable<World['detection']>;
  if (raw.council) world.council = raw.council as NonNullable<World['council']>;
  if (raw.satellites) world.satellites = raw.satellites as NonNullable<World['satellites']>;
  if (raw.scenarioTriggers)
    world.scenarioTriggers = raw.scenarioTriggers as NonNullable<World['scenarioTriggers']>;
  if (raw.scenarioTriggersFired)
    world.scenarioTriggersFired = raw.scenarioTriggersFired as NonNullable<World['scenarioTriggersFired']>;
  return world;
};

/** Compress a SerializedWorld to a base64 gzip string suitable for IndexedDB. */
export const compressWorld = (sw: SerializedWorld): string => {
  const json = JSON.stringify(sw);
  const deflated = pako.deflate(json);
  return btoa(String.fromCharCode(...deflated));
};

export const decompressWorld = (blob: string): SerializedWorld => {
  const bin = atob(blob);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const json = pako.inflate(bytes, { to: 'string' });
  return JSON.parse(json) as SerializedWorld;
};
