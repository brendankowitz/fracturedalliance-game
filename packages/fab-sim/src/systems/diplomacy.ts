/**
 * Phase 8 — Diplomacy.
 *
 * Tracks treaties, per-player reputation drift, and embassy bonuses. Accepts
 * proposals deterministically via a simple AI response model that defers to
 * the full utility-AI ProposeTreatyAction scoring in Phase 7.
 */

import { RACES } from '@fab/content';
import type { PlayerCommand, PlayerId, RaceDef, Treaty, TreatyId, TreatyKind, World } from '@fab/domain';
import { asTreatyId } from '@fab/domain';
import { emitEvent } from './events';

const REPUTATION_DRIFT_PER_TICK = 0.01;
const REPUTATION_ATTACK_DELTA = -20;
const REPUTATION_BREAK_ALLIANCE_DELTA = -30;
const REPUTATION_TRADE_DELTA = 5;

const raceOf = (world: World, pid: PlayerId): RaceDef | null => {
  const p = world.players.get(pid);
  if (!p) return null;
  return RACES.find((r) => r.id === p.raceId) ?? null;
};

export const getReputation = (world: World, from: PlayerId, toward: PlayerId): number => {
  const p = world.players.get(from);
  if (!p) return 0;
  return p.reputation[toward] ?? 0;
};

export const adjustReputation = (world: World, from: PlayerId, toward: PlayerId, delta: number): void => {
  const p = world.players.get(from);
  if (!p) return;
  const cur = p.reputation[toward] ?? 0;
  p.reputation[toward] = Math.max(-100, Math.min(100, cur + delta));
};

export const findTreaty = (world: World, a: PlayerId, b: PlayerId, kind: TreatyKind): Treaty | undefined =>
  world.treaties.find(
    (t) =>
      t.kind === kind &&
      ((t.parties[0] === a && t.parties[1] === b) || (t.parties[0] === b && t.parties[1] === a)),
  );

const mintTreatyId = (world: World): TreatyId => {
  const id = asTreatyId(`treaty-${world.nextTreatyId}`);
  world.nextTreatyId += 1;
  return id;
};

const shouldAcceptTreaty = (world: World, target: PlayerId, from: PlayerId, kind: TreatyKind): boolean => {
  const race = raceOf(world, target);
  if (!race) return false;
  const rep = getReputation(world, target, from);
  const base = race.personality.treatyRespect - race.personality.aggression * 0.5;
  const repTerm = rep / 100;
  // Non-aggression and trade are easy; alliances/vassalage hard.
  const typeBias: Record<TreatyKind, number> = {
    nonAggression: 0.2,
    trade: 0.2,
    noCovert: 0.1,
    openBorders: 0.0,
    defensivePact: -0.1,
    jointWar: -0.2,
    peace: 0.3,
  };
  // Stream E1: lowered threshold from 0.5 to 0.1 so AI-to-AI treaty
  // proposals actually sign more often than they're rejected. Without
  // this, the rev1 sanity report showed 100/109 commands per AI being
  // re-proposed treaties to the same set of perpetually-rejecting
  // neighbours. Treaty-respect personality still dominates: a
  // pacifist Kryll signs almost everything, a militant Mauna still
  // rejects most things.
  return base + repTerm + (typeBias[kind] ?? 0) > 0.1;
};

export const handleProposeTreaty = (
  world: World,
  cmd: Extract<PlayerCommand, { kind: 'proposeTreaty' }>,
): { ok: boolean; reason?: string } => {
  const from = world.players.get(cmd.from);
  const target = world.players.get(cmd.with);
  if (!from || !target) return { ok: false, reason: 'player missing' };
  if (cmd.from === cmd.with) return { ok: false, reason: 'self-treaty' };
  if (findTreaty(world, cmd.from, cmd.with, cmd.treaty)) return { ok: false, reason: 'already exists' };
  // AI target: auto-respond. Human target: leave pending.
  if (!target.isHuman) {
    const accept = shouldAcceptTreaty(world, cmd.with, cmd.from, cmd.treaty);
    if (accept) signTreaty(world, cmd.from, cmd.with, cmd.treaty);
    else {
      emitEvent(world, {
        kind: 'command.rejected',
        severity: 'amber',
        reason: `treaty.rejected:${cmd.treaty}`,
        tick: world.tick,
      });
    }
  }
  return { ok: true };
};

export const handleRespondTreaty = (
  world: World,
  cmd: Extract<PlayerCommand, { kind: 'respondTreaty' }>,
): { ok: boolean; reason?: string } => {
  if (cmd.accept) signTreaty(world, cmd.from, cmd.with, cmd.treaty);
  return { ok: true };
};

export const handleBreakTreaty = (
  world: World,
  cmd: Extract<PlayerCommand, { kind: 'breakTreaty' }>,
): { ok: boolean; reason?: string } => {
  const t = findTreaty(world, cmd.from, cmd.with, cmd.treaty);
  if (!t) return { ok: false, reason: 'no such treaty' };
  world.treaties = world.treaties.filter((x) => x !== t);
  emitEvent(world, {
    kind: 'treaty.broken',
    severity: 'amber',
    by: cmd.from,
    against: cmd.with,
    treaty: cmd.treaty,
    tick: world.tick,
  });
  // Alliance break penalises reputation globally with allies.
  if (cmd.treaty === 'defensivePact' || cmd.treaty === 'jointWar') {
    for (const p of world.players.values()) {
      if (p.id === cmd.from) continue;
      adjustReputation(world, p.id, cmd.from, REPUTATION_BREAK_ALLIANCE_DELTA);
    }
  } else {
    adjustReputation(world, cmd.with, cmd.from, -10);
  }
  return { ok: true };
};

export const handleDeclareWar = (
  world: World,
  cmd: Extract<PlayerCommand, { kind: 'declareWar' }>,
): { ok: boolean; reason?: string } => {
  // Breaks all non-war treaties between the two sides.
  world.treaties = world.treaties.filter(
    (t) =>
      !(
        (t.parties[0] === cmd.from && t.parties[1] === cmd.against) ||
        (t.parties[0] === cmd.against && t.parties[1] === cmd.from)
      ),
  );
  adjustReputation(world, cmd.against, cmd.from, REPUTATION_ATTACK_DELTA);
  adjustReputation(world, cmd.from, cmd.against, -10);
  emitEvent(world, {
    kind: 'treaty.broken',
    severity: 'amber',
    by: cmd.from,
    against: cmd.against,
    treaty: 'peace',
    tick: world.tick,
  });
  return { ok: true };
};

const signTreaty = (world: World, a: PlayerId, b: PlayerId, kind: TreatyKind): void => {
  const t: Treaty = {
    id: mintTreatyId(world),
    parties: [a, b],
    kind,
    signedTick: world.tick,
  };
  world.treaties.push(t);
  emitEvent(world, {
    kind: 'treaty.signed',
    severity: 'grey',
    parties: [a, b],
    treaty: kind,
    tick: world.tick,
  });
  if (kind === 'trade') {
    adjustReputation(world, a, b, REPUTATION_TRADE_DELTA);
    adjustReputation(world, b, a, REPUTATION_TRADE_DELTA);
  }
};

/** Count embassies on colonies owned by `playerId` → extra diplomacy slots. */
export const embassyBonus = (world: World, playerId: PlayerId): number => {
  let n = 0;
  for (const a of world.asteroids.values()) {
    if (a.ownerId !== playerId) continue;
    for (const bid of a.buildings) {
      const b = world.buildings.get(bid);
      if (b?.defKind === 'bld.embassy' && b.active) n++;
    }
  }
  return n;
};

/** Entry point for tick.ts — drifts reputation toward 0 and cleans expired treaties. */
export const diplomacyPhase = (world: World): void => {
  for (const player of world.players.values()) {
    for (const other of Object.keys(player.reputation)) {
      const v = player.reputation[other] ?? 0;
      if (Math.abs(v) < REPUTATION_DRIFT_PER_TICK) {
        player.reputation[other] = 0;
      } else {
        player.reputation[other] = v - Math.sign(v) * REPUTATION_DRIFT_PER_TICK;
      }
    }
  }
  // Expire treaties.
  if (world.treaties.length > 0) {
    world.treaties = world.treaties.filter((t) => !t.expiresTick || t.expiresTick > world.tick);
  }
};
