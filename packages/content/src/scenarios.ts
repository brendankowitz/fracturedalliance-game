import type { DifficultyLevel } from "@fa/domain";

export interface Scenario {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly seed: number;
  readonly difficulty: DifficultyLevel;
}

export const SCENARIOS: readonly Scenario[] = [
  {
    id: "asteroid-rush",
    name: "Asteroid Rush",
    description:
      "A balanced opening with contested mid-field asteroids. Standard resources, three rival factions. Best introduction to the game.",
    seed: 42,
    difficulty: "manager",
  },
  {
    id: "iron-fist",
    name: "Iron Fist",
    description:
      "Two powerful AI warlords dominate the belt. Human resources are tight and early aggression is likely. Recommended for veterans.",
    seed: 7331,
    difficulty: "director",
  },
  {
    id: "last-stand",
    name: "Last Stand",
    description:
      "The human colony is cornered and outnumbered from the start. Survive long enough to turn the tide. Merciless.",
    seed: 999,
    difficulty: "ceo",
  },
  {
    id: "advanced-primer",
    name: "Advanced Primer",
    description: "Master espionage, asteroid engines, and blackmail.",
    seed: 987654,
    difficulty: "director",
  },
] as const;
