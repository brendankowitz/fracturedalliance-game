import { ORE_KINDS } from '@fab/domain';
import { describe, expect, it } from 'vitest';
import { ORES, ORES_LIST } from './data/ores';

describe('ORES', () => {
  it('covers all ten OreKind values exactly once', () => {
    const keys = Object.keys(ORES).sort();
    expect(keys).toEqual([...ORE_KINDS].sort());
  });

  it('has unique display names', () => {
    const names = ORES_LIST.map((o) => o.displayName);
    expect(new Set(names).size).toBe(names.length);
  });

  it('has strictly increasing base value in the canonical rarity order', () => {
    for (let i = 1; i < ORE_KINDS.length; i += 1) {
      const prev = ORE_KINDS[i - 1];
      const cur = ORE_KINDS[i];
      if (!prev || !cur) continue;
      expect(ORES[cur].baseValue).toBeGreaterThan(ORES[prev].baseValue);
    }
  });

  it('keeps radiationRisk, volatility within [0,1]', () => {
    for (const ore of ORES_LIST) {
      expect(ore.radiationRisk).toBeGreaterThanOrEqual(0);
      expect(ore.radiationRisk).toBeLessThanOrEqual(1);
      expect(ore.volatilityIndex).toBeGreaterThanOrEqual(0);
      expect(ore.volatilityIndex).toBeLessThanOrEqual(1);
    }
  });
});
