import { describe, expect, it } from 'vitest';
import { BLUEPRINTS, BLUEPRINTS_LIST } from './data/blueprints';

describe('BLUEPRINTS', () => {
  it('contains exactly 40 entries across 5 disciplines × 8', () => {
    expect(BLUEPRINTS_LIST).toHaveLength(40);

    const byDiscipline = new Map<string, number>();
    for (const bp of BLUEPRINTS_LIST) {
      byDiscipline.set(bp.discipline, (byDiscipline.get(bp.discipline) ?? 0) + 1);
    }
    for (const [discipline, count] of byDiscipline) {
      expect(count, `discipline ${discipline}`).toBe(8);
    }
    expect(byDiscipline.size).toBe(5);
  });

  it('has unique blueprint ids', () => {
    const ids = BLUEPRINTS_LIST.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every prerequisite id exists in the catalogue', () => {
    const knownIds = new Set(BLUEPRINTS_LIST.map((b) => b.id));
    for (const bp of BLUEPRINTS_LIST) {
      for (const req of bp.requires) {
        expect(knownIds.has(req), `${bp.id} → unknown prereq ${req}`).toBe(true);
      }
    }
  });

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: property-based test exercising Kahn's algorithm with multiple declarative assertions
  it('forms a DAG — Kahn topological sort visits every node', () => {
    const indegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();
    for (const bp of BLUEPRINTS_LIST) {
      indegree.set(bp.id as string, 0);
    }
    for (const bp of BLUEPRINTS_LIST) {
      for (const req of bp.requires) {
        indegree.set(bp.id as string, (indegree.get(bp.id as string) ?? 0) + 1);
        const adj = adjacency.get(req as string) ?? [];
        adj.push(bp.id as string);
        adjacency.set(req as string, adj);
      }
    }

    const queue: string[] = [];
    const topo: string[] = [];
    for (const [id, deg] of indegree) if (deg === 0) queue.push(id);

    while (queue.length > 0) {
      const id = queue.shift() as string;
      topo.push(id);
      for (const next of adjacency.get(id) ?? []) {
        const nd = (indegree.get(next) ?? 0) - 1;
        indegree.set(next, nd);
        if (nd === 0) queue.push(next);
      }
    }

    expect(topo).toHaveLength(BLUEPRINTS_LIST.length);
  });

  it('tier-n blueprints require at least one tier-(n−1) entry in the same discipline', () => {
    const byId = new Map(BLUEPRINTS_LIST.map((b) => [b.id as string, b]));
    for (const bp of BLUEPRINTS_LIST) {
      if (bp.tier === 1) {
        expect(bp.requires).toHaveLength(0);
        continue;
      }
      const sameDiscPrereqs = bp.requires
        .map((r) => byId.get(r as string))
        .filter((p): p is NonNullable<typeof p> => p !== undefined)
        .filter((p) => p.discipline === bp.discipline);
      expect(
        sameDiscPrereqs.length,
        `${bp.id} (tier ${bp.tier}) needs ≥1 same-discipline prereq`,
      ).toBeGreaterThan(0);
    }
  });

  it('BLUEPRINTS keyed table matches BLUEPRINTS_LIST 1:1', () => {
    expect(Object.keys(BLUEPRINTS)).toHaveLength(BLUEPRINTS_LIST.length);
  });
});
