import type { ScenarioId } from './ids';
import type { Resources } from './resources';
import type { ScriptedTrigger } from './scriptedTriggers';

export type VictoryCondition =
  | 'corporateLoyalty'
  | 'independence'
  | 'scientificSupremacy'
  | 'militaryDominance'
  | 'survivor';

/**
 * ObjectiveTrigger — union of trigger kinds the tutorial runner evaluates
 * each tick. The legacy names (`buildingConstructed`, `treatySigned`, …)
 * are retained for back-compat with the skirmish/primer scenarios and are
 * aliased in the runner to their `onX` equivalents. Phase 12 introduced
 * the crisp `onBuild|onResearch|onMine|onTick|onCommand|onCombat` set
 * used by the tutorial script.
 */
export type ObjectiveTrigger =
  | 'onBuild'
  | 'onResearch'
  | 'onMine'
  | 'onTick'
  | 'onCommand'
  | 'onCombat'
  | 'buildingConstructed'
  | 'asteroidColonised'
  | 'tradeCompleted'
  | 'blueprintPurchased'
  | 'shipBuilt'
  | 'raceMet'
  | 'treatySigned'
  | 'espionageMission'
  | 'asteroidEngineFired';

export interface ScenarioObjective {
  id: string;
  description: string;
  trigger: ObjectiveTrigger;
  /** Inline contextual hint shown in the tutorial overlay bubble. */
  hint?: string;
  /** Free-form parameter bag interpreted by the scenario runner. */
  params?: Readonly<Record<string, string | number | boolean>>;
  /** Reward credited on completion (preferred name). */
  completionReward?: number;
  /** @deprecated use `completionReward`. Retained for older scenarios. */
  rewardCredits?: number;
  optional?: boolean;
}

export type ScenarioKind = 'tutorial' | 'primer' | 'skirmish' | 'campaign';

export interface ScenarioDef {
  id: ScenarioId;
  displayName: string;
  description: string;
  /** Human + AI seats including the player. */
  playerCount: number;
  /** AI race ids (see RaceDef.id). Length must equal playerCount − 1. */
  aiRaces: readonly string[];
  asteroidCount: number;
  startingResources: Resources;
  victoryConditions: readonly VictoryCondition[];
  /** Sim-day cap, null = unlimited. */
  timeLimitDays: number | null;
  /** Scripted objective sequence (tutorial/primer). May be empty for free-form skirmish. */
  objectives: readonly ScenarioObjective[];
  /** Classification — flips the tutorial runner on in the sim. */
  kind?: ScenarioKind;
  /** Phase 0.2 — designer-authored scripted triggers (spec §G). */
  triggers?: readonly ScriptedTrigger[];
}
