import { describe, expect, it } from 'vitest';
import { makeMiniWorld } from '../test-utils/worlds';
import { buildQueuePhase, cancelBuild, enqueueBuilding } from './buildQueue';

describe('buildQueue', () => {
  it('enqueues a valid build and deducts credits', () => {
    const { world, asteroidId, playerId } = makeMiniWorld({ credits: 10_000 });
    const player = world.players.get(playerId);
    if (!player) throw new Error('p');
    const before = player.credits;
    const r = enqueueBuilding(
      world,
      { kind: 'queueBuild', asteroid: asteroidId, building: 'bld.mine', cell: { x: 1, y: 1 } },
      playerId,
    );
    expect(r.ok).toBe(true);
    expect(player.credits).toBeLessThan(before);
    const a = world.asteroids.get(asteroidId);
    if (!a) throw new Error('a');
    expect(a.buildQueue).toHaveLength(1);
  });

  it('rejects a build when credits are insufficient', () => {
    const { world, asteroidId, playerId } = makeMiniWorld({ credits: 1 });
    const r = enqueueBuilding(
      world,
      { kind: 'queueBuild', asteroid: asteroidId, building: 'bld.mine', cell: { x: 1, y: 1 } },
      playerId,
    );
    expect(r.ok).toBe(false);
  });

  it('completes a building after buildTimeTicks and instantiates it', () => {
    const { world, asteroidId, playerId } = makeMiniWorld({ credits: 10_000 });
    enqueueBuilding(
      world,
      { kind: 'queueBuild', asteroid: asteroidId, building: 'bld.mine', cell: { x: 0, y: 0 } },
      playerId,
    );
    const a = world.asteroids.get(asteroidId);
    if (!a) throw new Error('a');
    const total = a.buildQueue[0]?.totalTicks ?? 0;
    expect(total).toBeGreaterThan(0);
    for (let i = 0; i < total - 1; i++) buildQueuePhase(world);
    expect(a.buildQueue).toHaveLength(1);
    buildQueuePhase(world); // the finishing tick
    expect(a.buildQueue).toHaveLength(0);
    // One building installed.
    const mines = [...world.buildings.values()].filter((b) => b.defKind === 'bld.mine');
    expect(mines).toHaveLength(1);
    expect(world.eventQueue.some((e) => e.kind === 'buildQueue.completed')).toBe(true);
  });

  it('cancels a build and refunds half the remaining cost', () => {
    const { world, asteroidId, playerId } = makeMiniWorld({ credits: 10_000 });
    const player = world.players.get(playerId);
    if (!player) throw new Error('p');
    enqueueBuilding(
      world,
      { kind: 'queueBuild', asteroid: asteroidId, building: 'bld.mine', cell: { x: 0, y: 0 } },
      playerId,
    );
    const afterDeduct = player.credits;
    const r = cancelBuild(world, { kind: 'cancelBuild', asteroid: asteroidId, index: 0 }, playerId);
    expect(r.ok).toBe(true);
    // Refund should be (approximately) half the paid cost because progress=0.
    expect(player.credits).toBeGreaterThan(afterDeduct);
    const a = world.asteroids.get(asteroidId);
    if (!a) throw new Error('a');
    expect(a.buildQueue).toHaveLength(0);
  });
});
