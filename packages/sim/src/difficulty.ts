import type { DifficultyLevel } from "@fa/domain";

export type { DifficultyLevel };

export interface DifficultyPreset {
  readonly label: string;
  readonly humanStartCredits: number;
  readonly aiCreditMultiplier: number;
  readonly aiAggressionBonus: number;
  readonly traderGenerosity: number;
  readonly federationGracePeriod: number;
  readonly maunaActive: boolean;
}

export const DIFFICULTY_PRESETS: Record<DifficultyLevel, DifficultyPreset> = {
  intern: {
    label: "Intern",
    humanStartCredits: 25000,
    aiCreditMultiplier: 0.4,
    aiAggressionBonus: -0.3,
    traderGenerosity: 1.2,
    federationGracePeriod: 3000,
    maunaActive: false,
  },
  manager: {
    label: "Manager",
    humanStartCredits: 15000,
    aiCreditMultiplier: 0.8,
    aiAggressionBonus: -0.1,
    traderGenerosity: 1.0,
    federationGracePeriod: 2000,
    maunaActive: false,
  },
  director: {
    label: "Director",
    humanStartCredits: 10000,
    aiCreditMultiplier: 1.2,
    aiAggressionBonus: 0.1,
    traderGenerosity: 0.9,
    federationGracePeriod: 1000,
    maunaActive: false,
  },
  ceo: {
    label: "CEO",
    humanStartCredits: 7000,
    aiCreditMultiplier: 1.6,
    aiAggressionBonus: 0.2,
    traderGenerosity: 0.7,
    federationGracePeriod: 500,
    maunaActive: true,
  },
  board: {
    label: "Board",
    humanStartCredits: 4000,
    aiCreditMultiplier: 2.2,
    aiAggressionBonus: 0.35,
    traderGenerosity: 0.5,
    federationGracePeriod: 200,
    maunaActive: true,
  },
};
