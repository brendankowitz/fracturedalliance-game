/**
 * Stream E3 — difficulty wiring tests.
 *
 * Asserts that:
 *   1. createWorld stamps `world.difficulty` from opts (or 'normal' default).
 *   2. The startingResources multiplier is applied to player.credits.
 *   3. Serialize → deserialize round-trips the difficulty field.
 */

import { SCENARIO_IDS, SCENARIOS } from '@fab/content';
import { DIFFICULTY_MODIFIERS } from '@fab/domain';
import { describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../serializer/serialize';
import { createWorld } from './create';

const tutorialId = SCENARIO_IDS.tutorial;
const tutorial = SCENARIOS[tutorialId];
if (!tutorial) throw new Error('tutorial scenario missing');

describe('Stream E3 — difficulty', () => {
  it('defaults to normal when omitted', () => {
    const w = createWorld({ seed: 1, scenarioId: tutorialId, scenario: tutorial });
    expect(w.difficulty).toBe('normal');
  });

  for (const d of ['easy', 'normal', 'hard'] as const) {
    it(`stamps ${d} on the world and scales starting credits`, () => {
      const w = createWorld({
        seed: 1,
        scenarioId: tutorialId,
        scenario: tutorial,
        difficulty: d,
      });
      expect(w.difficulty).toBe(d);
      const expected = Math.round(
        tutorial.startingResources.credits * DIFFICULTY_MODIFIERS[d].startingResources,
      );
      for (const p of w.players.values()) {
        expect(p.credits, `player ${p.id} credits at ${d}`).toBe(expected);
      }
    });
  }

  it('round-trips through serializeWorld/deserializeWorld', () => {
    const w = createWorld({
      seed: 1,
      scenarioId: tutorialId,
      scenario: tutorial,
      difficulty: 'hard',
    });
    const blob = serializeWorld(w);
    const restored = deserializeWorld(blob);
    expect(restored.difficulty).toBe('hard');
  });
});
