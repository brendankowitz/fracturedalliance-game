import type { BlueprintId, PlayerId } from "./ids.ts";

export interface AiEventRecord {
  readonly tick: number;
  readonly kind: string;
  readonly data: Record<string, unknown>;
}

export interface Player {
  readonly id: PlayerId;
  readonly raceId: string;
  readonly isHuman: boolean;
  credits: number;
  reputation: Map<PlayerId, number>;
  federationStanding: number;
  blueprintsOwned: Set<BlueprintId>;
  eventLog: AiEventRecord[];
  alive: boolean;
  suspicion: number;
}
