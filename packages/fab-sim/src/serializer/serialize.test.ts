import { asBlueprintId, asPlayerId, type World } from '@fab/domain';
import { describe, expect, it } from 'vitest';
import {
  compressWorld,
  createWorld,
  decompressWorld,
  deserializeWorld,
  migrateToLatest,
  serializeWorld,
} from '../index';

const withPlayer = (seed = 123): World => {
  const w = createWorld({ seed, scenarioId: 'test', createdAtIso: '2026-01-01T00:00:00.000Z' });
  w.players.set(asPlayerId('p1'), {
    id: asPlayerId('p1'),
    raceId: 'terrans',
    isHuman: true,
    credits: 5000,
    reputation: {},
    federationStanding: 0,
    blueprintsOwned: new Set([asBlueprintId('mk2-mine')]),
    eventLog: [],
    alive: true,
    suspicion: 0,
    activeResearch: null,
    marketOrders: [],
    totalCreditsEarned: 0,
    economicControlTicks: 0,
  });
  return w;
};

describe('serializer', () => {
  it('round-trips a world through serialize → deserialize', () => {
    const original = withPlayer();
    const restored = deserializeWorld(serializeWorld(original));
    expect(restored.tick).toBe(original.tick);
    expect(restored.seed).toBe(original.seed);
    expect(restored.scenarioId).toBe(original.scenarioId);
    expect(restored.players.size).toBe(1);
    const p = restored.players.get(asPlayerId('p1'));
    expect(p?.blueprintsOwned.has(asBlueprintId('mk2-mine'))).toBe(true);
  });

  it('compress → decompress is idempotent', () => {
    const sw = serializeWorld(withPlayer());
    const blob = compressWorld(sw);
    const recovered = decompressWorld(blob);
    expect(recovered).toEqual(sw);
  });

  it('migrateToLatest accepts a freshly-serialised world unchanged (v2)', () => {
    // Phase 12 bumped the save schema to v2 when `tutorialState` was added.
    // Freshly-serialised worlds are tagged v2 by `createWorld`.
    const sw = serializeWorld(withPlayer());
    const migrated = migrateToLatest(sw);
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.tick).toBe(sw.tick);
  });

  it('migrateToLatest lifts a legacy v1 payload to v2 and defaults tutorialState', () => {
    // Simulate a pre-Phase-12 save: the raw blob is tagged v1 and has no
    // tutorialState/commandTrace fields. The migration must fill them.
    const fresh = serializeWorld(withPlayer()) as unknown as Record<string, unknown>;
    const legacy: Record<string, unknown> = { ...fresh, schemaVersion: 1 };
    delete legacy.tutorialState;
    delete legacy.commandTrace;
    const migrated = migrateToLatest(legacy);
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.tutorialState).toBeNull();
  });
});
