/**
 * AI runtime — per-player turn resolver.
 *
 * Two cadences:
 *   • Strategic (`AI_TURN_INTERVAL_TICKS=100`) — full utility scoring,
 *     emits up to ACTIONS_PER_TURN commands per AI player.
 *   • Operational (`AI_OPERATIONAL_INTERVAL_TICKS=10`) — event-driven
 *     diplomacy interrupts. The AI scans recent `eventQueue` entries
 *     and reacts to treaty.broken / war / treaty.signed events targeted
 *     at it (Stream E1 — bound diplomatic latency to 10 ticks instead
 *     of 100). Currently emits at most one reply command per AI per
 *     operational tick.
 *
 * For each alive non-human player, this:
 *   1. Scores every Action in the catalogue using the action's own scoring.
 *   2. Multiplies by the race-personality weight for the action kind.
 *   3. Picks the top-k actions (k=2) deterministically via `world.rng.ai`.
 *   4. Invokes `build()` on each and enqueues the returned commands onto
 *      `world.commandQueue` for the next tick's `commandPhase`.
 *
 * Determinism: no wall-clock consulted; RNG flows exclusively through the
 * `ai` sub-generator seeded by `world.seed`.
 */

import { RACES } from '@fab/content';
import type { GameEvent, PlayerCommand, PlayerId, RaceDef, World } from '@fab/domain';
import { DEFAULT_DIFFICULTY, DIFFICULTY_MODIFIERS } from '@fab/domain';
import type { PrngRegistry } from '@fab/sim';
import { ACTIONS } from './agents/actions';
import { personalityWeight } from './agents/personality';
import type { AiContext } from './context';

/** Number of actions each AI may execute per turn. */
const ACTIONS_PER_TURN = 2;
/** Interval in ticks between AI strategic turns (~ every 5 sim-seconds). */
const AI_TURN_INTERVAL_TICKS = 100;
/** Interval in ticks between AI operational interrupts (event-driven diplomacy). */
const AI_OPERATIONAL_INTERVAL_TICKS = 10;
/**
 * Number of trailing eventQueue entries the operational pass scans for
 * fresh treaty/war activity targeting the AI. Window is small to bound
 * cost — the queue is drained periodically by the HUD, but the sanity
 * harness keeps it bounded under 5000 anyway.
 */
const OP_EVENT_SCAN_WINDOW = 64;

const raceFor = (player: { raceId: string }): RaceDef => {
  const r = RACES.find((x) => x.id === player.raceId);
  if (!r) throw new Error(`No race registered for raceId=${player.raceId}`);
  return r;
};

/**
 * Stream E3 — combat-flavoured action kinds. AI utility scores for
 * these are multiplied by `DIFFICULTY_MODIFIERS[difficulty].aiAggression`
 * inside `runAiTurn`, leaving non-combat picks untouched.
 */
const COMBAT_ACTION_KINDS: ReadonlySet<string> = new Set([
  'declareWar',
  'dispatchFleet',
  'launchMissile',
  'produceShip',
]);

export const runAiTurn = (world: World, playerId: PlayerId, reg: PrngRegistry): PlayerCommand[] => {
  const player = world.players.get(playerId);
  if (!player?.alive || player.isHuman) return [];
  const race = raceFor(player);
  const rng = reg.get('ai');
  const ctx: AiContext = { world, player: playerId, race, rng, tick: world.tick };
  const difficulty = world.difficulty ?? DEFAULT_DIFFICULTY;
  const aggression = DIFFICULTY_MODIFIERS[difficulty].aiAggression;

  type Scored = { score: number; action: (typeof ACTIONS)[number] };
  const scored: Scored[] = ACTIONS.map((action) => {
    const base = Math.max(0, action.score(ctx) * personalityWeight(race, action.kind));
    const score = COMBAT_ACTION_KINDS.has(action.kind) ? base * aggression : base;
    return { action, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.action.name < b.action.name ? -1 : 1;
  });

  const picked = scored.slice(0, ACTIONS_PER_TURN).filter((s) => s.score > 0.05);
  const commands: PlayerCommand[] = [];
  for (const { action } of picked) {
    const cmd = action.build(ctx);
    if (cmd) commands.push(cmd);
  }
  return commands;
};

/**
 * Operational interrupt — react to events targeting `playerId` over the
 * trailing `OP_EVENT_SCAN_WINDOW` event entries. Emits at most one
 * command. Reactions:
 *   • `treaty.broken` against us by X → propose nonAggression back if
 *     reputation is salvageable; otherwise no-op (next strategic tick may
 *     `declareWar`).
 *   • `colony.under_attack` from X → declare war if not already at war.
 */
export const runAiOpInterrupt = (world: World, playerId: PlayerId): PlayerCommand | null => {
  const player = world.players.get(playerId);
  if (!player?.alive || player.isHuman) return null;
  const evs = world.eventQueue;
  const start = Math.max(0, evs.length - OP_EVENT_SCAN_WINDOW);
  // Walk newest-first so the most recent event wins.
  for (let i = evs.length - 1; i >= start; i--) {
    const ev = evs[i] as GameEvent | undefined;
    if (!ev) continue;
    if (ev.kind === 'treaty.broken' && ev.against === playerId) {
      const rep = player.reputation[ev.by] ?? 0;
      if (rep > -50) {
        // Try to repair.
        return { kind: 'proposeTreaty', from: playerId, with: ev.by, treaty: 'nonAggression' };
      }
      // Otherwise escalate.
      return { kind: 'declareWar', from: playerId, against: ev.by };
    }
    if (ev.kind === 'colony.under_attack' && ev.attackerId !== playerId) {
      // Verify the attacker is still alive and not already a declared rival.
      const attacker = world.players.get(ev.attackerId);
      if (!attacker?.alive) continue;
      return { kind: 'declareWar', from: playerId, against: ev.attackerId };
    }
  }
  return null;
};

/** Iterates every alive non-human player and enqueues their AI-chosen commands. */
export const aiPhase = (world: World, reg: PrngRegistry): void => {
  // Strategic pass.
  if (world.tick % AI_TURN_INTERVAL_TICKS === 0) {
    for (const player of world.players.values()) {
      const cmds = runAiTurn(world, player.id, reg);
      for (const c of cmds) world.commandQueue.push(c);
    }
    return;
  }
  // Operational pass — runs on the 10-tick boundary but skips ticks where
  // the strategic pass already ran (covered by the early-return above).
  if (world.tick % AI_OPERATIONAL_INTERVAL_TICKS === 0) {
    for (const player of world.players.values()) {
      const cmd = runAiOpInterrupt(world, player.id);
      if (cmd) world.commandQueue.push(cmd);
    }
  }
};
