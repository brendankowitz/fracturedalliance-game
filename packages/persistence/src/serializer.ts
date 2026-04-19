import { deflate, inflate } from "pako";

export type Verdict = "inProgress" | "won" | "lost";
export type Difficulty = "intern" | "manager" | "director" | "ceo" | "board";

export interface SaveV1 {
  schemaVersion: 1;
  gameVersion: string;
  createdAtIso: string;
  playerName: string;
  verdict: Verdict;
  difficulty: Difficulty;
  rngSeed: number;
  rngState: number;
  worldSnapshot: Record<string, unknown>;
  uiPrefs: Record<string, unknown>;
}

export function serialize(save: SaveV1): Uint8Array {
  const json = JSON.stringify(save);
  return deflate(json);
}

export function deserialize(bytes: Uint8Array): SaveV1 {
  const json = inflate(bytes, { to: "string" });
  return JSON.parse(json) as SaveV1;
}
