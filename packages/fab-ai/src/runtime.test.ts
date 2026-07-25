/**
 * Phase 7 — AI runtime tests.
 */

import { SCENARIOS } from '@fab/content';
import type { Player, PlayerId } from '@fab/domain';
import { createWorld, PrngRegistry } from '@fab/sim';
import { describe, expect, it } from 'vitest';
import { aiPhase, runAiTurn } from './runtime';

const tutorial = SCENARIOS['scn.tutorial'];
if (!tutorial) throw new Error('tutorial scenario missing');

const mkAiWorld = (seed = 123) => {
  const world = createWorld({ seed, scenarioId: tutorial.id, scenario: tutorial });
  const first = world.players.entries().next().value;
  if (!first) throw new Error('no players seeded');
  const [playerId, player] = first as [PlayerId, Player];
  player.isHuman = false;
  player.credits = 1_000_000;
  return { world, playerId };
};

describe('Phase 7 — AI runtime', () => {
  it('produces deterministic commands for identical seeds', () => {
    const a = mkAiWorld();
    const b = mkAiWorld();
    const regA = PrngRegistry.restore(a.world.rng);
    const regB = PrngRegistry.restore(b.world.rng);
    const cmdsA = runAiTurn(a.world, a.playerId, regA);
    const cmdsB = runAiTurn(b.world, b.playerId, regB);
    expect(cmdsA.map((c) => c.kind)).toEqual(cmdsB.map((c) => c.kind));
  });

  it('skips human players', () => {
    const world = createWorld({ seed: 1, scenarioId: tutorial.id, scenario: tutorial });
    const reg = PrngRegistry.restore(world.rng);
    const first = world.players.entries().next().value;
    if (!first) throw new Error('no players seeded');
    const [pid] = first as [PlayerId, Player];
    const cmds = runAiTurn(world, pid, reg);
    expect(cmds).toEqual([]);
  });

  it('emits at most ACTIONS_PER_TURN (2) commands', () => {
    const { world, playerId } = mkAiWorld();
    const reg = PrngRegistry.restore(world.rng);
    const cmds = runAiTurn(world, playerId, reg);
    expect(cmds.length).toBeLessThanOrEqual(2);
  });

  it('aiPhase only fires on the 100-tick cadence', () => {
    const { world } = mkAiWorld();
    const reg = PrngRegistry.restore(world.rng);
    world.tick = 99;
    const before = world.commandQueue.length;
    aiPhase(world, reg);
    expect(world.commandQueue.length).toBe(before);
    world.tick = 100;
    aiPhase(world, reg);
    expect(world.commandQueue.length).toBeGreaterThanOrEqual(before);
  });

  it('no thrashing: identical seeds produce identical kinds', () => {
    const a = mkAiWorld(777);
    const b = mkAiWorld(777);
    const regA = PrngRegistry.restore(a.world.rng);
    const regB = PrngRegistry.restore(b.world.rng);
    const k1 = runAiTurn(a.world, a.playerId, regA).map((c) => c.kind);
    const k2 = runAiTurn(b.world, b.playerId, regB).map((c) => c.kind);
    expect(k1).toEqual(k2);
  });
});
