import { describe, expect, it } from 'vitest';
import { makeMiniWorld } from '../test-utils/worlds';
import { emitEvent, eventPhase, scheduleEvent } from './events';

describe('events', () => {
  it('emitEvent appends to the outbound queue', () => {
    const { world, asteroidId } = makeMiniWorld();
    emitEvent(world, {
      kind: 'trader.arrived',
      severity: 'grey',
      asteroidId,
      tick: 0,
    });
    expect(world.eventQueue).toHaveLength(1);
  });

  it('scheduleEvent stores in tick order and eventPhase pops when due', () => {
    const { world, asteroidId } = makeMiniWorld();
    scheduleEvent(world, 5, { kind: 'trader.arrived', severity: 'grey', asteroidId, tick: 5 });
    scheduleEvent(world, 2, { kind: 'trader.arrived', severity: 'grey', asteroidId, tick: 2 });
    scheduleEvent(world, 3, { kind: 'trader.arrived', severity: 'grey', asteroidId, tick: 3 });
    // Sorted ascending by triggerTick.
    const ticks = world.scheduledEvents.map((s) => s.triggerTick);
    expect(ticks).toEqual([...ticks].sort((a, b) => a - b));

    world.tick = 2;
    eventPhase(world);
    expect(world.eventQueue).toHaveLength(1);
    world.tick = 4;
    eventPhase(world);
    expect(world.eventQueue).toHaveLength(2);
    world.tick = 10;
    eventPhase(world);
    expect(world.eventQueue).toHaveLength(3);
    expect(world.scheduledEvents).toHaveLength(0);
  });
});
