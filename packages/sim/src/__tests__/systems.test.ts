import { buildingId } from "@fa/domain";
import { describe, expect, it } from "vitest";
import { tickMining } from "../systems/miningSystem.ts";
import { computePowerBalance } from "../systems/resourceSystem.ts";
import { createWorld } from "../world.ts";

describe("miningSystem", () => {
  it("active Mine Mk1 extracts selenium each tick", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const [asteroid] = world.asteroids.values();
    if (!asteroid) throw new Error("expected asteroid");

    const mineId = buildingId("test-mine");
    world.buildings.set(mineId, {
      id: mineId,
      defKind: "mineMk1",
      asteroidId: asteroid.id,
      cell: { x: 1, y: 1 },
      hp: 100,
      maxHp: 100,
      constructionProgress: 1,
      active: true,
      damage: 0,
    });
    // Manually push to the buildings array (ReadonlyArray — cast needed)
    (asteroid.buildings as unknown as string[]).push(mineId);

    const beforeSelenium = asteroid.deposits.selenium ?? 0;
    tickMining(world);
    const afterSelenium = asteroid.deposits.selenium ?? 0;

    expect(afterSelenium).toBeLessThan(beforeSelenium);
  });

  it("inactive mine does not extract ore", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const [asteroid] = world.asteroids.values();
    if (!asteroid) throw new Error("expected asteroid");

    const mineId = buildingId("inactive-mine");
    world.buildings.set(mineId, {
      id: mineId,
      defKind: "mineMk1",
      asteroidId: asteroid.id,
      cell: { x: 2, y: 2 },
      hp: 100,
      maxHp: 100,
      constructionProgress: 1,
      active: false,
      damage: 0,
    });
    (asteroid.buildings as unknown as string[]).push(mineId);

    const beforeSelenium = asteroid.deposits.selenium ?? 0;
    tickMining(world);
    const afterSelenium = asteroid.deposits.selenium ?? 0;

    expect(afterSelenium).toBe(beforeSelenium);
  });

  it("under-construction mine does not extract ore", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const [asteroid] = world.asteroids.values();
    if (!asteroid) throw new Error("expected asteroid");

    const mineId = buildingId("wip-mine");
    world.buildings.set(mineId, {
      id: mineId,
      defKind: "mineMk1",
      asteroidId: asteroid.id,
      cell: { x: 3, y: 2 },
      hp: 100,
      maxHp: 100,
      constructionProgress: 0.5,
      active: true,
      damage: 0,
    });
    (asteroid.buildings as unknown as string[]).push(mineId);

    const beforeSelenium = asteroid.deposits.selenium ?? 0;
    tickMining(world);
    const afterSelenium = asteroid.deposits.selenium ?? 0;

    expect(afterSelenium).toBe(beforeSelenium);
  });

  it("mine does not extract more than the remaining deposit", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const [asteroid] = world.asteroids.values();
    if (!asteroid) throw new Error("expected asteroid");

    // Nearly depleted deposit
    (asteroid.deposits as Record<string, number>).selenium = 0.1;

    const mineId = buildingId("greedy-mine");
    world.buildings.set(mineId, {
      id: mineId,
      defKind: "mineMk1",
      asteroidId: asteroid.id,
      cell: { x: 4, y: 4 },
      hp: 100,
      maxHp: 100,
      constructionProgress: 1,
      active: true,
      damage: 0,
    });
    (asteroid.buildings as unknown as string[]).push(mineId);

    tickMining(world);

    expect(asteroid.deposits.selenium).toBeGreaterThanOrEqual(0);
  });
});

describe("resourceSystem", () => {
  it("computePowerBalance returns negative for CPU alone (no generators)", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const [asteroid] = world.asteroids.values();
    if (!asteroid) throw new Error("expected asteroid");
    const balance = computePowerBalance(world, asteroid.id);
    // CPU costs -5 power
    expect(balance).toBe(-5);
  });

  it("power balance includes all active buildings", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const [asteroid] = world.asteroids.values();
    if (!asteroid) throw new Error("expected asteroid");

    const plantId = buildingId("test-plant");
    world.buildings.set(plantId, {
      id: plantId,
      defKind: "powerPlant",
      asteroidId: asteroid.id,
      cell: { x: 1, y: 1 },
      hp: 100,
      maxHp: 100,
      constructionProgress: 1,
      active: true,
      damage: 0,
    });
    (asteroid.buildings as unknown as string[]).push(plantId);

    const balance = computePowerBalance(world, asteroid.id);
    // CPU: -5, Power Plant: +10 → +5
    expect(balance).toBe(5);
  });

  it("inactive buildings are not counted in power balance", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const [asteroid] = world.asteroids.values();
    if (!asteroid) throw new Error("expected asteroid");

    const plantId = buildingId("inactive-plant");
    world.buildings.set(plantId, {
      id: plantId,
      defKind: "powerPlant",
      asteroidId: asteroid.id,
      cell: { x: 1, y: 1 },
      hp: 100,
      maxHp: 100,
      constructionProgress: 1,
      active: false,
      damage: 0,
    });
    (asteroid.buildings as unknown as string[]).push(plantId);

    const balance = computePowerBalance(world, asteroid.id);
    // Inactive plant not counted, only CPU: -5
    expect(balance).toBe(-5);
  });
});
