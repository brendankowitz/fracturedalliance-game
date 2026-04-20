import type { BlueprintId, PlayerId } from "./ids.ts";
import type { PartialOreRecord } from "./types.ts";

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
  oreInventory: PartialOreRecord<number>;
  reputation: Map<PlayerId, number>;
  federationStanding: number;
  blueprintsOwned: Set<BlueprintId>;
  eventLog: AiEventRecord[];
  alive: boolean;
  suspicion: number;
  licenseRevoked: boolean;
  /** Kryll Collective: set to true after a successful accusation; cleared after next combat attack grants +25% damage */
  accusationBonusActive?: boolean;
  /** Achar Gatherings: world tick before which Achar will not initiate attacks */
  gracePeriodUntil?: number;
}
