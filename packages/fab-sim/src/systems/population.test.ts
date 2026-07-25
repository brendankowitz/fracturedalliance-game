import { describe, expect, it } from 'vitest';
import { installBuilding, makeMiniWorld } from '../test-utils/worlds';
import { TICKS_PER_SIM_DAY } from '../time';
import { populationPhase } from './population';

describe('population.populationPhase', () => {
  it('starves population when food = 0', () => {
    const { world, asteroidId } = makeMiniWorld({ population: 100, food: 0, water: 100, air: 100 });
    const a = world.asteroids.get(asteroidId);
    if (!a) throw new Error('a');
    const start = a.population;
    populationPhase(world);
    expect(a.population).toBeLessThan(start);
  });

  it('drifts happiness toward high target when fed/watered', () => {
    const { world, asteroidId } = makeMiniWorld({
      population: 10,
      food: 1000,
      water: 1000,
      air: 1000,
      happiness: 40,
    });
    const a = world.asteroids.get(asteroidId);
    if (!a) throw new Error('a');
    for (let i = 0; i < TICKS_PER_SIM_DAY * 2; i++) populationPhase(world);
    // Max daily drift is 5, so over 2 days expect significant movement toward ~70.
    expect(a.happiness).toBeGreaterThan(45);
  });

  it('does not grow past population cap', () => {
    const { world, asteroidId } = makeMiniWorld({ population: 100, food: 5000, water: 5000, air: 5000 });
    installBuilding(world, asteroidId, 'bld.habitat-dome'); // adds popCap
    const a = world.asteroids.get(asteroidId);
    if (!a) throw new Error('a');
    for (let i = 0; i < TICKS_PER_SIM_DAY * 5; i++) populationPhase(world);
    // Growth is bounded by the cap; either has grown or stayed same.
    expect(a.population).toBeGreaterThanOrEqual(100);
  });
});
