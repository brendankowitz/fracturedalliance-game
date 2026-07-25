/**
 * Phase 10 — victory conditions.
 */

// biome-ignore-all lint/style/noNonNullAssertion: tests assert fixture invariants via `!` post-lookup

import { BLUEPRINTS } from '@fab/content';
import { asPlayerId, asScenarioId } from '@fab/domain';
import { describe, expect, it } from 'vitest';
import { makeMiniWorld } from '../test-utils/worlds';
import { evaluateVictory, VICTORY_CONDITION_TO_KIND, victoryPhase } from './victory';

describe('Phase 10 — victory conditions', () => {
  it('no false positive at tick 0/1', () => {
    const { world } = makeMiniWorld();
    world.tick = 0;
    victoryPhase(world);
    expect(world.outcome).toBeNull();
    world.tick = 1;
    victoryPhase(world);
    expect(world.outcome).toBeNull();
  });

  it('scientific victory triggers when all blueprints owned', () => {
    const { world, playerId } = makeMiniWorld();
    const other = asPlayerId('p.rival');
    world.players.set(other, {
      ...world.players.get(playerId)!,
      id: other,
      isHuman: false,
    });
    // Give the rival an asteroid so military victory is not a precedence short-circuit.
    const proto = world.asteroids.values().next().value!;
    const rivalAst = 'ast.rival' as never;
    world.asteroids.set(rivalAst, { ...proto, id: rivalAst, ownerId: other });
    const p = world.players.get(playerId)!;
    for (const bp of Object.keys(BLUEPRINTS)) p.blueprintsOwned.add(bp as never);
    world.tick = 100;
    const v = evaluateVictory(world);
    expect(v?.condition).toBe('scientific');
    expect(v?.player.id).toBe(playerId);
  });

  it('military victory triggers when only one player controls any asteroid', () => {
    const { world, playerId } = makeMiniWorld();
    const other = asPlayerId('p.rival');
    world.players.set(other, {
      ...world.players.get(playerId)!,
      id: other,
      isHuman: false,
    });
    world.tick = 500;
    const v = evaluateVictory(world);
    expect(v?.condition).toBe('military');
    expect(v?.player.id).toBe(playerId);
  });

  it('diplomatic victory triggers with ≥5 alliance partners', () => {
    const { world, playerId } = makeMiniWorld();
    for (let i = 0; i < 5; i++) {
      const pid = asPlayerId(`p.ally-${i}`);
      world.players.set(pid, { ...world.players.get(playerId)!, id: pid, isHuman: false });
      world.treaties.push({
        id: `treaty-${i}` as never,
        parties: [playerId, pid],
        kind: 'defensivePact',
        signedTick: 0,
      });
    }
    world.tick = 500;
    const v = evaluateVictory(world);
    expect(v?.condition).toBe('military'); // precedence: this actually still military because rivals own nothing
    // Remove the military trigger: give each rival an asteroid by reassigning ownership is excessive;
    // instead, just verify diplomatic check independently.
    const diplomaticWorld = (() => {
      const { world: w, playerId: p } = makeMiniWorld();
      for (let i = 0; i < 5; i++) {
        const pid = asPlayerId(`p.ally-${i}`);
        w.players.set(pid, { ...w.players.get(p)!, id: pid, isHuman: false });
        w.treaties.push({
          id: `treaty-${i}` as never,
          parties: [p, pid],
          kind: 'defensivePact',
          signedTick: 0,
        });
      }
      // Give each rival its own asteroid so military is NOT a last-standing victory.
      const proto = w.asteroids.values().next().value!;
      for (let i = 0; i < 5; i++) {
        const pid = asPlayerId(`p.ally-${i}`);
        const aid = `ast.rival-${i}` as never;
        w.asteroids.set(aid, { ...proto, id: aid, ownerId: pid });
      }
      w.tick = 500;
      return evaluateVictory(w);
    })();
    expect(diplomaticWorld?.condition).toBe('diplomatic');
  });

  it('Stream E6 — emits a game.over event the same tick world.outcome is set', () => {
    const { world, playerId } = makeMiniWorld();
    const other = asPlayerId('p.rival');
    world.players.set(other, { ...world.players.get(playerId)!, id: other, isHuman: false });
    world.tick = 500;
    victoryPhase(world);
    const fired = world.eventQueue.filter((e) => e.kind === 'game.over');
    expect(fired).toHaveLength(1);
    const ev = fired[0]! as Extract<(typeof fired)[number], { kind: 'game.over' }>;
    expect(ev.tick).toBe(500);
    expect(ev.winnerId).toBe(world.outcome?.winnerId);
    expect(ev.condition).toBe(world.outcome?.condition);
    // Idempotent — second call must not fire another game.over.
    victoryPhase(world);
    expect(world.eventQueue.filter((e) => e.kind === 'game.over')).toHaveLength(1);
  });

  it('victoryPhase sets world.outcome exactly once and is idempotent', () => {
    const { world, playerId } = makeMiniWorld();
    const other = asPlayerId('p.rival');
    world.players.set(other, { ...world.players.get(playerId)!, id: other, isHuman: false });
    world.tick = 500;
    victoryPhase(world);
    expect(world.outcome).not.toBeNull();
    const snap = world.outcome;
    world.tick = 600;
    victoryPhase(world);
    expect(world.outcome).toBe(snap);
  });

  // ------------------------------------------------------------------
  // P0-L1 regression — tutorial must never fire a military victory.
  // ------------------------------------------------------------------

  it('VICTORY_CONDITION_TO_KIND maps scenario labels to internal kinds', () => {
    expect(VICTORY_CONDITION_TO_KIND.corporateLoyalty).toBe('economic');
    expect(VICTORY_CONDITION_TO_KIND.independence).toBe('diplomatic');
    expect(VICTORY_CONDITION_TO_KIND.scientificSupremacy).toBe('scientific');
    expect(VICTORY_CONDITION_TO_KIND.militaryDominance).toBe('military');
    expect(VICTORY_CONDITION_TO_KIND.survivor).toBe('survival');
  });

  it('tutorial (single-seat, survivor-only) never declares military victory', () => {
    // Reproduce the P0-L1 shape: single human, one asteroid, scenarioId =
    // the live scn.tutorial. Old code fired military at tick 2; fix must
    // keep the outcome null for the whole early game.
    const { world } = makeMiniWorld();
    world.scenarioId = asScenarioId('scn.tutorial');
    for (let t = 0; t <= 10; t++) {
      world.tick = t;
      victoryPhase(world);
    }
    expect(world.outcome).toBeNull();
    // …and even far into the match it must never fire military.
    world.tick = 5_000;
    victoryPhase(world);
    expect(world.outcome?.condition).not.toBe('military');
  });

  it('scenario that does not list militaryDominance never evaluates military', () => {
    // scn.short-game only allows corporateLoyalty + survivor. Even in a
    // last-standing shape the engine must not declare a military win.
    const { world, playerId } = makeMiniWorld();
    world.scenarioId = asScenarioId('scn.short-game');
    const other = asPlayerId('p.rival');
    world.players.set(other, { ...world.players.get(playerId)!, id: other, isHuman: false });
    world.tick = 500;
    victoryPhase(world);
    expect(world.outcome).toBeNull();
  });

  it('scenario with militaryDominance does fire when the human owns all asteroids', () => {
    const { world, playerId } = makeMiniWorld();
    world.scenarioId = asScenarioId('scn.classic-skirmish');
    const other = asPlayerId('p.rival');
    world.players.set(other, { ...world.players.get(playerId)!, id: other, isHuman: false });
    world.tick = 500;
    const v = evaluateVictory(world);
    expect(v?.condition).toBe('military');
    expect(v?.player.id).toBe(playerId);
  });
});
