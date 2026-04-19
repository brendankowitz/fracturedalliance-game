export type DifficultyLevel = "easy" | "normal" | "hard" | "brutal" | "nightmare";

export interface DifficultyPreset {
  readonly label: string;
  readonly humanStartCredits: number;
  readonly aiCreditMultiplier: number;
  readonly aiAggressionBonus: number;
}

export const DIFFICULTY_PRESETS: Record<DifficultyLevel, DifficultyPreset> = {
  easy: { label: "Easy", humanStartCredits: 20000, aiCreditMultiplier: 0.6, aiAggressionBonus: -0.2 },
  normal: { label: "Normal", humanStartCredits: 10000, aiCreditMultiplier: 1.0, aiAggressionBonus: 0.0 },
  hard: { label: "Hard", humanStartCredits: 8000, aiCreditMultiplier: 1.4, aiAggressionBonus: 0.1 },
  brutal: { label: "Brutal", humanStartCredits: 6000, aiCreditMultiplier: 1.8, aiAggressionBonus: 0.2 },
  nightmare: { label: "Nightmare", humanStartCredits: 4000, aiCreditMultiplier: 2.5, aiAggressionBonus: 0.4 },
};
