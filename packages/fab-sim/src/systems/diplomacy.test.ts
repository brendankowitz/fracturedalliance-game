/**
 * Phase 8 — diplomacy unit tests.
 */

import { asPlayerId, type World } from '@fab/domain';
import { describe, expect, it } from 'vitest';
import { makeMiniWorld } from '../test-utils/worlds';
import {
  adjustReputation,
  diplomacyPhase,
  findTreaty,
  getReputation,
  handleBreakTreaty,
  handleDeclareWar,
  handleProposeTreaty,
} from './diplomacy';

const seedSecondPlayer = (world: World, id = 'p.other', raceId = 'achar', isHuman = false) => {
  const pid = asPlayerId(id);
  world.players.set(pid, {
    id: pid,
    raceId,
    isHuman,
    credits: 10_000,
    reputation: {},
    federationStanding: 0,
    blueprintsOwned: new Set(),
    eventLog: [],
    alive: true,
    suspicion: 0,
    activeResearch: null,
    marketOrders: [],
    totalCreditsEarned: 0,
    economicControlTicks: 0,
  });
  return pid;
};

describe('Phase 8 — diplomacy', () => {
  it('reputation adjust + clamp', () => {
    const { world, playerId } = makeMiniWorld();
    const other = seedSecondPlayer(world);
    adjustReputation(world, playerId, other, 50);
    expect(getReputation(world, playerId, other)).toBe(50);
    adjustReputation(world, playerId, other, 200);
    expect(getReputation(world, playerId, other)).toBe(100);
    adjustReputation(world, playerId, other, -500);
    expect(getReputation(world, playerId, other)).toBe(-100);
  });

  it('reputation drifts toward zero each tick', () => {
    const { world, playerId } = makeMiniWorld();
    const other = seedSecondPlayer(world);
    adjustReputation(world, playerId, other, 10);
    for (let i = 0; i < 50; i++) diplomacyPhase(world);
    const r = getReputation(world, playerId, other);
    expect(r).toBeLessThan(10);
    expect(r).toBeGreaterThan(0);
  });

  it('proposeTreaty with friendly AI signs on acceptance', () => {
    const { world, playerId } = makeMiniWorld();
    const other = seedSecondPlayer(world, 'p.other', 'achar', false);
    // Boost reputation so AI accepts.
    adjustReputation(world, other, playerId, 100);
    const res = handleProposeTreaty(world, {
      kind: 'proposeTreaty',
      from: playerId,
      with: other,
      treaty: 'trade',
    });
    expect(res.ok).toBe(true);
    expect(findTreaty(world, playerId, other, 'trade')).toBeTruthy();
  });

  it('breakTreaty on defensivePact penalises reputation globally', () => {
    const { world, playerId } = makeMiniWorld();
    const other = seedSecondPlayer(world, 'p.other');
    const third = seedSecondPlayer(world, 'p.third');
    adjustReputation(world, other, playerId, 100);
    handleProposeTreaty(world, {
      kind: 'proposeTreaty',
      from: playerId,
      with: other,
      treaty: 'defensivePact',
    });
    // Force-sign by injecting the treaty if AI refused (personality dependent).
    if (!findTreaty(world, playerId, other, 'defensivePact')) {
      world.treaties.push({
        id: 'treaty-forced' as never,
        parties: [playerId, other],
        kind: 'defensivePact',
        signedTick: 0,
      });
    }
    const before = getReputation(world, third, playerId);
    handleBreakTreaty(world, {
      kind: 'breakTreaty',
      from: playerId,
      with: other,
      treaty: 'defensivePact',
    });
    expect(getReputation(world, third, playerId)).toBeLessThan(before);
  });

  it('declareWar clears existing treaties between the belligerents', () => {
    const { world, playerId } = makeMiniWorld();
    const other = seedSecondPlayer(world);
    world.treaties.push({
      id: 'treaty-t' as never,
      parties: [playerId, other],
      kind: 'trade',
      signedTick: 0,
    });
    handleDeclareWar(world, { kind: 'declareWar', from: playerId, against: other });
    expect(findTreaty(world, playerId, other, 'trade')).toBeUndefined();
  });
});
