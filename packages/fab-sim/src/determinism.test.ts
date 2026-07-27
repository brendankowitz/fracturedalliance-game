import { SCENARIO_IDS, SCENARIOS } from '@fab/content';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { serializeWorld } from './serializer/serialize';
import { runTicks } from './tick';
import { createWorld } from './world/create';

const tutorial = SCENARIOS[SCENARIO_IDS.tutorial];
if (!tutorial) throw new Error('tutorial scenario missing from content');

describe('determinism', () => {
  it('same seed ⇒ byte-identical serialisation after N ticks', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100_000 }), fc.integer({ min: 1, max: 500 }), (seed, ticks) => {
        const a = createWorld({
          seed,
          scenarioId: SCENARIO_IDS.tutorial,
          scenario: tutorial,
        });
        const b = createWorld({
          seed,
          scenarioId: SCENARIO_IDS.tutorial,
          scenario: tutorial,
        });
        runTicks(a, ticks);
        runTicks(b, ticks);
        return JSON.stringify(serializeWorld(a)) === JSON.stringify(serializeWorld(b));
      }),
      { numRuns: 20 },
    );
  });

  it('different seeds diverge (smoke test — not asserted deterministically)', () => {
    const a = createWorld({
      seed: 1,
      scenarioId: SCENARIO_IDS.tutorial,
      scenario: tutorial,
    });
    const b = createWorld({
      seed: 2,
      scenarioId: SCENARIO_IDS.tutorial,
      scenario: tutorial,
    });
    runTicks(a, 100);
    runTicks(b, 100);
    const pa = JSON.stringify(a.market.current);
    const pb = JSON.stringify(b.market.current);
    expect(pa).not.toBe(pb);
  });
});
