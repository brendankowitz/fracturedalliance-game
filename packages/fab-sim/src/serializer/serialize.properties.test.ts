import { asBlueprintId, asPlayerId, type PlayerId, type World } from '@fab/domain';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { compressWorld, createWorld, decompressWorld, deserializeWorld, serializeWorld } from '../index';

const playerArb = (id: PlayerId) =>
  fc
    .record({
      credits: fc.integer({ min: 0, max: 1_000_000 }),
      alive: fc.boolean(),
      blueprintIds: fc.uniqueArray(fc.string({ minLength: 1, maxLength: 12 }), { maxLength: 6 }),
      suspicion: fc.integer({ min: 0, max: 100 }),
    })
    .map((r) => ({
      id,
      raceId: 'terrans' as const,
      isHuman: false,
      credits: r.credits,
      reputation: {},
      federationStanding: 0,
      blueprintsOwned: new Set(r.blueprintIds.map((b) => asBlueprintId(b))),
      eventLog: [],
      alive: r.alive,
      suspicion: r.suspicion,
      activeResearch: null,
      marketOrders: [],
      totalCreditsEarned: 0,
      economicControlTicks: 0,
    }));

const worldArb = fc
  .record({
    seed: fc.integer({ min: 0, max: 0xffffffff }),
    scenarioId: fc.constantFrom('tutorial', 'short-game', 'classic-skirmish'),
    nPlayers: fc.integer({ min: 0, max: 5 }),
  })
  .chain(({ seed, scenarioId, nPlayers }) => {
    const ids = Array.from({ length: nPlayers }, (_, i) => asPlayerId(`p${i + 1}`));
    return fc.tuple(...ids.map((id) => playerArb(id))).map((players) => {
      const w = createWorld({ seed, scenarioId, createdAtIso: '2026-01-01T00:00:00.000Z' });
      for (const p of players) w.players.set(p.id, p);
      return w;
    });
  });

describe('serializer — property tests', () => {
  it('serialize → deserialize preserves tick/seed/scenario and player count', () => {
    fc.assert(
      fc.property(worldArb, (w: World) => {
        const restored = deserializeWorld(serializeWorld(w));
        expect(restored.tick).toBe(w.tick);
        expect(restored.seed).toBe(w.seed);
        expect(restored.scenarioId).toBe(w.scenarioId);
        expect(restored.players.size).toBe(w.players.size);
      }),
    );
  });

  it('compress → decompress is idempotent for arbitrary worlds', () => {
    fc.assert(
      fc.property(worldArb, (w: World) => {
        const sw = serializeWorld(w);
        const blob = compressWorld(sw);
        const recovered = decompressWorld(blob);
        expect(recovered).toEqual(sw);
      }),
    );
  });

  it('blueprint Sets round-trip without losing ids', () => {
    fc.assert(
      fc.property(worldArb, (w: World) => {
        const restored = deserializeWorld(serializeWorld(w));
        for (const [id, p] of w.players) {
          const r = restored.players.get(id);
          expect(r).toBeDefined();
          expect(r?.blueprintsOwned.size).toBe(p.blueprintsOwned.size);
          for (const bp of p.blueprintsOwned) expect(r?.blueprintsOwned.has(bp)).toBe(true);
        }
      }),
    );
  });
});
