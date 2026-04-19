import type { OreKind } from "./types.ts";

export interface RacePersonality {
  aggression: number;
  grudgeDecayPerDay: number;
  tradeBias: number;
  techBias: number;
  expansionBias: number;
  treatyRespect: number;
  ramWillingness: number;
}

export interface RaceDef {
  readonly id: string;
  readonly name: string;
  readonly personality: RacePersonality;
  readonly tradeLove: ReadonlyArray<OreKind>;
  readonly tradeHate: ReadonlyArray<OreKind>;
  readonly federationMember: boolean;
  readonly playable: boolean;
}
