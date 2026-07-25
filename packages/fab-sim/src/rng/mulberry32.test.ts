import { describe, expect, it } from 'vitest';
import { createMulberry32, hashLabel, PrngRegistry } from '../index';

describe('mulberry32', () => {
  it('is deterministic given the same seed', () => {
    const a = createMulberry32(42);
    const b = createMulberry32(42);
    for (let i = 0; i < 1000; i++) expect(a.next()).toBe(b.next());
  });

  it('diverges given different seeds', () => {
    const a = createMulberry32(1);
    const b = createMulberry32(2);
    let same = 0;
    for (let i = 0; i < 256; i++) if (a.next() === b.next()) same++;
    expect(same).toBeLessThan(4);
  });

  it('int range is inclusive', () => {
    const g = createMulberry32(7);
    for (let i = 0; i < 500; i++) {
      const n = g.int(3, 9);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(9);
    }
  });

  it('pick throws on empty array', () => {
    expect(() => createMulberry32(0).pick([])).toThrow();
  });
});

describe('PrngRegistry', () => {
  it('snapshots and restores losslessly', () => {
    const reg = new PrngRegistry(1234);
    const market = reg.get('market');
    const combat = reg.get('combat');
    for (let i = 0; i < 50; i++) market.next();
    for (let i = 0; i < 50; i++) combat.next();
    const snap = reg.snapshot();
    const restored = PrngRegistry.restore(snap);
    expect(restored.get('market').next()).toBe(market.next());
    expect(restored.get('combat').next()).toBe(combat.next());
  });

  it('different labels produce different sequences', () => {
    const reg = new PrngRegistry(99);
    expect(reg.get('market').next()).not.toBe(reg.get('combat').next());
  });

  it('hashLabel is stable', () => {
    expect(hashLabel('market')).toBe(hashLabel('market'));
    expect(hashLabel('market')).not.toBe(hashLabel('combat'));
  });
});
