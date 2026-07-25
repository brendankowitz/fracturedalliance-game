/**
 * opus Stage-1 delta — tests for the issueShipOrder handler.
 */

import type { Asteroid, AsteroidId, Ship, ShipId } from '@fab/domain';
import { asAsteroidId, asShipId } from '@fab/domain';
import { describe, expect, it } from 'vitest';
import { makeMiniWorld } from '../test-utils/worlds';
import { applyCommand } from './commands';
import { runTicks } from '../tick';

const addRock = (
  world: ReturnType<typeof makeMiniWorld>['world'],
  position: { x: number; y: number },
): AsteroidId => {
  const id = asAsteroidId('ast.dock-target');
  const rock: Asteroid = {
    id,
    name: 'Dock Target',
    ownerId: null,
    sector: { x: 1, y: 0 },
    position,
    velocity: { x: 0, y: 0 },
    course: null,
    mass: 2,
    sizeClass: 'M',
    grid: { width: 7, height: 7 },
    deposits: { selenium: 100 },
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

const addScout = (world: ReturnType<typeof makeMiniWorld>['world'], ownerId: string): ShipId => {
  const id = asShipId('ship.order-test');
  const scout: Ship = {
    id,
    defKind: 'scout',
    ownerId: ownerId as Ship['ownerId'],
    hullHp: 20,
    shieldHp: 5,
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    order: { kind: 'idle' },
    cargo: {},
    hardpoints: [],
  };
  world.ships.set(id, scout);
  return id;
};

describe('issueShipOrder', () => {
  it('assigns a dock order and the ship travels to the target over ticks', () => {
    const { world, playerId } = makeMiniWorld();
    const rockId = addRock(world, { x: 40, y: 0 });
    const shipId = addScout(world, playerId);

    applyCommand(world, {
      kind: 'issueShipOrder',
      ship: shipId,
      order: { kind: 'dock', target: rockId },
    });
    expect(world.ships.get(shipId)?.order.kind).toBe('dock');

    runTicks(world, 400);

    const ship = world.ships.get(shipId);
    const rock = world.asteroids.get(rockId);
    expect(ship).toBeDefined();
    if (!ship || !rock) return;
    const dist = Math.hypot(ship.position.x - rock.position.x, ship.position.y - rock.position.y);
    expect(dist).toBeLessThan(2);
    expect(rock.inOrbit).toContain(shipId);
  });

  it('rejects unsupported order kinds', () => {
    const { world, playerId, asteroidId } = makeMiniWorld();
    const shipId = addScout(world, playerId);

    applyCommand(world, {
      kind: 'issueShipOrder',
      ship: shipId,
      order: { kind: 'trade', target: asteroidId, payload: {} },
    });

    expect(world.ships.get(shipId)?.order.kind).toBe('idle');
    expect(world.eventQueue.some((e) => e.kind === 'command.rejected')).toBe(true);
  });

  it('rejects orders for missing ships', () => {
    const { world } = makeMiniWorld();
    applyCommand(world, {
      kind: 'issueShipOrder',
      ship: asShipId('ship.ghost'),
      order: { kind: 'idle' },
    });
    expect(world.eventQueue.some((e) => e.kind === 'command.rejected')).toBe(true);
  });
});
