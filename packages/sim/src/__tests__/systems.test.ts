import { type AsteroidId, buildingId } from "@fa/domain";
import { describe, expect, it } from "vitest";
import { applyCommand } from "../commandProcessor.ts";
import { tickConstruction } from "../systems/constructionSystem.ts";
import { tickMining } from "../systems/miningSystem.ts";
import { computePowerBalance, tickResources } from "../systems/resourceSystem.ts";
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
    asteroid.buildings.push(mineId);

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
    asteroid.buildings.push(mineId);

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
    asteroid.buildings.push(mineId);

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
    asteroid.buildings.push(mineId);

    tickMining(world);

    expect(asteroid.deposits.selenium).toBeGreaterThanOrEqual(0);
  });
});

describe("constructionSystem", () => {
  it("completes a building after its build time ticks", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const [asteroid] = world.asteroids.values();
    if (!asteroid) throw new Error("expected asteroid");

    applyCommand(world, {
      kind: "placeBuilding",
      asteroidId: asteroid.id,
      buildingKind: "powerPlant",
      cell: { x: 2, y: 2 },
    });

    expect(asteroid.buildQueue.length).toBe(1);

    const firstItem = asteroid.buildQueue[0];
    if (!firstItem) throw new Error("expected build queue item");
    const totalTicks = firstItem.totalTicks;
    for (let i = 0; i < totalTicks; i++) tickConstruction(world);

    expect(asteroid.buildQueue.length).toBe(0);

    const powerPlant = [...world.buildings.values()].find((b) => b.defKind === "powerPlant");
    expect(powerPlant?.constructionProgress).toBe(1);
    expect(powerPlant?.id).toBeDefined();
    expect(asteroid.buildings).toContain(powerPlant?.id);

    const doneEvent = world.eventQueue.find((e) => e.kind === "construction.done");
    expect(doneEvent).toBeDefined();
    if (doneEvent?.kind === "construction.done") {
      expect(doneEvent.buildingKind).toBe("powerPlant");
      expect(doneEvent.asteroidId).toBe(asteroid.id);
    }
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
    asteroid.buildings.push(plantId);

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
    asteroid.buildings.push(plantId);

    const balance = computePowerBalance(world, asteroid.id);
    // Inactive plant not counted, only CPU: -5
    expect(balance).toBe(-5);
  });

  it("computePowerBalance ignores under-construction buildings", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const [asteroid] = world.asteroids.values();
    if (!asteroid) throw new Error("expected asteroid");

    const plantId = buildingId("wip-plant");
    world.buildings.set(plantId, {
      id: plantId,
      defKind: "powerPlant",
      asteroidId: asteroid.id,
      cell: { x: 1, y: 1 },
      hp: 100,
      maxHp: 100,
      constructionProgress: 0.5,
      active: true,
      damage: 0,
    });
    asteroid.buildings.push(plantId);

    const balance = computePowerBalance(world, asteroid.id);
    // Under-construction plant not counted, only CPU: -5
    expect(balance).toBe(-5);
  });
});

describe("resourceSystem — life support & happiness", () => {
  function makeBuilding(
    id: string,
    kind: string,
    asteroidId: AsteroidId,
    cell = { x: 1, y: 1 },
  ) {
    return {
      id: buildingId(id),
      defKind: kind,
      asteroidId,
      cell,
      hp: 100,
      maxHp: 100,
      constructionProgress: 1,
      active: true,
      damage: 0,
    };
  }

  it("pleasure dome increases happiness each tick", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const asteroid = [...world.asteroids.values()].find((a) => a.ownerId !== null);
    if (!asteroid) throw new Error("expected owned asteroid");

    asteroid.happiness = 50;
    const domeId = buildingId("test-dome");
    world.buildings.set(domeId, makeBuilding("test-dome", "pleasureDome", asteroid.id));
    asteroid.buildings.push(domeId);

    const before = asteroid.happiness;
    tickResources(world);
    expect(asteroid.happiness).toBeGreaterThan(before);
  });

  it("insufficient food reduces happiness when pop cap > 0", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const asteroid = [...world.asteroids.values()].find((a) => a.ownerId !== null);
    if (!asteroid) throw new Error("expected owned asteroid");

    // Add living quarters (popCap=50) but no food production
    asteroid.happiness = 80;
    const lqId = buildingId("test-lq");
    world.buildings.set(
      lqId,
      makeBuilding("test-lq", "livingQuarters", asteroid.id, { x: 2, y: 2 }),
    );
    asteroid.buildings.push(lqId);

    const before = asteroid.happiness;
    tickResources(world);
    expect(asteroid.happiness).toBeLessThan(before);
  });

  it("radiation filter reduces asteroid radiation each tick", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const asteroid = [...world.asteroids.values()].find((a) => a.ownerId !== null);
    if (!asteroid) throw new Error("expected owned asteroid");

    asteroid.radiation = 10;
    const filterId = buildingId("test-filter");
    world.buildings.set(
      filterId,
      makeBuilding("test-filter", "radiationFilter", asteroid.id, { x: 3, y: 3 }),
    );
    asteroid.buildings.push(filterId);

    tickResources(world);
    expect(asteroid.radiation).toBeLessThan(10);
    expect(asteroid.radiation).toBeGreaterThanOrEqual(0);
  });

  it("repair facility reduces building damage each tick", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const asteroid = [...world.asteroids.values()].find((a) => a.ownerId !== null);
    if (!asteroid) throw new Error("expected owned asteroid");

    // Add a damaged building and a repair facility
    const damagedId = buildingId("damaged-cpu");
    const damaged = makeBuilding("damaged-cpu", "powerPlant", asteroid.id, { x: 4, y: 4 });
    damaged.damage = 20;
    world.buildings.set(damagedId, damaged);
    asteroid.buildings.push(damagedId);

    const repairId = buildingId("test-repair");
    world.buildings.set(
      repairId,
      makeBuilding("test-repair", "repairFacility", asteroid.id, { x: 5, y: 5 }),
    );
    asteroid.buildings.push(repairId);

    tickResources(world);
    const afterDamage = world.buildings.get(damagedId)?.damage ?? 0;
    expect(afterDamage).toBeLessThan(20);
  });
});
