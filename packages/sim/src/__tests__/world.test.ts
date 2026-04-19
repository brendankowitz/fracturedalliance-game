import { asteroidId } from "@fa/domain";
import { describe, expect, it } from "vitest";
import { createWorld } from "../world.ts";

describe("createWorld", () => {
  it("produces a world with at least one asteroid", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    expect(world.asteroids.size).toBeGreaterThan(0);
  });

  it("produces a world with at least one player", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    expect(world.players.size).toBeGreaterThan(0);
  });

  it("player starts with a CPU building on their asteroid", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const [player] = world.players.values();
    const playerAsteroids = [...world.asteroids.values()].filter((a) => a.ownerId === player?.id);
    expect(playerAsteroids.length).toBeGreaterThan(0);
    const cpuBuildings = [...world.buildings.values()].filter((b) => b.defKind === "cpu");
    expect(cpuBuildings.length).toBeGreaterThan(0);
  });

  it("world tick starts at 0", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    expect(world.tick).toBe(0);
  });

  it("same seed produces structurally identical worlds", () => {
    const a = createWorld({ seed: 42, humanPlayerRaceId: "helionCorp" });
    const b = createWorld({ seed: 42, humanPlayerRaceId: "helionCorp" });
    expect(a.asteroids.size).toBe(b.asteroids.size);
    expect(a.tick).toBe(b.tick);
    expect([...a.players.values()][0]?.credits).toBe([...b.players.values()][0]?.credits);
  });

  it("player starts with positive credits", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const [player] = world.players.values();
    expect(player?.credits).toBeGreaterThan(0);
  });

  it("starter asteroid has selenium deposits", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const [player] = world.players.values();
    const starterAsteroid = [...world.asteroids.values()].find((a) => a.ownerId === player?.id);
    expect(starterAsteroid?.deposits.selenium).toBeGreaterThan(0);
  });

  it("human player has isHuman set to true", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const player = [...world.players.values()].find((p) => p.isHuman);
    expect(player).toBeDefined();
    expect(player?.isHuman).toBe(true);
  });

  it("starter CPU building is fully constructed and active", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const cpu = [...world.buildings.values()].find((b) => b.defKind === "cpu");
    expect(cpu?.constructionProgress).toBe(1);
    expect(cpu?.active).toBe(true);
  });

  it("starter asteroid has all four Phase 1 ores", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const starter = world.asteroids.get(asteroidId("asteroid-0"));
    if (!starter) throw new Error("starter asteroid not found");
    expect(starter.deposits.selenium).toBeGreaterThan(0);
    expect(starter.deposits.asteros).toBeGreaterThan(0);
    expect(starter.deposits.barium).toBeGreaterThan(0);
    expect(starter.deposits.crystalite).toBeGreaterThan(0);
  });
});
