import type { BlueprintId } from './ids';

export type BlueprintDiscipline = 'extraction' | 'power' | 'defence' | 'offence' | 'logistics';
export type BlueprintTier = 1 | 2 | 3 | 4;

export interface BlueprintDef {
  id: BlueprintId;
  displayName: string;
  discipline: BlueprintDiscipline;
  tier: BlueprintTier;
  costCredits: number;
  /** Sim-ticks to research at base speed (≈20 ticks/sec). */
  researchTimeTicks?: number;
  requires: BlueprintId[];
  unlocks: string[];
  description: string;
  flavour?: string;
}
