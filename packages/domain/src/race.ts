import type { OreKind } from "./types.ts";

export interface RacePersonality {
  readonly aggression: number;
  readonly grudgeDecayPerDay: number;
  readonly tradeBias: number;
  readonly techBias: number;
  readonly expansionBias: number;
  readonly treatyRespect: number;
  readonly ramWillingness: number;
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
