/**
 * Scenario scripted-trigger runner (spec §G).
 *
 * On each tick, walks `world.scenarioTriggers` and fires any whose `at`
 * matches `world.tick` and which haven't already fired (tracked by index in
 * `world.scenarioTriggersFired`). Effects apply directly to world state via
 * the same primitives used by the rest of the sim — `emitEvent`, mutating
 * `players`/`reputation`/`credits`, or pushing into `commandQueue` so the
 * next tick processes the synthetic command through the normal pipeline.
 *
 * Triggers are pure data; no closures live here, which keeps save/load
 * deterministic and makes it trivial for designers to author scenarios.
 */

import type { ScriptedTrigger, World } from '@fab/domain';
import { emitEvent } from './events';

const fireTrigger = (world: World, t: ScriptedTrigger): void => {
  switch (t.kind) {
    case 'spawnFleet': {
      // Push synthetic produceShip commands — one per ship — to be processed next tick.
      for (const ship of t.ships) {
        world.commandQueue.push({
          kind: 'produceShip',
          from: t.owner,
          asteroid: t.asteroid,
          ship,
        });
      }
      return;
    }
    case 'spawnMissile': {
      world.commandQueue.push({
        kind: 'launchMissile',
        from: t.owner,
        fromAsteroid: t.fromAsteroid,
        target: t.target,
        missile: t.missile as never,
      });
      return;
    }
    case 'setRelation': {
      const from = world.players.get(t.from);
      if (from) from.reputation[t.to] = t.reputation;
      return;
    }
    case 'emitEvent':
      emitEvent(world, t.event);
      return;
    case 'creditGrant': {
      const r = world.players.get(t.recipient);
      if (r) r.credits += t.credits;
      return;
    }
  }
};

export const scenarioTriggersPhase = (world: World): void => {
  const triggers = world.scenarioTriggers;
  if (!triggers || triggers.length === 0) return;
  if (!world.scenarioTriggersFired) world.scenarioTriggersFired = [];
  const fired = world.scenarioTriggersFired;
  for (let i = 0; i < triggers.length; i++) {
    if (fired.includes(i)) continue;
    const t = triggers[i];
    if (!t) continue;
    if (t.at === world.tick) {
      fireTrigger(world, t);
      fired.push(i);
    }
  }
};
