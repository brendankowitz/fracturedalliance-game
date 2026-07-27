/**
 * Research system.
 *
 * Each player has at most one `activeResearch`. The `startResearch`
 * command validates:
 *   • blueprint exists in CONTENT;
 *   • all prerequisites are owned (`requires` from `BlueprintDef`);
 *   • the blueprint is not already owned;
 *   • the player can afford `costCredits`;
 *   • no other research is in progress.
 *
 * On success it deducts credits and sets `activeResearch`. The
 * `researchPhase` decrements `remainingTicks` by 1 per tick; when it
 * hits zero the blueprint is added to `blueprintsOwned`, the active
 * slot cleared, and a grey `research.completed` event emitted.
 *
 * `researchTimeTicks` on the blueprint def is used as the total ticks.
 * If a blueprint is missing a time, it defaults to
 * `TICKS_PER_SIM_DAY * 2` (2 sim-days) for safety.
 */

import { BLUEPRINTS } from '@fab/content';
import type { ActiveResearch, BlueprintDef, BlueprintId, PlayerCommand, PlayerId, World } from '@fab/domain';
import { TICKS_PER_SIM_DAY } from '../time';
import { emitEvent } from './events';

const DEFAULT_TIME = TICKS_PER_SIM_DAY * 2;

const getDef = (id: BlueprintId): BlueprintDef | undefined =>
  (BLUEPRINTS as Readonly<Record<BlueprintId, BlueprintDef>>)[id];

export interface ResearchResult {
  ok: boolean;
  reason?: string;
}

export const startResearch = (
  world: World,
  cmd: Extract<PlayerCommand, { kind: 'startResearch' }>,
): ResearchResult => {
  const player = world.players.get(cmd.playerId);
  if (!player) return { ok: false, reason: 'player not found' };
  if (player.activeResearch) return { ok: false, reason: 'research already in progress' };
  const def = getDef(cmd.blueprint);
  if (!def) return { ok: false, reason: `unknown blueprint ${cmd.blueprint}` };
  if (player.blueprintsOwned.has(def.id)) return { ok: false, reason: 'already owned' };
  for (const pre of def.requires) {
    if (!player.blueprintsOwned.has(pre)) return { ok: false, reason: `missing prerequisite ${pre}` };
  }
  if (player.credits < def.costCredits) return { ok: false, reason: 'insufficient credits' };
  player.credits -= def.costCredits;
  const total = def.researchTimeTicks ?? DEFAULT_TIME;
  const active: ActiveResearch = { blueprintId: def.id, remainingTicks: total, totalTicks: total };
  player.activeResearch = active;
  emitEvent(world, {
    kind: 'research.started',
    severity: 'grey',
    playerId: cmd.playerId,
    blueprintId: def.id,
    tick: world.tick,
  });
  return { ok: true };
};

export const researchPhase = (world: World): void => {
  for (const player of world.players.values()) {
    const active = player.activeResearch;
    if (!active) continue;
    active.remainingTicks -= 1;
    if (active.remainingTicks <= 0) {
      player.blueprintsOwned.add(active.blueprintId);
      const completed: BlueprintId = active.blueprintId;
      player.activeResearch = null;
      emitEvent(world, {
        kind: 'research.completed',
        severity: 'grey',
        playerId: player.id as PlayerId,
        blueprintId: completed,
        tick: world.tick,
      });
    }
  }
};
