/**
 * Tutorial engine — Phase 12.
 *
 * Driven by `ScenarioObjective[]` on the active scenario. Objectives are
 * walked sequentially (except `optional` ones, which complete out-of-band
 * when their trigger fires). On each completion we:
 *   • append the id to `world.tutorialState.completed`
 *   • advance `activeObjectiveId` to the next pending objective
 *   • credit the human player with `completionReward ?? rewardCredits ?? 0`
 *   • emit a grey `command.rejected` — sorry, wrong event — grey
 *     `tutorial.objective.completed` event so the UI can show a celebration.
 *
 * The runner is deterministic: it only consults `world` and never wall-clock.
 * It is gated to scenarios where `kind === 'tutorial' | 'primer'` or where
 * the caller pre-initialised `world.tutorialState` (our `createWorld` does
 * the latter automatically when `scenario.objectives.length > 0`).
 */

import type { Player, PlayerId, ScenarioDef, ScenarioObjective, World } from '@fab/domain';
import { asPlayerId } from '@fab/domain';
import { emitEvent } from './events';

// ── Scenario registry shim ────────────────────────────────────────────────
// The tutorial runner needs access to the current scenario's objective
// list but the sim has no build-time dep on @fab/content. A caller (the
// Web Worker) registers scenario metadata at boot; tests inject directly.

const scenarioRegistry = new Map<string, ScenarioDef>();

export const registerScenarioForTutorial = (scenario: ScenarioDef): void => {
  scenarioRegistry.set(scenario.id, scenario);
};

export const clearTutorialRegistry = (): void => {
  scenarioRegistry.clear();
};

// ── Trigger evaluation ────────────────────────────────────────────────────

const HUMAN_PLAYER_ID: PlayerId = asPlayerId('p.human');

const humanPlayer = (world: World): Player | undefined => world.players.get(HUMAN_PLAYER_ID);

/** Match `params.kind` against a string building/blueprint kind, if set. */
const matchKind = (params: ScenarioObjective['params'] | undefined, kind: string): boolean => {
  if (!params) return true;
  const expected = (params.kind ?? params.buildingKind ?? params.blueprintId) as string | undefined;
  return expected === undefined || expected === kind;
};

const matchCommandKind = (params: ScenarioObjective['params'] | undefined, kind: string): boolean => {
  if (!params) return true;
  const expected = (params.commandKind ?? params.kind) as string | undefined;
  return expected === undefined || expected === kind;
};

const readNumberParam = (
  params: ScenarioObjective['params'] | undefined,
  key: string,
): number | undefined => {
  const v = params?.[key];
  return typeof v === 'number' ? v : undefined;
};

const triggerMineTotal = (world: World, obj: ScenarioObjective): boolean => {
  const min = readNumberParam(obj.params, 'tonnes') ?? 1;
  let total = 0;
  for (const a of world.asteroids.values()) {
    if (a.ownerId !== HUMAN_PLAYER_ID) continue;
    for (const v of Object.values(a.stocks.ores)) total += v ?? 0;
    if (total >= min) return true;
  }
  return total >= min;
};

const triggerOnTick = (world: World, obj: ScenarioObjective): boolean => {
  const creditsMin = readNumberParam(obj.params, 'playerCreditsAtLeast');
  if (creditsMin !== undefined) {
    const p = humanPlayer(world);
    return (p?.totalCreditsEarned ?? 0) >= creditsMin;
  }
  const count = readNumberParam(obj.params, 'count') ?? readNumberParam(obj.params, 'tick');
  if (count === undefined) return true;
  return world.tick + 1 >= count;
};

const triggerAsteroidColonised = (world: World, obj: ScenarioObjective): boolean => {
  let owned = 0;
  for (const a of world.asteroids.values()) if (a.ownerId !== null) owned++;
  const min = readNumberParam(obj.params, 'count') ?? 2;
  return owned >= min;
};

/**
 * Returns true iff the objective's trigger has fired on the current tick.
 * "Current tick" = events emitted with `tick === world.tick` + command
 * trace populated by `commandPhase`.
 */
const evaluateObjective = (world: World, obj: ScenarioObjective): boolean => {
  const tick = world.tick;
  const thisTickEvents = () => world.eventQueue.filter((e) => e.tick === tick);

  switch (obj.trigger) {
    case 'onBuild':
    case 'buildingConstructed':
      return thisTickEvents().some(
        (e) => e.kind === 'buildQueue.completed' && matchKind(obj.params, e.buildingKind),
      );
    case 'onResearch':
    case 'blueprintPurchased':
      return thisTickEvents().some(
        (e) => e.kind === 'research.completed' && matchKind(obj.params, String(e.blueprintId)),
      );
    case 'onMine':
      return triggerMineTotal(world, obj);
    case 'onTick':
      return triggerOnTick(world, obj);
    case 'onCommand':
      return world.commandTrace.some((k) => matchCommandKind(obj.params, k));
    case 'onCombat':
      return thisTickEvents().some((e) => e.kind === 'ship.destroyed' || e.kind === 'colony.under_attack');
    case 'tradeCompleted': {
      const min = readNumberParam(obj.params, 'creditsMin') ?? 1;
      const p = humanPlayer(world);
      return (p?.totalCreditsEarned ?? 0) >= min;
    }
    case 'treatySigned':
      return thisTickEvents().some((e) => e.kind === 'treaty.signed');
    case 'shipBuilt':
      return world.ships.size > 0;
    case 'asteroidColonised':
      return triggerAsteroidColonised(world, obj);
    case 'raceMet':
    case 'espionageMission':
    case 'asteroidEngineFired':
      return false;
  }
};

// ── Runner ────────────────────────────────────────────────────────────────

/** Look up the active scenario by id from the injected registry. */
const resolveScenario = (world: World): ScenarioDef | undefined => scenarioRegistry.get(world.scenarioId);

const advanceActiveObjective = (
  world: World,
  scenario: ScenarioDef,
  state: NonNullable<World['tutorialState']>,
  activeObj: ScenarioObjective,
): void => {
  if (evaluateObjective(world, activeObj)) {
    completeObjective(world, activeObj);
    const next = scenario.objectives.find((o) => !o.optional && !state.completed.includes(o.id));
    const prev = state.activeObjectiveId;
    state.activeObjectiveId = next?.id ?? null;
    if (next && next.id !== prev) emitObjectiveActivated(world, next.id);
    return;
  }
  if (state.activeObjectiveId !== activeObj.id) {
    // Initialise active id if it was null after a migration.
    state.activeObjectiveId = activeObj.id;
    emitObjectiveActivated(world, activeObj.id);
  }
};

export const tutorialPhase = (world: World): void => {
  const state = world.tutorialState;
  if (!state) return;
  const scenario = resolveScenario(world);
  if (!scenario) return;
  if (scenario.kind && scenario.kind !== 'tutorial' && scenario.kind !== 'primer') return;
  if (scenario.objectives.length === 0) return;

  const remainingById = (id: string): ScenarioObjective | undefined =>
    scenario.objectives.find((o) => o.id === id);

  // Find current pending sequential objective.
  const completedSet = new Set(state.completed);
  const activeObj =
    state.activeObjectiveId && !completedSet.has(state.activeObjectiveId)
      ? remainingById(state.activeObjectiveId)
      : scenario.objectives.find((o) => !o.optional && !completedSet.has(o.id));

  // Check optional objectives independently first — they can fire at any time.
  for (const obj of scenario.objectives) {
    if (!obj.optional) continue;
    if (completedSet.has(obj.id)) continue;
    if (evaluateObjective(world, obj)) completeObjective(world, obj);
  }

  if (activeObj) advanceActiveObjective(world, scenario, state, activeObj);
};

const emitObjectiveActivated = (world: World, objectiveId: string): void => {
  emitEvent(world, {
    kind: 'tutorial.objective.activated',
    severity: 'grey',
    objectiveId,
    tick: world.tick,
  });
};

const completeObjective = (world: World, obj: ScenarioObjective): void => {
  const state = world.tutorialState;
  if (!state) return;
  if (state.completed.includes(obj.id)) return;
  state.completed.push(obj.id);
  const reward = obj.completionReward ?? obj.rewardCredits ?? 0;
  if (reward > 0) {
    const p = humanPlayer(world);
    if (p) {
      p.credits += reward;
      p.totalCreditsEarned += reward;
    }
  }
  emitEvent(world, {
    kind: 'tutorial.objective.completed',
    severity: 'grey',
    objectiveId: obj.id,
    rewardCredits: reward,
    tick: world.tick,
  });
};
