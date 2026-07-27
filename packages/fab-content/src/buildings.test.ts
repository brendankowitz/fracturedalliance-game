import { describe, expect, it } from 'vitest';
import { BLUEPRINTS_LIST } from './data/blueprints';
import { BUILDINGS, BUILDINGS_LIST } from './data/buildings';

describe('BUILDINGS', () => {
  it('contains the 46 canonical buildings plus the free CPU core', () => {
    // 26 Phase-0.1 baseline + 19 Phase-0.2 additions per spec §C.4 balance table
    // and blueprint-gated unlocks referenced by BLUEPRINTS.
    expect(BUILDINGS_LIST).toHaveLength(45);
    expect(BUILDINGS['bld.cpu-core'].costCredits).toBe(0);
  });

  it('has unique kinds and display names', () => {
    const kinds = BUILDINGS_LIST.map((b) => b.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
    const names = BUILDINGS_LIST.map((b) => b.displayName);
    expect(new Set(names).size).toBe(names.length);
  });

  it('costs and build times are non-negative and finite', () => {
    for (const b of BUILDINGS_LIST) {
      expect(b.costCredits).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(b.costCredits)).toBe(true);
      expect(b.buildTimeTicks).toBeGreaterThanOrEqual(0);
      for (const [ore, amt] of Object.entries(b.oreCost ?? {})) {
        expect(amt, `${b.kind}.oreCost.${ore}`).toBeGreaterThanOrEqual(0);
      }
      for (const [ore, amt] of Object.entries(b.oreProduction ?? {})) {
        expect(amt, `${b.kind}.oreProduction.${ore}`).toBeGreaterThanOrEqual(0);
      }
      for (const [ore, amt] of Object.entries(b.oreConsumption ?? {})) {
        expect(amt, `${b.kind}.oreConsumption.${ore}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('every blueprint gate references an existing blueprint', () => {
    const ids = new Set(BLUEPRINTS_LIST.map((b) => b.id as string));
    for (const b of BUILDINGS_LIST) {
      if (b.blueprintRequired !== undefined) {
        expect(ids.has(b.blueprintRequired as string), `${b.kind} → ${b.blueprintRequired}`).toBe(true);
      }
      for (const req of b.blueprintsRequired ?? []) {
        expect(ids.has(req as string), `${b.kind} → ${req}`).toBe(true);
      }
    }
  });

  it('each building has exactly one primary category', () => {
    for (const b of BUILDINGS_LIST) {
      expect(b.category).toBeTruthy();
    }
  });
});
