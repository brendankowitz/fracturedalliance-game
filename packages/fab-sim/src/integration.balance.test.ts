import { SCENARIO_IDS, SCENARIOS } from '@fab/content';
import { describe, expect, it } from 'vitest';
import { runTicks } from './tick';
import { createWorld } from './world/create';

/**
 * Stream E2 — passive-survival smoke tests. With the life-support
 * buildings seeded by `installLifeSupport()` and the lifted starting
 * stocks, a colony with no AI driver and no human input should keep
 * its population alive for at least the listed horizon. These are
 * intentionally lightweight — they only assert *no starvation* — and
 * are meant to catch regressions where someone disables the seeding
 * or shrinks the starter() bag again.
 */
describe('Stream E2 — passive-survival balance', () => {
  const cases: ReadonlyArray<{
    label: string;
    scenarioId: keyof typeof SCENARIO_IDS;
    minTicks: number;
  }> = [
    { label: 'tutorial', scenarioId: 'tutorial', minTicks: 8000 },
    { label: 'classic-skirmish', scenarioId: 'classicSkirmish', minTicks: 4000 },
    { label: 'federation-war', scenarioId: 'federationWar', minTicks: 4000 },
  ];

  for (const c of cases) {
    it(`${c.label}: no colony.starved within ${c.minTicks} ticks`, () => {
      const id = SCENARIO_IDS[c.scenarioId];
      const scenario = SCENARIOS[id];
      if (!scenario) throw new Error(`scenario ${id} missing from content`);
      const world = createWorld({ scenario, scenarioId: id, seed: 0xba1a });
      runTicks(world, c.minTicks);

      const starvations = world.eventQueue.filter((e) => e.kind === 'colony.starved');
      expect(starvations).toHaveLength(0);

      // Every starting colony should still have non-zero pop.
      for (const a of world.asteroids.values()) {
        if (a.ownerId === null) continue;
        expect(a.population, `colony ${a.id} (owner ${a.ownerId}) lost its population`).toBeGreaterThan(0);
      }
    });
  }
});
