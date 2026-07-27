/**
 * opus Stage-1 delta — tests for the settleAsteroid command port.
 */

import type { Asteroid, AsteroidId, Ship, ShipId } from '@fab/domain';
import { asAsteroidId, asShipId } from '@fab/domain';
import { describe, expect, it } from 'vitest';
import { makeMiniWorld } from '../test-utils/worlds';
import { applyCommand } from './commands';
import { SETTLE_COST, SETTLE_RADIUS } from './settlement';

const addUnownedRock = (world: ReturnType<typeof makeMiniWorld>['world']): AsteroidId => {
  const id = asAsteroidId('ast.unowned');
  const rock: Asteroid = {
    id,
    name: 'Unowned Rock',
    ownerId: null,
    sector: { x: 3, y: 3 },
    position: { x: 30, y: 30 },
    velocity: { x: 0, y: 0 },
    course: null,
    mass: 2,
    sizeClass: 'M',
    grid: { width: 7, height: 7 },
    deposits: { selenium: 400 },
    radiation: 0,
    stability: 100,
    happiness: 50,
    population: 0,
    stocks: { food: 0, water: 0, air: 0, ores: {} },
    buildings: [],
    buildQueue: [],
    inOrbit: [],
    engines: { count: 0, destination: null, etaTick: null, announcedToAll: false },
  };
  world.asteroids.set(id, rock);
  return id;
};

const addScout = (
  world: ReturnType<typeof makeMiniWorld>['world'],
  ownerId: string,
  position: { x: number; y: number },
): ShipId => {
  const id = asShipId('ship.scout-test');
  const scout: Ship = {
    id,
    defKind: 'scout',
    ownerId: ownerId as Ship['ownerId'],
    hullHp: 20,
    shieldHp: 5,
    position,
    velocity: { x: 0, y: 0 },
    order: { kind: 'idle' },
    cargo: {},
    hardpoints: [],
  };
  world.ships.set(id, scout);
  return id;
};

describe('settleAsteroid', () => {
  it('claims an unowned asteroid with a scout in range, deducts credits, installs a CPU core', () => {
    const { world, playerId } = makeMiniWorld({ credits: 10_000 });
    const rockId = addUnownedRock(world);
    addScout(world, playerId, { x: 30 + SETTLE_RADIUS - 1, y: 30 });

    applyCommand(world, { kind: 'settleAsteroid', from: playerId, asteroid: rockId });

    const rock = world.asteroids.get(rockId);
    expect(rock?.ownerId).toBe(playerId);
    expect(world.players.get(playerId)?.credits).toBe(10_000 - SETTLE_COST);
    const kinds = rock?.buildings.map((bid) => world.buildings.get(bid)?.defKind);
    expect(kinds).toContain('bld.cpu-core');
    expect(world.eventQueue.some((e) => e.kind === 'asteroid.settled')).toBe(true);
  });

  it('rejects when no scout is in range', () => {
    const { world, playerId } = makeMiniWorld({ credits: 10_000 });
    const rockId = addUnownedRock(world);
    addScout(world, playerId, { x: 30 + SETTLE_RADIUS + 50, y: 30 });

    applyCommand(world, { kind: 'settleAsteroid', from: playerId, asteroid: rockId });

    expect(world.asteroids.get(rockId)?.ownerId).toBeNull();
    expect(world.players.get(playerId)?.credits).toBe(10_000);
    expect(world.eventQueue.some((e) => e.kind === 'command.rejected')).toBe(true);
  });

  it('rejects when credits are insufficient', () => {
    const { world, playerId } = makeMiniWorld({ credits: SETTLE_COST - 1 });
    const rockId = addUnownedRock(world);
    addScout(world, playerId, { x: 30, y: 30 });

    applyCommand(world, { kind: 'settleAsteroid', from: playerId, asteroid: rockId });

    expect(world.asteroids.get(rockId)?.ownerId).toBeNull();
  });

  it('rejects when the asteroid is already owned', () => {
    const { world, playerId, asteroidId } = makeMiniWorld({ credits: 10_000 });
    addScout(world, playerId, { x: 0, y: 0 });

    applyCommand(world, { kind: 'settleAsteroid', from: playerId, asteroid: asteroidId });

    expect(world.eventQueue.some((e) => e.kind === 'command.rejected')).toBe(true);
    expect(world.players.get(playerId)?.credits).toBe(10_000);
  });
});
