import type { PlayerId } from './ids';

/** The five canonical victory conditions (spec §H). */
export type VictoryKind = 'economic' | 'military' | 'diplomatic' | 'scientific' | 'survival';

export interface GameOutcome {
  winnerId: PlayerId;
  condition: VictoryKind;
  atTick: number;
}
