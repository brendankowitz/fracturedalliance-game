import { describe, expect, it } from 'vitest';
import { installBuilding, makeMiniWorld } from '../test-utils/worlds';
import { TICKS_PER_SIM_DAY } from '../time';
import { productionPhase } from './economy';

describe('economy.productionPhase', () => {
  it('drains food/water/air from population when no life support is present', () => {
    const { world, asteroidId } = makeMiniWorld({ population: 100, food: 100, water: 100, air: 100 });
    productionPhase(world);
    const a = world.asteroids.get(asteroidId);
    expect(a).toBeDefined();
    if (!a) return;
    // 100 pop × 0.5 food/day / 1200 ticks ≈ 0.0417/tick
    expect(a.stocks.food).toBeLessThan(100);
    expect(a.stocks.water).toBeLessThan(100);
    expect(a.stocks.air).toBeLessThan(100);
  });

  it('hydroponics offsets food consumption', () => {
    const { world, asteroidId } = makeMiniWorld({ population: 10, food: 0 });
    installBuilding(world, asteroidId, 'bld.hydroponics-farm');
    productionPhase(world);
    const a = world.asteroids.get(asteroidId);
    if (!a) throw new Error('asteroid missing');
    // Hydroponics produces more food per day than 10 people consume.
    expect(a.stocks.food).toBeGreaterThan(0);
  });

  it('emits a resource.deficit event once on food edge-cross', () => {
    const { world, asteroidId } = makeMiniWorld({ population: 1000, food: 0.001 });
    // Ensure a negative delta pushes stock from >0 to 0.
    productionPhase(world);
    const a = world.asteroids.get(asteroidId);
    if (!a) throw new Error('asteroid missing');
    expect(a.stocks.food).toBe(0);
    const deficits = world.eventQueue.filter((e) => e.kind === 'resource.deficit' && e.resource === 'food');
    expect(deficits).toHaveLength(1);

    // Running again should not re-emit — stock already at 0.
    productionPhase(world);
    const after = world.eventQueue.filter((e) => e.kind === 'resource.deficit' && e.resource === 'food');
    expect(after).toHaveLength(1);
  });

  it('credits production accumulates per tick for active buildings', () => {
    const { world, playerId, asteroidId } = makeMiniWorld({ population: 0 });
    installBuilding(world, asteroidId, 'bld.market');
    const player = world.players.get(playerId);
    if (!player) throw new Error('player missing');
    const start = player.credits;
    for (let i = 0; i < TICKS_PER_SIM_DAY; i++) productionPhase(world);
    expect(player.credits).toBeGreaterThan(start - 1000); // allow for upkeep
    expect(player.totalCreditsEarned).toBeGreaterThan(0);
  });
});
