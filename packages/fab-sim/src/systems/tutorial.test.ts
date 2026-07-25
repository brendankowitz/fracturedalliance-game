/**
 * Phase 12 — tutorial engine tests.
 *
 * We build a throw-away ScenarioDef with one objective per trigger kind
 * and assert that each one fires under the right world mutation. The
 * human-player fixture id is `p.human` to match the runner's hard-coded
 * lookup (see `systems/tutorial.ts`).
 */

import type { ScenarioDef } from '@fab/domain';
import { asPlayerId, asScenarioId, emptyOreBag } from '@fab/domain';
import { beforeEach, describe, expect, it } from 'vitest';
import { migrateToLatest } from '../serializer/migrations';
import { compressWorld, decompressWorld, deserializeWorld, serializeWorld } from '../serializer/serialize';
import { tickOnce } from '../tick';
import { createWorld } from '../world/create';
import { emitEvent } from './events';
import { clearTutorialRegistry, registerScenarioForTutorial, tutorialPhase } from './tutorial';

const HUMAN = asPlayerId('p.human');

const mkScenario = (objectives: ScenarioDef['objectives']): ScenarioDef => ({
  id: asScenarioId('scn.test.tutorial'),
  displayName: 'Test Tutorial',
  description: 'Unit test scenario',
  kind: 'tutorial',
  playerCount: 1,
  aiRaces: [],
  asteroidCount: 1,
  startingResources: {
    credits: 10_000,
    ores: emptyOreBag(),
    population: 0,
    food: 100,
    water: 100,
    air: 100,
    power: 0,
  },
  victoryConditions: ['survivor'],
  timeLimitDays: 60,
  objectives,
});

const mkWorld = (scenario: ScenarioDef) => createWorld({ seed: 42, scenarioId: scenario.id, scenario });

describe('tutorial engine', () => {
  beforeEach(() => clearTutorialRegistry());

  it('createWorld seeds tutorialState when scenario.kind === "tutorial"', () => {
    const scenario = mkScenario([
      {
        id: 'obj.first',
        description: 'first',
        trigger: 'onTick',
        params: { count: 1 },
      },
    ]);
    registerScenarioForTutorial(scenario);
    const world = mkWorld(scenario);
    expect(world.tutorialState).not.toBeNull();
    expect(world.tutorialState?.activeObjectiveId).toBe('obj.first');
    expect(world.tutorialState?.completed).toEqual([]);
  });

  it('onTick completes when world.tick reaches params.count', () => {
    const scenario = mkScenario([
      { id: 'obj.tick', description: 't', trigger: 'onTick', params: { count: 3 } },
    ]);
    registerScenarioForTutorial(scenario);
    const world = mkWorld(scenario);
    for (let i = 0; i < 3; i++) tickOnce(world);
    expect(world.tutorialState?.completed).toContain('obj.tick');
  });

  it('onBuild completes on a buildQueue.completed event with matching kind', () => {
    const scenario = mkScenario([
      { id: 'obj.build', description: 'b', trigger: 'onBuild', params: { kind: 'bld.mine' } },
    ]);
    registerScenarioForTutorial(scenario);
    const world = mkWorld(scenario);
    const ast = [...world.asteroids.values()][0];
    if (!ast) throw new Error('no asteroid');
    // Emit the completion event with the current tick.
    emitEvent(world, {
      kind: 'buildQueue.completed',
      severity: 'grey',
      asteroidId: ast.id,
      buildingKind: 'bld.mine',
      tick: world.tick,
    });
    tutorialPhase(world);
    expect(world.tutorialState?.completed).toContain('obj.build');
  });

  it('onResearch completes on a research.completed event', () => {
    const scenario = mkScenario([{ id: 'obj.res', description: 'r', trigger: 'onResearch' }]);
    registerScenarioForTutorial(scenario);
    const world = mkWorld(scenario);
    emitEvent(world, {
      kind: 'research.completed',
      severity: 'grey',
      playerId: HUMAN,
      blueprintId: 'bp.extraction.mine-mk2' as never,
      tick: world.tick,
    });
    tutorialPhase(world);
    expect(world.tutorialState?.completed).toContain('obj.res');
  });

  it('onMine completes when a human-owned colony holds ore', () => {
    const scenario = mkScenario([
      { id: 'obj.mine', description: 'm', trigger: 'onMine', params: { tonnes: 10 } },
    ]);
    registerScenarioForTutorial(scenario);
    const world = mkWorld(scenario);
    const ast = [...world.asteroids.values()][0];
    if (!ast) throw new Error('no asteroid');
    ast.stocks.ores.selenium = 20;
    tutorialPhase(world);
    expect(world.tutorialState?.completed).toContain('obj.mine');
  });

  it('onCommand completes when commandTrace contains the requested kind', () => {
    const scenario = mkScenario([
      {
        id: 'obj.cmd',
        description: 'c',
        trigger: 'onCommand',
        params: { commandKind: 'startResearch' },
      },
    ]);
    registerScenarioForTutorial(scenario);
    const world = mkWorld(scenario);
    world.commandTrace = ['startResearch'];
    tutorialPhase(world);
    expect(world.tutorialState?.completed).toContain('obj.cmd');
  });

  it('onCombat completes on a ship.destroyed or colony.under_attack event', () => {
    const scenario = mkScenario([{ id: 'obj.combat', description: 'c', trigger: 'onCombat' }]);
    registerScenarioForTutorial(scenario);
    const world = mkWorld(scenario);
    emitEvent(world, {
      kind: 'ship.destroyed',
      severity: 'amber',
      shipId: 'ship.X' as never,
      ownerId: HUMAN,
      tick: world.tick,
    });
    tutorialPhase(world);
    expect(world.tutorialState?.completed).toContain('obj.combat');
  });

  it('completes objectives in declaration order', () => {
    const scenario = mkScenario([
      { id: 'a', description: 'a', trigger: 'onTick', params: { count: 1 } },
      { id: 'b', description: 'b', trigger: 'onTick', params: { count: 2 } },
      { id: 'c', description: 'c', trigger: 'onTick', params: { count: 3 } },
    ]);
    registerScenarioForTutorial(scenario);
    const world = mkWorld(scenario);
    for (let i = 0; i < 3; i++) tickOnce(world);
    expect(world.tutorialState?.completed).toEqual(['a', 'b', 'c']);
    expect(world.tutorialState?.activeObjectiveId).toBeNull();
  });

  it('credits the human player with completionReward', () => {
    const scenario = mkScenario([
      {
        id: 'obj.reward',
        description: 'r',
        trigger: 'onTick',
        params: { count: 1 },
        completionReward: 777,
      },
    ]);
    registerScenarioForTutorial(scenario);
    const world = mkWorld(scenario);
    const startCredits = world.players.get(HUMAN)?.credits ?? 0;
    tickOnce(world);
    const endCredits = world.players.get(HUMAN)?.credits ?? 0;
    // Stream E2: starting colonies now ship with 4 life-support buildings
    // whose monthly upkeep drains a few millicredits per tick. Round to
    // tolerance to keep the assertion focused on the reward delta.
    expect(endCredits - startCredits).toBeCloseTo(777, 1);
  });

  it('emits a tutorial.objective.completed event on completion', () => {
    const scenario = mkScenario([
      { id: 'obj.emit', description: 'e', trigger: 'onTick', params: { count: 1 } },
    ]);
    registerScenarioForTutorial(scenario);
    const world = mkWorld(scenario);
    tickOnce(world);
    const ev = world.eventQueue.find((e) => e.kind === 'tutorial.objective.completed');
    expect(ev).toBeDefined();
    if (ev && ev.kind === 'tutorial.objective.completed') {
      expect(ev.objectiveId).toBe('obj.emit');
    }
  });

  it('world.tutorialState survives save/load round-trip', () => {
    const scenario = mkScenario([
      { id: 'a', description: 'a', trigger: 'onTick', params: { count: 1 } },
      { id: 'b', description: 'b', trigger: 'onTick', params: { count: 5 } },
    ]);
    registerScenarioForTutorial(scenario);
    const world = mkWorld(scenario);
    tickOnce(world); // completes 'a', advances active to 'b'
    const blob = compressWorld(serializeWorld(world));
    const restored = deserializeWorld(decompressWorld(blob));
    expect(restored.tutorialState).toEqual(world.tutorialState);
    expect(restored.tutorialState?.completed).toEqual(['a']);
    expect(restored.tutorialState?.activeObjectiveId).toBe('b');
  });

  it('Stream E5 — emits tutorial.objective.activated when the active step changes', () => {
    const scenario = mkScenario([
      { id: 'a', description: 'a', trigger: 'onTick', params: { count: 1 } },
      { id: 'b', description: 'b', trigger: 'onTick', params: { count: 5 } },
    ]);
    registerScenarioForTutorial(scenario);
    const world = mkWorld(scenario);
    tickOnce(world); // completes 'a', promotes 'b'
    const activated = world.eventQueue.filter(
      (e): e is Extract<typeof e, { kind: 'tutorial.objective.activated' }> =>
        e.kind === 'tutorial.objective.activated',
    );
    const ids = activated.map((e) => e.objectiveId);
    expect(ids).toContain('b');
  });

  it('migrates a legacy v1 save (missing tutorialState) to v2', () => {
    const scenario = mkScenario([{ id: 'a', description: 'a', trigger: 'onTick', params: { count: 5 } }]);
    registerScenarioForTutorial(scenario);
    const world = mkWorld(scenario);
    const sw = serializeWorld(world) as unknown as Record<string, unknown>;
    const legacy: Record<string, unknown> = { ...sw, schemaVersion: 1 };
    delete legacy.tutorialState;
    delete legacy.commandTrace;
    const migrated = migrateToLatest(legacy);
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.tutorialState).toBeNull();
  });
});
