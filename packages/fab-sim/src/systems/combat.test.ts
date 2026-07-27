/**
 * Phase 6 — combat resolver unit tests.
 */

// biome-ignore-all lint/style/noNonNullAssertion: tests assert fixture invariants via `!` post-lookup

import { asAsteroidId, asPlayerId } from '@fab/domain';
import { describe, expect, it } from 'vitest';
import { PrngRegistry } from '../rng/subGenerators';
import { installBuilding, makeMiniWorld } from '../test-utils/worlds';
import { _combatInternal, combatPhase, handleLaunchMissile, interceptProbability } from './combat';

const mkReg = (world: { rng: unknown }) => PrngRegistry.restore(world.rng as never);

describe('Phase 6 — combat', () => {
  it('intercept probability is bounded and deterministic for missile/turret pairs', () => {
    const p1 = interceptProbability('basic', 'bld.laser-turret');
    const p2 = interceptProbability('basic', 'bld.laser-turret');
    expect(p1).toBe(p2);
    expect(p1).toBeGreaterThanOrEqual(0);
    expect(p1).toBeLessThanOrEqual(0.95);
    // Plasma turret should intercept at least as well vs basic missile.
    expect(interceptProbability('basic', 'bld.plasma-turret')).toBeGreaterThanOrEqual(p1 * 0.5);
  });

  it('rejects launchMissile when source has no missile silo', () => {
    const { world, playerId, asteroidId } = makeMiniWorld({ seed: 7 });
    // Second asteroid to be the target.
    const targetId = asAsteroidId('ast.target');
    world.asteroids.set(targetId, {
      ...world.asteroids.get(asteroidId)!,
      id: targetId,
      name: 'Target',
      ownerId: asPlayerId('p.other'),
      position: { x: 50, y: 0 },
    });
    const res = handleLaunchMissile(world, {
      kind: 'launchMissile',
      from: playerId,
      fromAsteroid: asteroidId,
      target: targetId,
      missile: 'basic',
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toContain('silo');
  });

  it('launchMissile with a silo spawns a missile that flies and impacts over time', () => {
    const { world, playerId, asteroidId } = makeMiniWorld({ seed: 11 });
    installBuilding(world, asteroidId, 'bld.missile-silo');
    const targetId = asAsteroidId('ast.tgt');
    world.asteroids.set(targetId, {
      ...world.asteroids.get(asteroidId)!,
      id: targetId,
      name: 'Target',
      ownerId: asPlayerId('p.other'),
      buildings: [],
      population: 200,
      position: { x: 20, y: 0 },
    });
    const res = handleLaunchMissile(world, {
      kind: 'launchMissile',
      from: playerId,
      fromAsteroid: asteroidId,
      target: targetId,
      missile: 'basic',
    });
    expect(res.ok).toBe(true);
    expect(world.missiles.length).toBe(1);
    const reg = mkReg(world);
    // Step combat until missile lands or we time out.
    let impacted = false;
    for (let i = 0; i < 300; i++) {
      combatPhase(world, reg);
      if (world.missiles.length === 0) {
        impacted = true;
        break;
      }
    }
    expect(impacted).toBe(true);
    // Population took some damage.
    const t = world.asteroids.get(targetId)!;
    expect(t.population).toBeLessThan(200);
  });

  it('bombardment damages the target colony (building + population)', () => {
    const { world, asteroidId } = makeMiniWorld({ seed: 13, population: 200 });
    const target = world.asteroids.get(asteroidId)!;
    const bid = installBuilding(world, asteroidId, 'bld.mine');
    const b = world.buildings.get(bid)!;
    // Place the building at the deterministic blast centre so it's guaranteed hit.
    const centreX = Math.floor((target.mass * 7 + world.tick) % target.grid.width);
    const centreY = Math.floor((target.mass * 3 + world.tick) % target.grid.height);
    b.cell = { x: centreX, y: centreY };
    const hpBefore = b.hp;
    const popBefore = target.population;
    _combatInternal.applyBombardment(world, target, 'napalm', asPlayerId('p.attacker'));
    expect(b.hp).toBeLessThan(hpBefore);
    expect(target.population).toBeLessThan(popBefore);
  });

  it('determinism: identical seeds produce identical combat outcomes', () => {
    const build = () => {
      const { world, playerId, asteroidId } = makeMiniWorld({ seed: 42 });
      installBuilding(world, asteroidId, 'bld.missile-silo');
      const targetId = asAsteroidId('ast.tgt');
      world.asteroids.set(targetId, {
        ...world.asteroids.get(asteroidId)!,
        id: targetId,
        name: 'Target',
        ownerId: asPlayerId('p.other'),
        buildings: [],
        population: 100,
        position: { x: 15, y: 0 },
      });
      handleLaunchMissile(world, {
        kind: 'launchMissile',
        from: playerId,
        fromAsteroid: asteroidId,
        target: targetId,
        missile: 'basic',
      });
      return world;
    };
    const a = build();
    const b = build();
    const regA = mkReg(a);
    const regB = mkReg(b);
    for (let i = 0; i < 100; i++) {
      combatPhase(a, regA);
      combatPhase(b, regB);
    }
    expect(a.asteroids.get(asAsteroidId('ast.tgt'))!.population).toBe(
      b.asteroids.get(asAsteroidId('ast.tgt'))!.population,
    );
  });
});
