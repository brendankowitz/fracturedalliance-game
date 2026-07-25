import type { PlayerId, TreatyId } from './ids';

export type TreatyKind =
  | 'nonAggression'
  | 'noCovert'
  | 'trade'
  | 'openBorders'
  | 'defensivePact'
  | 'jointWar'
  | 'peace';

export interface Treaty {
  id: TreatyId;
  parties: [PlayerId, PlayerId];
  kind: TreatyKind;
  signedTick: number;
  expiresTick?: number;
  metadata?: Record<string, unknown>;
}
