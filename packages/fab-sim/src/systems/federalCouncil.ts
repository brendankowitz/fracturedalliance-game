/**
 * Federal Council system (spec §A.4).
 *
 * Convenes every COUNCIL_INTERVAL_TICKS. On each convocation rolls the
 * `event` sub-generator to choose embargo / tariff / vote, picks a target
 * deterministically (lowest standing for embargo, most-traded ore for
 * tariff), and emits a corresponding event. Active embargoes/tariffs
 * expire when `world.tick >= expiresTick`.
 *
 * Vote results are processed by `councilVoteRespond` commands; if no human
 * response by `resolveTick` the vote auto-passes.
 */

import {
  type ActiveEmbargo,
  type ActiveTariff,
  COUNCIL_INTERVAL_TICKS,
  type FederalCouncilState,
  initialFederalCouncilState,
  type OpenVote,
  ORE_KINDS,
  type OreKind,
  type PlayerCommand,
  type PlayerId,
  type World,
} from '@fab/domain';
import type { PrngRegistry } from '../rng/subGenerators';
import { emitEvent } from './events';

interface HandlerResult {
  readonly ok: boolean;
  readonly reason?: string;
}

const ensureState = (world: World): FederalCouncilState => {
  if (!world.council) {
    world.council = initialFederalCouncilState();
  }
  return world.council;
};

const pickEmbargoTarget = (world: World): PlayerId | null => {
  let worst: PlayerId | null = null;
  let worstStanding = Infinity;
  for (const p of world.players.values()) {
    if (!p.alive) continue;
    if (p.federationStanding < worstStanding) {
      worstStanding = p.federationStanding;
      worst = p.id;
    }
  }
  return worst;
};

const pickTariffOre = (_world: World, reg: PrngRegistry): OreKind => {
  const rng = reg.get('event');
  const idx = Math.floor(rng.next() * ORE_KINDS.length);
  return ORE_KINDS[idx] ?? 'selenium';
};

const convene = (world: World, reg: PrngRegistry): void => {
  const state = world.council;
  if (!state) return;
  const rng = reg.get('event');
  const r = rng.next();
  if (r < 0.4) {
    // embargo
    const target = pickEmbargoTarget(world);
    if (!target) return;
    const expiresTick = world.tick + 1800;
    const embargo: ActiveEmbargo = {
      target,
      expiresTick,
      reason: 'federal sanctions imposed',
    };
    (state.embargoes as ActiveEmbargo[]).push(embargo);
    emitEvent(world, {
      kind: 'council.embargo',
      severity: 'amber',
      target,
      reason: embargo.reason,
      expiresTick,
      tick: world.tick,
    });
  } else if (r < 0.75) {
    // tariff
    const ore = pickTariffOre(world, reg);
    const expiresTick = world.tick + 1200;
    const tariff: ActiveTariff = { ore, multiplier: 0.7, expiresTick };
    (state.tariffs as ActiveTariff[]).push(tariff);
    emitEvent(world, {
      kind: 'council.tariff',
      severity: 'amber',
      ore,
      multiplier: 0.7,
      expiresTick,
      tick: world.tick,
    });
  } else {
    // vote
    const target = pickEmbargoTarget(world);
    if (!target) return;
    const voteId = `vote-${world.tick}`;
    const resolveTick = world.tick + 600;
    const vote: OpenVote = {
      id: voteId,
      proposedTick: world.tick,
      resolveTick,
      title: 'Censure motion',
      description: `Censure ${target} for federation-code violations.`,
      onPass: { kind: 'censure', target, reputationDelta: -20 },
    };
    (state.openVotes as OpenVote[]).push(vote);
    emitEvent(world, {
      kind: 'council.vote.opened',
      severity: 'grey',
      voteId,
      title: vote.title,
      resolveTick,
      tick: world.tick,
    });
  }
};

/** Apply expired-vote auto-pass + vote-effect resolution. */
const applyVoteEffect = (world: World, vote: OpenVote): void => {
  switch (vote.onPass.kind) {
    case 'censure': {
      const target = world.players.get(vote.onPass.target);
      if (target)
        target.federationStanding = Math.max(-100, target.federationStanding + vote.onPass.reputationDelta);
      return;
    }
    case 'embargo': {
      const state = world.council;
      if (!state) return;
      (state.embargoes as ActiveEmbargo[]).push({
        target: vote.onPass.target,
        expiresTick: world.tick + vote.onPass.ticks,
        reason: vote.onPass.reason,
      });
      return;
    }
    case 'tariff': {
      const state = world.council;
      if (!state) return;
      (state.tariffs as ActiveTariff[]).push({
        ore: vote.onPass.ore,
        multiplier: vote.onPass.multiplier,
        expiresTick: world.tick + vote.onPass.ticks,
      });
      return;
    }
    case 'grant': {
      const r = world.players.get(vote.onPass.recipient);
      if (r) r.credits += vote.onPass.credits;
      return;
    }
  }
};

export const federalCouncilPhase = (world: World, reg: PrngRegistry): void => {
  const state = ensureState(world);
  // Drop expired embargoes / tariffs.
  (state as unknown as { embargoes: ActiveEmbargo[] }).embargoes = state.embargoes.filter(
    (e) => e.expiresTick > world.tick,
  );
  (state as unknown as { tariffs: ActiveTariff[] }).tariffs = state.tariffs.filter(
    (t) => t.expiresTick > world.tick,
  );
  // Auto-resolve expired votes (default-pass).
  const open = state.openVotes as OpenVote[];
  const stillOpen: OpenVote[] = [];
  for (const v of open) {
    if (v.resolveTick <= world.tick) {
      applyVoteEffect(world, v);
    } else {
      stillOpen.push(v);
    }
  }
  (state as unknown as { openVotes: OpenVote[] }).openVotes = stillOpen;

  if (world.tick >= state.nextActionTick) {
    convene(world, reg);
    (state as unknown as { nextActionTick: number }).nextActionTick = world.tick + COUNCIL_INTERVAL_TICKS;
  }
};

/** Process a `councilVoteRespond` command — accept or reject an open vote. */
export const handleCouncilVoteRespond = (
  world: World,
  cmd: Extract<PlayerCommand, { kind: 'councilVoteRespond' }>,
): HandlerResult => {
  const state = ensureState(world);
  const idx = state.openVotes.findIndex((v) => v.id === cmd.voteId);
  if (idx === -1) return { ok: false, reason: 'vote not found' };
  const vote = state.openVotes[idx];
  if (!vote) return { ok: false, reason: 'vote vanished' };
  if (cmd.accept) applyVoteEffect(world, vote);
  // Remove the vote regardless.
  const open = state.openVotes as OpenVote[];
  open.splice(idx, 1);
  return { ok: true };
};
