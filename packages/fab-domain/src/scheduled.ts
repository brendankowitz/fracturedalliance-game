import type { GameEvent } from './events';

/**
 * A `GameEvent` whose delivery is deferred until `triggerTick`. Held in
 * `World.scheduledEvents` (priority-ordered by `triggerTick` ascending) and
 * drained by the `eventPhase` of the tick pipeline.
 */
export interface ScheduledEvent {
  triggerTick: number;
  event: GameEvent;
}
