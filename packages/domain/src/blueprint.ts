export type BlueprintDiscipline = "mining" | "infrastructure" | "military" | "science" | "commerce";

export interface BlueprintDef {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly discipline: BlueprintDiscipline;
  readonly tier: number;
  readonly costCredits: number;
  readonly prerequisiteId: string | null;
}
