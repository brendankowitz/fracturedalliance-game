import type { PlayerId, TreatyId } from './ids.ts';

export type TreatyKind =
  | 'nonAggression' | 'noCovert'      | 'trade'
  | 'openBorders'   | 'defensivePact' | 'jointWar' | 'peace';

export interface Treaty {
  readonly id: TreatyId;
  readonly parties: readonly [PlayerId, PlayerId];
  readonly kind: TreatyKind;
  readonly signedTick: number;
  readonly expiresTick?: number;
}
