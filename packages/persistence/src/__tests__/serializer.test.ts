import { describe, expect, it } from "vitest";
import { deserialize, serialize } from "../serializer.ts";

const SAMPLE_SAVE = {
  schemaVersion: 1 as const,
  gameVersion: "0.1.0",
  createdAtIso: "2024-01-01T00:00:00.000Z",
  playerName: "Test",
  verdict: "inProgress" as const,
  difficulty: "manager" as const,
  rngSeed: 42,
  rngState: 99,
  worldSnapshot: { tick: 10, asteroids: [], players: [] },
  uiPrefs: {},
};

describe("serializer", () => {
  it("serialize produces a non-empty Uint8Array", () => {
    const bytes = serialize(SAMPLE_SAVE);
    expect(bytes.length).toBeGreaterThan(0);
  });

  it("deserialize round-trips correctly", () => {
    const bytes = serialize(SAMPLE_SAVE);
    const restored = deserialize(bytes);
    expect(restored).toEqual(SAMPLE_SAVE);
  });
});
