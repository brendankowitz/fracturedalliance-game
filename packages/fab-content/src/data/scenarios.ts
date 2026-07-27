import type { ScenarioDef, ScenarioId } from '@fab/domain';
import { asPlayerId, asScenarioId, emptyOreBag } from '@fab/domain';

const starter = (credits: number) => ({
  credits,
  ores: emptyOreBag(),
  population: 0,
  // Stream E2 — starting stocks lifted from 100→500 to give pop=50
  // colonies a ~9-12 sim-day buffer before life-support deficits,
  // matched by pre-installed life-support buildings (see
  // `installLifeSupport` in packages/sim/src/world/create.ts).
  food: 500,
  water: 500,
  air: 500,
  power: 0,
});

export const SCENARIO_IDS = {
  tutorial: asScenarioId('scn.tutorial'),
  shortGame: asScenarioId('scn.short-game'),
  classicSkirmish: asScenarioId('scn.classic-skirmish'),
  advancedPrimer: asScenarioId('scn.advanced-primer'),
  federationWar: asScenarioId('scn.federation-war'),
} as const;

export const SCENARIOS = {
  [SCENARIO_IDS.tutorial]: {
    id: SCENARIO_IDS.tutorial,
    displayName: 'Tutorial — First Contract',
    description:
      'Guided first-colony scenario. Learn the UI, queue a mine, sell to the Federal Transporter, unlock research, and grow your population.',
    kind: 'tutorial',
    playerCount: 1,
    aiRaces: [],
    asteroidCount: 3,
    startingResources: starter(15_000),
    victoryConditions: ['survivor'],
    timeLimitDays: 60,
    objectives: [
      {
        id: 'obj.tut.select',
        description: 'Select your home asteroid by clicking it in the sector view.',
        hint: 'Your first rock is highlighted. Click it to open the colony panel on the right.',
        trigger: 'onTick',
        params: { count: 1 },
      },
      {
        id: 'obj.tut.first-mine',
        description: 'Build your first Mine on the colony.',
        hint: 'Open the Buildings panel (press 1) and queue a Mine on an ore-rich tile.',
        trigger: 'onBuild',
        params: { kind: 'bld.mine' },
        completionReward: 500,
      },
      {
        id: 'obj.tut.queue-sale',
        description: 'Queue an ore sale through the Federal Transporter.',
        hint: 'Open the Market panel (press 5) and place a sell order on your mined ore.',
        trigger: 'onCommand',
        params: { commandKind: 'queueSellOrder' },
        completionReward: 250,
      },
      {
        id: 'obj.tut.first-credits',
        description: 'Receive your first 500 credits of sale revenue.',
        hint: "Wait for the next Federal Transporter cycle — it'll arrive automatically.",
        trigger: 'onTick',
        params: { playerCreditsAtLeast: 16_000 },
        completionReward: 500,
      },
      {
        id: 'obj.tut.research-lab',
        description: 'Build a Research Lab.',
        hint: 'Research Labs unlock blueprints. Queue one from the Buildings panel.',
        trigger: 'onBuild',
        params: { kind: 'bld.research-lab' },
        completionReward: 1_000,
      },
      {
        id: 'obj.tut.start-research',
        description: 'Start researching a blueprint (try Extraction Tier 2).',
        hint: 'Open the Research panel (press 2) and select a tier-1 blueprint.',
        trigger: 'onCommand',
        params: { commandKind: 'startResearch' },
        completionReward: 500,
      },
      {
        id: 'obj.tut.habitat',
        description: 'Build a Habitat Dome to grow your population.',
        hint: 'More colonists means more productivity — Habitat Domes raise the population cap.',
        trigger: 'onBuild',
        params: { kind: 'bld.habitat-dome' },
        completionReward: 1_500,
      },
      {
        id: 'obj.tut.survive',
        description: 'Survive 500 ticks to graduate from the tutorial.',
        hint: "You've learned the basics. Keep life-support positive and you'll make it.",
        trigger: 'onTick',
        params: { count: 500 },
        completionReward: 3_000,
      },
    ],
  },
  [SCENARIO_IDS.shortGame]: {
    id: SCENARIO_IDS.shortGame,
    displayName: 'Short Game — Belt Warm-Up',
    description:
      'One human + 2 AI, 5 asteroids, 180-day cap. Trains the Corporate Loyalty and Survivor win paths in a single match.',
    playerCount: 3,
    aiRaces: ['achar', 'brakkat'],
    asteroidCount: 5,
    startingResources: starter(20_000),
    victoryConditions: ['corporateLoyalty', 'survivor'],
    timeLimitDays: 180,
    objectives: [],
  },
  [SCENARIO_IDS.classicSkirmish]: {
    id: SCENARIO_IDS.classicSkirmish,
    displayName: 'Classic Skirmish',
    description:
      'One human vs five AI on a 15-asteroid sector. No time cap. All five victory conditions eligible.',
    playerCount: 6,
    aiRaces: ['kryll', 'motkaj', 'achar', 'brakkat', 'rigal'],
    asteroidCount: 15,
    startingResources: starter(25_000),
    victoryConditions: [
      'corporateLoyalty',
      'independence',
      'scientificSupremacy',
      'militaryDominance',
      'survivor',
    ],
    timeLimitDays: null,
    objectives: [],
  },
  [SCENARIO_IDS.advancedPrimer]: {
    id: SCENARIO_IDS.advancedPrimer,
    displayName: 'Advanced Primer — Shadow Portfolio',
    description:
      'Unlocked after the first completed match. Teaches espionage, Asteroid Engines, and blackmail across a 10-asteroid mid-tier map.',
    playerCount: 5,
    aiRaces: ['kryll', 'motkaj', 'rigal', 'brakkat'],
    asteroidCount: 10,
    startingResources: starter(40_000),
    victoryConditions: ['militaryDominance', 'scientificSupremacy', 'survivor'],
    timeLimitDays: 240,
    objectives: [
      {
        id: 'obj.primer.espionage',
        description: 'Complete a recon mission against any rival.',
        trigger: 'espionageMission',
        params: { mission: 'recon' },
        rewardCredits: 3_000,
      },
      {
        id: 'obj.primer.asteroid-engine',
        description: 'Bolt an Asteroid Engine onto one of your own asteroids.',
        trigger: 'buildingConstructed',
        params: { kind: 'bld.asteroid-engine' },
        rewardCredits: 5_000,
      },
      {
        id: 'obj.primer.ram',
        description: 'Launch your asteroid at an enemy (or receive one — optional).',
        trigger: 'asteroidEngineFired',
        optional: true,
      },
    ],
    triggers: [
      // 30 s in (600 ticks @ 20 Hz) the Federal Council issues a free-trade subsidy.
      {
        kind: 'creditGrant',
        at: 600,
        recipient: asPlayerId('p.human'),
        credits: 2500,
      },
    ],
  },
  [SCENARIO_IDS.federationWar]: {
    id: SCENARIO_IDS.federationWar,
    displayName: 'Federation War — All Hands',
    description:
      'Full cast. One human + six AI, 20 asteroids, every mechanic enabled including Mauna aggression from day one.',
    playerCount: 7,
    aiRaces: ['kryll', 'motkaj', 'achar', 'brakkat', 'rigal', 'mauna'],
    asteroidCount: 20,
    startingResources: starter(30_000),
    victoryConditions: [
      'corporateLoyalty',
      'independence',
      'scientificSupremacy',
      'militaryDominance',
      'survivor',
    ],
    timeLimitDays: null,
    objectives: [],
    triggers: [
      // The first AI declares war on the human at t=2000 to ensure the
      // scenario starts hot rather than slow-roll.
      {
        kind: 'setRelation',
        at: 2000,
        from: asPlayerId('p.ai.1.kryll'),
        to: asPlayerId('p.human'),
        reputation: -80,
      },
    ],
  },
} as const satisfies Readonly<Record<ScenarioId, ScenarioDef>>;

export const SCENARIOS_LIST: readonly ScenarioDef[] = Object.values(SCENARIOS);
