/**
 * Event system.
 *
 * Two pipes:
 *   • `world.scheduledEvents` — queued events that fire at a future tick
 *     (ordered insertion-sorted by `triggerTick`).
 *   • `world.eventQueue`      — the outbound notification feed that UI
 *     consumers read. This is the "bus"; it grows unbounded across a
 *     match and is truncated by the UI when it renders.
 *
 * All routines are pure functions that mutate the world in place and
 * never consult wall-clock time.
 */

import type { GameEvent, ScheduledEvent, World } from '@fab/domain';

/** Push an event directly into the outbound feed (equivalent to trigger-now). */
export const emitEvent = (world: World, event: GameEvent): void => {
  world.eventQueue.push(event);
};

/**
 * Schedule `event` to be emitted after `delayTicks` have elapsed. Inserted
 * in tick order so the `eventPhase` can short-circuit on the first
 * not-yet-due entry.
 */
export const scheduleEvent = (world: World, delayTicks: number, event: GameEvent): void => {
  const triggerTick = world.tick + Math.max(0, Math.floor(delayTicks));
  const entry: ScheduledEvent = { triggerTick, event };
  // Insertion sort — scheduledEvents is usually short (<100).
  const queue = world.scheduledEvents;
  let i = queue.length;
  while (i > 0) {
    const prev = queue[i - 1];
    if (prev && prev.triggerTick <= triggerTick) break;
    i--;
  }
  queue.splice(i, 0, entry);
};

/**
 * Drain any scheduled events whose `triggerTick` has elapsed. Must be
 * called after `world.tick` has already been incremented for the current
 * frame. Since the queue is sorted ascending, we pop from the front.
 */
export const eventPhase = (world: World): void => {
  const q = world.scheduledEvents;
  while (q.length > 0) {
    const head = q[0];
    if (!head || head.triggerTick > world.tick) break;
    world.eventQueue.push(head.event);
    q.shift();
  }
};
