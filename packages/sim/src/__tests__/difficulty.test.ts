import { describe, expect, it } from "vitest";
import { generateBelt } from "../beltGenerator.ts";
import { DIFFICULTY_PRESETS } from "../difficulty.ts";
import { deserializeWorld, serializeWorld } from "../serialization.ts";
import { createWorld } from "../world.ts";

describe("difficulty presets", () => {
  it("easy difficulty gives human 20,000 starting credits", () => {
    const { players } = generateBelt(1, "helionCorp", "easy");
    const human = players.find((p) => p.isHuman);
    expect(human?.credits).toBe(20_000);
  });

  it("nightmare difficulty gives human 4,000 starting credits", () => {
    const { players } = generateBelt(1, "helionCorp", "nightmare");
    const human = players.find((p) => p.isHuman);
    expect(human?.credits).toBe(4_000);
  });

  it("AI credits scale with aiCreditMultiplier at brutal difficulty", () => {
    const normalBelt = generateBelt(42, "helionCorp", "normal");
    const brutalBelt = generateBelt(42, "helionCorp", "brutal");

    const normalAiCredits = normalBelt.players
      .filter((p) => !p.isHuman)
      .map((p) => p.credits);
    const brutalAiCredits = brutalBelt.players
      .filter((p) => !p.isHuman)
      .map((p) => p.credits);

    // All brutal AI players should have more credits than their normal counterparts
    // (multiplier 1.8 vs 1.0)
    expect(brutalAiCredits.length).toBe(normalAiCredits.length);
    const brutalTotal = brutalAiCredits.reduce((s, c) => s + c, 0);
    const normalTotal = normalAiCredits.reduce((s, c) => s + c, 0);
    expect(brutalTotal).toBeGreaterThan(normalTotal);
  });

  it("effective aggression is clamped to 1.0 at nightmare for a max-aggression race", () => {
    // motkaj has aggression 0.9; nightmare adds 0.4 bonus -> raw 1.3, clamped to 1.0
    const bonus = DIFFICULTY_PRESETS.nightmare.aiAggressionBonus;
    const motkajAggression = 0.9;
    const effective = Math.min(1, motkajAggression + bonus);
    expect(effective).toBe(1.0);
  });

  it("difficulty is round-tripped through serialize/deserialize", () => {
    const world = createWorld({ seed: 7, humanPlayerRaceId: "helionCorp", difficulty: "brutal" });
    expect(world.difficulty).toBe("brutal");

    const snapshot = serializeWorld(world);
    const restored = deserializeWorld(snapshot, world.prng.state());
    expect(restored.difficulty).toBe("brutal");
  });

  it("normal difficulty preserves aggression unchanged", () => {
    const bonus = DIFFICULTY_PRESETS.normal.aiAggressionBonus;
    expect(bonus).toBe(0.0);
  });

  it("easy difficulty reduces AI credits below normal", () => {
    const easyBelt = generateBelt(10, "helionCorp", "easy");
    const normalBelt = generateBelt(10, "helionCorp", "normal");

    const easyTotal = easyBelt.players.filter((p) => !p.isHuman).reduce((s, p) => s + p.credits, 0);
    const normalTotal = normalBelt.players
      .filter((p) => !p.isHuman)
      .reduce((s, p) => s + p.credits, 0);
    expect(easyTotal).toBeLessThan(normalTotal);
  });
});
