/**
 * Scripted Triggers — designer-authored scenario hooks (spec §G).
 *
 * A discriminated-union DSL describing one-shot or recurring side-effects
 * keyed to a tick. Encoded as plain data so triggers serialise cleanly and
 * are deterministic across save/load. The sim's `scenarioTriggersPhase`
 * evaluates the list each tick; fired triggers are recorded on World so
 * they don't re-fire after a reload.
 *
 * The DSL is intentionally narrow — anything richer should ship as a
 * first-class system rather than escape-hatching here.
 */

import type { GameEvent } from './events';
import type { AsteroidId, PlayerId } from './ids';
import type { ShipKind } from './ship';

export type ScriptedTrigger =
  | { kind: 'spawnFleet'; at: number; owner: PlayerId; asteroid: AsteroidId; ships: readonly ShipKind[] }
  | {
      kind: 'spawnMissile';
      at: number;
      owner: PlayerId;
      fromAsteroid: AsteroidId;
      target: AsteroidId;
      missile: string;
    }
  | {
      kind: 'setRelation';
      at: number;
      from: PlayerId;
      to: PlayerId;
      reputation: number;
    }
  | { kind: 'emitEvent'; at: number; event: GameEvent }
  | { kind: 'creditGrant'; at: number; recipient: PlayerId; credits: number };

/** Identity used to track which triggers have fired (index into the array). */
export type FiredTriggerKey = number;
