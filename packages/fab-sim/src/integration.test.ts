import { SCENARIO_IDS, SCENARIOS } from '@fab/content';
import { describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from './serializer/serialize';
import { runTicks } from './tick';
import { TICKS_PER_SIM_DAY } from './time';
import { createWorld } from './world/create';

const tutorial = SCENARIOS[SCENARIO_IDS.tutorial];
if (!tutorial) throw new Error('tutorial scenario missing from content');

describe('integration: tutorial scenario', () => {
  it('ticks 1 200 times (1 sim-day) without throwing', () => {
    const world = createWorld({
      seed: 1234,
      scenarioId: SCENARIO_IDS.tutorial,
      scenario: tutorial,
    });
    expect(world.asteroids.size).toBe(tutorial.asteroidCount);
    expect(world.players.size).toBeGreaterThanOrEqual(1);
    runTicks(world, TICKS_PER_SIM_DAY);
    expect(world.tick).toBe(TICKS_PER_SIM_DAY);
    // At least the CPU core is still in place.
    expect(world.buildings.size).toBeGreaterThanOrEqual(1);
  });

  it('save → load → save gives byte-identical serialised output', () => {
    const w1 = createWorld({
      seed: 7,
      scenarioId: SCENARIO_IDS.tutorial,
      scenario: tutorial,
    });
    runTicks(w1, 100);
    const snap1 = JSON.stringify(serializeWorld(w1));
    const reloaded = deserializeWorld(JSON.parse(snap1));
    const snap2 = JSON.stringify(serializeWorld(reloaded));
    expect(snap2).toBe(snap1);
  });
});
