import type { BlueprintId } from "./ids.ts";

export type BlueprintDiscipline = "mining" | "infrastructure" | "military" | "science" | "commerce";

export interface BlueprintDef {
  readonly id: BlueprintId;
  readonly label: string;
  readonly description: string;
  readonly discipline: BlueprintDiscipline;
  readonly tier: number;
  readonly costCredits: number;
  readonly prerequisiteId: BlueprintId | null;
}
