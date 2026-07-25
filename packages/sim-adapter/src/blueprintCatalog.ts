/**
 * UI-facing projection of the vendored blueprint catalogue. Keeps apps/web
 * off @fab/content directly — the adapter package remains the only seam.
 */

import { BLUEPRINTS_LIST, RACES } from "@fab/content";

export interface BlueprintCatalogEntry {
  id: string;
  label: string;
  discipline: string;
  tier: number;
  costCredits: number;
  researchTimeTicks: number;
  requires: readonly string[];
  description: string;
}

export const BLUEPRINT_CATALOG: readonly BlueprintCatalogEntry[] = BLUEPRINTS_LIST.map((bp) => ({
  id: bp.id,
  label: bp.displayName,
  discipline: bp.discipline,
  tier: bp.tier,
  costCredits: bp.costCredits,
  researchTimeTicks: bp.researchTimeTicks ?? 0,
  requires: bp.requires,
  description: bp.description,
}));

export const BLUEPRINT_DISCIPLINES: readonly string[] = [
  ...new Set(BLUEPRINT_CATALOG.map((b) => b.discipline)),
];

/** Race id → display name for the vendored race roster. */
export const RACE_LABELS: Readonly<Record<string, string>> = Object.fromEntries(
  RACES.map((r) => [r.id, r.name]),
);
