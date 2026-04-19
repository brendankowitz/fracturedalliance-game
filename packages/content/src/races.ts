import type { RaceDef } from "@fa/domain";
import rawRaces from "../data/races.json" with { type: "json" };

type JsonRace = (typeof rawRaces)[number];

const PERSONALITY_FIELDS = [
  "aggression",
  "grudgeDecayPerDay",
  "tradeBias",
  "techBias",
  "expansionBias",
  "treatyRespect",
  "ramWillingness",
  "blackMarketAffinity",
  "bribeReceptiveness",
  "grudgeThreshold",
] as const;

function validateRace(raw: JsonRace): RaceDef {
  if (!raw.id || typeof raw.id !== "string") throw new Error(`Race entry missing "id"`);
  if (!raw.name || typeof raw.name !== "string") throw new Error(`Race "${raw.id}" missing "name"`);
  for (const field of PERSONALITY_FIELDS) {
    const val = raw.personality[field];
    if (typeof val !== "number" || val < 0 || val > 1) {
      throw new Error(`Race "${raw.id}" has invalid personality.${field}: ${val}`);
    }
  }
  return raw as unknown as RaceDef;
}

const allRaceDefs: RaceDef[] = rawRaces.map(validateRace);
const raceIndex = new Map<string, RaceDef>(allRaceDefs.map((r) => [r.id, r]));

export function getRaceDef(id: string): RaceDef | undefined {
  return raceIndex.get(id);
}

export function getAllRaceDefs(): ReadonlyArray<RaceDef> {
  return allRaceDefs;
}
