import type { OreKind } from './resources';

export interface RacePersonality {
  aggression: number;
  grudgeDecayPerDay: number;
  tradeBias: number;
  techBias: number;
  expansionBias: number;
  treatyRespect: number;
  ramWillingness: number;
}

export type RaceDisposition =
  | 'player'
  | 'aggressive-principled'
  | 'aggressive-opportunist'
  | 'peaceful-trader'
  | 'neutral-reactive'
  | 'peaceful-scientist'
  | 'hostile-outlaw';

export type TradeHateTag = OreKind | 'luxuryGoods' | 'food' | 'missiles' | 'weapons';

export interface RaceDef {
  id: string;
  name: string;
  originalAnalogue: string;
  disposition: RaceDisposition;
  federationMember: boolean;
  tradeLove: readonly (OreKind | 'allOres')[];
  tradeHate: readonly TradeHateTag[];
  personality: RacePersonality;
  colour: string;
  /** Short in-lore flavour blurb for UI. */
  flavour: string;
}
