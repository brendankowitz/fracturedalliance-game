import type { BlueprintId, PlayerId } from './ids';
import type { OreKind } from './resources';

export interface ActiveResearch {
  blueprintId: BlueprintId;
  remainingTicks: number;
  totalTicks: number;
}

/** Federal-Transporter-routed market order, queued by the player. */
export interface MarketOrder {
  id: string;
  side: 'sell' | 'buy';
  ore: OreKind;
  tonnes: number;
  /** Colony that source/receives the ore. */
  asteroid: import('./ids').AsteroidId;
  /** Tick on which the order was queued; used for FIFO resolution. */
  placedTick: number;
}

export type AiEvent =
  | { tick: number; kind: 'attacked'; by: PlayerId }
  | { tick: number; kind: 'treatyBroken'; by: PlayerId; treaty: string }
  | { tick: number; kind: 'tradedWith'; with: PlayerId; creditsDelta: number }
  | { tick: number; kind: 'gifted'; from: PlayerId; creditsDelta: number }
  | { tick: number; kind: 'asteroidRammed'; by: PlayerId }
  | { tick: number; kind: 'spyCaught'; by: PlayerId };

export interface Player {
  id: PlayerId;
  raceId: string;
  isHuman: boolean;
  credits: number;
  /** -100..+100 per opposing PlayerId. Missing entries default to 0. */
  reputation: Record<string, number>;
  /** -100..+100. Corporate Federation standing. Meaningful only for Terran players. */
  federationStanding: number;
  blueprintsOwned: Set<BlueprintId>;
  /** Rolling 24-sim-month event log. Older entries pruned by the sim. */
  eventLog: AiEvent[];
  alive: boolean;
  /** 0..100 black-market suspicion meter. */
  suspicion: number;
  /** Currently researching blueprint, or null. */
  activeResearch: ActiveResearch | null;
  /** Queued Federal Transporter orders. */
  marketOrders: MarketOrder[];
  /** Cumulative credit income since match start. Tracked for Corporate victory. */
  totalCreditsEarned: number;
  /** Consecutive ticks this player has held "economic control" (≥3 ore monopolies). */
  economicControlTicks: number;
}
