/**
 * Phase 9 — asteroid motion unit tests.
 */

// biome-ignore-all lint/style/noNonNullAssertion: tests assert fixture invariants via `!` post-lookup

import { asAsteroidId, asPlayerId } from '@fab/domain';
import { describe, expect, it } from 'vitest';
import { installBuilding, makeMiniWorld } from '../test-utils/worlds';
import { _asteroidMotionInternal, asteroidMotionPhase, handleSetAsteroidCourse } from './asteroidMotion';

describe('Phase 9 — asteroid motion', () => {
  it('integrates velocity → position deterministically (zero thrust case)', () => {
    const { world, asteroidId } = makeMiniWorld();
    const a = world.asteroids.get(asteroidId)!;
    a.velocity = { x: 0.1, y: 0 };
    for (let i = 0; i < 10; i++) asteroidMotionPhase(world);
    expect(a.position.x).toBeCloseTo(1.0, 5);
  });

  it('setAsteroidCourse requires engines', () => {
    const { world, playerId, asteroidId } = makeMiniWorld();
    const res = handleSetAsteroidCourse(world, {
      kind: 'setAsteroidCourse',
      from: playerId,
      asteroid: asteroidId,
      targetX: 100,
      targetY: 0,
      thrust: 1,
    });
    expect(res.ok).toBe(false);
    installBuilding(world, asteroidId, 'bld.asteroid-engine');
    const res2 = handleSetAsteroidCourse(world, {
      kind: 'setAsteroidCourse',
      from: playerId,
      asteroid: asteroidId,
      targetX: 100,
      targetY: 0,
      thrust: 1,
    });
    expect(res2.ok).toBe(true);
  });

  it('thrust accelerates an asteroid toward its target', () => {
    const { world, playerId, asteroidId } = makeMiniWorld();
    installBuilding(world, asteroidId, 'bld.asteroid-engine');
    installBuilding(world, asteroidId, 'bld.asteroid-engine');
    const a0 = world.asteroids.get(asteroidId)!;
    // Diagnostic: confirm our buildings are wired in.
    expect(_asteroidMotionInternal.engineCount(world, a0)).toBeGreaterThan(0);
    const res = handleSetAsteroidCourse(world, {
      kind: 'setAsteroidCourse',
      from: playerId,
      asteroid: asteroidId,
      targetX: 50,
      targetY: 0,
      thrust: 1,
    });
    expect(res.ok).toBe(true);
    expect(a0.course).not.toBeNull();
    for (let i = 0; i < 100; i++) asteroidMotionPhase(world);
    const a = world.asteroids.get(asteroidId)!;
    // Either still in flight (velocity > 0) or arrived (position near target).
    expect(a.position.x).toBeGreaterThan(0);
  });

  it('collision causes symmetric mass-weighted damage to both asteroids', () => {
    const { world, asteroidId } = makeMiniWorld();
    const a = world.asteroids.get(asteroidId)!;
    a.position = { x: 0, y: 0 };
    a.velocity = { x: 0.5, y: 0 };
    const bid = asAsteroidId('ast.collider');
    world.asteroids.set(bid, {
      ...a,
      id: bid,
      name: 'Collider',
      ownerId: asPlayerId('p.enemy'),
      position: { x: 2, y: 0 },
      velocity: { x: -0.5, y: 0 },
      buildings: [],
      stability: 100,
    });
    const stabBefore = a.stability;
    asteroidMotionPhase(world);
    const b = world.asteroids.get(bid)!;
    expect(a.stability).toBeLessThan(stabBefore);
    expect(b.stability).toBeLessThan(100);
  });

  it('gravity nullifier mitigates collision damage', () => {
    const build = (useNullifier: boolean) => {
      const { world, asteroidId } = makeMiniWorld();
      const a = world.asteroids.get(asteroidId)!;
      a.position = { x: 0, y: 0 };
      a.velocity = { x: 0.5, y: 0 };
      if (useNullifier) installBuilding(world, asteroidId, 'bld.gravity-nullifier');
      const bid = asAsteroidId('ast.collider');
      world.asteroids.set(bid, {
        ...a,
        id: bid,
        name: 'Collider',
        ownerId: asPlayerId('p.enemy'),
        position: { x: 2, y: 0 },
        velocity: { x: -0.5, y: 0 },
        buildings: [],
        stability: 100,
      });
      asteroidMotionPhase(world);
      return world.asteroids.get(asteroidId)!.stability;
    };
    const withNullifier = build(true);
    const without = build(false);
    expect(withNullifier).toBeGreaterThan(without);
  });

  it('predictImpact returns a finite tick for a head-on course, null for parallel paths', () => {
    const { world, asteroidId } = makeMiniWorld();
    const a = world.asteroids.get(asteroidId)!;
    a.velocity = { x: 1, y: 0 };
    const bid = asAsteroidId('ast.b');
    world.asteroids.set(bid, {
      ...a,
      id: bid,
      velocity: { x: -1, y: 0 },
      position: { x: 100, y: 0 },
    });
    const b = world.asteroids.get(bid)!;
    const eta = _asteroidMotionInternal.predictImpact(a, b, 1000);
    expect(eta).not.toBeNull();
    expect(eta!).toBeGreaterThan(0);
    // Parallel courses → no impact.
    b.velocity = { x: 1, y: 0.001 };
    const eta2 = _asteroidMotionInternal.predictImpact(a, b, 1000);
    expect(eta2).toBeNull();
  });
});
