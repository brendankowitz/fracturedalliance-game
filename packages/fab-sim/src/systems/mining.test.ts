import { describe, expect, it } from 'vitest';
import { installBuilding, makeMiniWorld } from '../test-utils/worlds';
import { miningPhase } from './mining';

describe('mining.miningPhase', () => {
  it('extracts ore monotonically — deposits only decrease', () => {
    const { world, asteroidId } = makeMiniWorld({ population: 50 });
    installBuilding(world, asteroidId, 'bld.mine');
    const a = world.asteroids.get(asteroidId);
    if (!a) throw new Error('a');
    let prev = a.deposits.selenium ?? 0;
    for (let i = 0; i < 200; i++) {
      miningPhase(world);
      const cur = a.deposits.selenium ?? 0;
      expect(cur).toBeLessThanOrEqual(prev);
      prev = cur;
    }
    // Stocks credited.
    expect(a.stocks.ores.selenium ?? 0).toBeGreaterThan(0);
  });

  it('stops extracting from a depleted deposit', () => {
    const { world, asteroidId } = makeMiniWorld({ population: 50 });
    installBuilding(world, asteroidId, 'bld.mine');
    const a = world.asteroids.get(asteroidId);
    if (!a) throw new Error('a');
    a.deposits = { selenium: 0.5 }; // very thin
    for (let i = 0; i < 100; i++) miningPhase(world);
    expect(a.deposits.selenium ?? 0).toBe(0);
    expect(a.stocks.ores.selenium ?? 0).toBeLessThanOrEqual(0.5 + 1e-9);
  });

  it('does not mine on an asteroid with no population', () => {
    const { world, asteroidId } = makeMiniWorld({ population: 0 });
    installBuilding(world, asteroidId, 'bld.mine');
    const a = world.asteroids.get(asteroidId);
    if (!a) throw new Error('a');
    const before = a.deposits.selenium ?? 0;
    for (let i = 0; i < 20; i++) miningPhase(world);
    expect(a.deposits.selenium ?? 0).toBe(before);
  });
});
