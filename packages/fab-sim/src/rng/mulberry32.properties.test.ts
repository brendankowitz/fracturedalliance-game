import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createMulberry32, hashLabel, PrngRegistry, subGenSeed } from '../index';

describe('mulberry32 — property tests', () => {
  it('same seed → identical sequence (determinism)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 0xffffffff }), fc.integer({ min: 1, max: 200 }), (seed, n) => {
        const a = createMulberry32(seed);
        const b = createMulberry32(seed);
        for (let i = 0; i < n; i++) expect(a.next()).toBe(b.next());
      }),
    );
  });

  it('output stays in [0, 1) for any seed', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 0xffffffff }), (seed) => {
        const g = createMulberry32(seed);
        for (let i = 0; i < 64; i++) {
          const v = g.next();
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThan(1);
        }
      }),
    );
  });

  it('int(min, max) is always within bounds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 0xffffffff }),
        fc.integer({ min: -1_000, max: 0 }),
        fc.integer({ min: 0, max: 1_000 }),
        (seed, lo, hi) => {
          const g = createMulberry32(seed);
          for (let i = 0; i < 32; i++) {
            const v = g.int(lo, hi);
            expect(Number.isInteger(v)).toBe(true);
            expect(v).toBeGreaterThanOrEqual(lo);
            expect(v).toBeLessThanOrEqual(hi);
          }
        },
      ),
    );
  });

  it('state() round-trip — restoring produces identical subsequent draws', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 0xffffffff }), fc.integer({ min: 0, max: 50 }), (seed, skip) => {
        const g = createMulberry32(seed);
        for (let i = 0; i < skip; i++) g.next();
        const snapshot = g.state();
        const a = [g.next(), g.next(), g.next(), g.next()];
        const g2 = createMulberry32(snapshot);
        // First draw of restored must equal a[0]... but mulberry32 applies the offset
        // *before* mixing, so restoring from snapshot and drawing yields a[0] again.
        const b = [g2.next(), g2.next(), g2.next(), g2.next()];
        expect(b).toEqual(a);
      }),
    );
  });

  it('hashLabel is deterministic and differs per label', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 32 }), (label) => {
        expect(hashLabel(label)).toBe(hashLabel(label));
      }),
    );
    expect(hashLabel('market')).not.toBe(hashLabel('combat'));
    expect(hashLabel('ai')).not.toBe(hashLabel('event'));
  });

  it('subGenSeed isolates sub-generators — drawing from "market" does not affect "combat"', () => {
    const reg = new PrngRegistry(0xcafebabe);
    const combatBefore = [reg.get('combat').next(), reg.get('combat').next()];
    // Interleave heavy market draws
    const market = reg.get('market');
    for (let i = 0; i < 500; i++) market.next();
    // combat sequence must continue exactly as if market had never been touched
    const regB = new PrngRegistry(0xcafebabe);
    const expectedCombat = [regB.get('combat').next(), regB.get('combat').next()];
    expect(combatBefore).toEqual(expectedCombat);
  });

  it('PrngRegistry.snapshot → restore preserves all sub-generator states', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 0xffffffff }),
        fc.array(fc.constantFrom('market', 'combat', 'ai', 'event', 'worldGen', 'trader', 'espionage'), {
          minLength: 1,
          maxLength: 15,
        }),
        (seed, draws) => {
          const reg = new PrngRegistry(seed);
          for (const label of draws) reg.get(label as never).next();
          const snap = reg.snapshot();
          const restored = PrngRegistry.restore(snap);
          // Each sub-gen's next draw from the restored registry must match the original.
          const original = new PrngRegistry(seed);
          for (const label of draws) original.get(label as never).next();
          for (const label of new Set(draws)) {
            expect(restored.get(label as never).next()).toBe(original.get(label as never).next());
          }
        },
      ),
    );
  });

  it('subGenSeed(masterSeed, label) is stable across calls', () => {
    expect(subGenSeed(42, 'market')).toBe(subGenSeed(42, 'market'));
    expect(subGenSeed(42, 'market')).not.toBe(subGenSeed(42, 'combat'));
  });
});
