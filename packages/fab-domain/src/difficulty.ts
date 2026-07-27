/**
 * Stream E3 — Difficulty modifiers.
 *
 * The three game-wide difficulty tiers are exposed to players via the
 * MainMenu. They scale a small set of multipliers consumed by the sim
 * and AI runtime so we can tune balance without forking scenarios.
 *
 * `DIFFICULTY_MODIFIERS` is the *only* place to add new knobs — every
 * consumer reads from this table to keep determinism predictable. All
 * multiplications happen at a single integration site each (see e.g.
 * `populateFromScenario` for `startingResources`) so a save written on
 * one difficulty replays identically on the same difficulty.
 */
export type Difficulty = 'easy' | 'normal' | 'hard';

export interface DifficultyModifiers {
  /** Multiplier applied to scenario.startingResources.credits. */
  readonly startingResources: number;
  /**
   * Multiplier applied to AI utility scores for combat-flavoured
   * actions (declareWar, dispatchFleet, launchMissile, produceShip).
   * 1.0 leaves AI play unchanged; <1 makes them more passive, >1
   * makes them more aggressive.
   */
  readonly aiAggression: number;
  /** Multiplier applied to scenario.timeLimitDays for the survival victory. */
  readonly timeLimit: number;
}

export const DIFFICULTY_MODIFIERS: Record<Difficulty, DifficultyModifiers> = {
  easy: { startingResources: 1.5, aiAggression: 0.6, timeLimit: 1.5 },
  normal: { startingResources: 1.0, aiAggression: 1.0, timeLimit: 1.0 },
  hard: { startingResources: 0.7, aiAggression: 1.4, timeLimit: 0.75 },
};

export const DEFAULT_DIFFICULTY: Difficulty = 'normal';

export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];

export const isDifficulty = (value: unknown): value is Difficulty =>
  value === 'easy' || value === 'normal' || value === 'hard';
