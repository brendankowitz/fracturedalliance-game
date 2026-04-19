import type { OreKind } from "./types.ts";

export interface RacePersonality {
  readonly aggression: number;           // 0-1
  readonly grudgeDecayPerDay: number;    // 0-1
  readonly tradeBias: number;            // 0-1
  readonly techBias: number;             // 0-1
  readonly expansionBias: number;        // 0-1
  readonly treatyRespect: number;        // 0-1
  readonly ramWillingness: number;       // 0-1
  readonly blackMarketAffinity: number;  // 0-1, propensity to trade on black market
  readonly bribeReceptiveness: number;   // 0-1, willingness to accept bribes/deals
  readonly grudgeThreshold: number;      // 0-1, reputation damage needed to form a grudge (lower = easier to anger)
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
