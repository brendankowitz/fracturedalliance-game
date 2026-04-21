import { type AsteroidId, buildingId, shipId } from "@fa/domain";
import { describe, expect, it } from "vitest";
import { applyCommand } from "../commandProcessor.ts";
import { tickAI } from "../systems/aiSystem.ts";
import { tickCombat } from "../systems/combatSystem.ts";
import { tickConstruction } from "../systems/constructionSystem.ts";
import { tickMining } from "../systems/miningSystem.ts";
import { tickMissiles } from "../systems/missileSystem.ts";
import { computePowerBalance, tickResources } from "../systems/resourceSystem.ts";
import { tickShips } from "../systems/shipSystem.ts";
import { isTraderActive, TICKS_PER_MONTH, TRADER_WINDOW_TICKS } from "../systems/traderSystem.ts";
import { createWorld } from "../world.ts";

describe("miningSystem", () => {
  it("active Mine Mk1 extracts selenium each tick", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const human = [...world.players.values()].find((p) => p.isHuman)!;
    const [asteroid] = world.asteroids.values();
    if (!asteroid) throw new Error("expected asteroid");

    // Ensure the asteroid is owned and has selenium to extract
    asteroid.ownerId = human.id;
    (asteroid.deposits as Record<string, number>).selenium = 5000;

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

describe("miningSystem — ore refinery multiplier", () => {
  it("ore refinery boosts mine output by its multiplier factor", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const human = [...world.players.values()].find((p) => p.isHuman)!;
    const [asteroid] = world.asteroids.values();
    if (!asteroid) throw new Error("expected asteroid");
    asteroid.ownerId = human.id;
    (asteroid.deposits as Record<string, number>).selenium = 999999;

    // Mine alone
    const mineId = buildingId("refinery-test-mine");
    world.buildings.set(mineId, {
      id: mineId, defKind: "mineMk1", asteroidId: asteroid.id,
      cell: { x: 0, y: 0 }, hp: 100, maxHp: 100,
      constructionProgress: 1, active: true, damage: 0,
    });
    asteroid.buildings.push(mineId);

    tickMining(world);
    const withoutRefinery = human.oreInventory.selenium ?? 0;
    human.oreInventory.selenium = 0;

    // Add an ore refinery (oreMiningMultiplier: 0.4)
    const refId = buildingId("refinery-test-ref");
    world.buildings.set(refId, {
      id: refId, defKind: "oreRefinery", asteroidId: asteroid.id,
      cell: { x: 1, y: 0 }, hp: 100, maxHp: 100,
      constructionProgress: 1, active: true, damage: 0,
    });
    asteroid.buildings.push(refId);

    tickMining(world);
    const withRefinery = human.oreInventory.selenium ?? 0;

    expect(withRefinery).toBeGreaterThan(withoutRefinery);
    expect(withRefinery).toBeCloseTo(withoutRefinery * 1.4, 5);
  });
});

describe("constructionSystem", () => {
  it("completes a building after its build time ticks", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const asteroid = [...world.asteroids.values()].find((a) => a.ownerId !== null);
    if (!asteroid) throw new Error("expected owned asteroid");

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
  function findAsteroidWithCpu(world: ReturnType<typeof createWorld>) {
    return [...world.asteroids.values()].find((a) =>
      a.buildings.some((bid) => world.buildings.get(bid)?.defKind === "cpu"),
    );
  }

  it("computePowerBalance returns negative for CPU alone (no generators)", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const asteroid = findAsteroidWithCpu(world);
    if (!asteroid) throw new Error("expected asteroid with CPU");
    const balance = computePowerBalance(world, asteroid.id);
    // CPU costs -5 power
    expect(balance).toBe(-5);
  });

  it("power balance includes all active buildings", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const asteroid = findAsteroidWithCpu(world);
    if (!asteroid) throw new Error("expected asteroid with CPU");

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
    const asteroid = findAsteroidWithCpu(world);
    if (!asteroid) throw new Error("expected asteroid with CPU");

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
    const asteroid = findAsteroidWithCpu(world);
    if (!asteroid) throw new Error("expected asteroid with CPU");

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
  function makeBuilding(id: string, kind: string, asteroidId: AsteroidId, cell = { x: 1, y: 1 }) {
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

describe("commandProcessor — launchShip", () => {
  it("launchShip creates a ship at an asteroid with a ship yard", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const asteroid = [...world.asteroids.values()].find((a) => a.ownerId !== null);
    if (!asteroid) throw new Error("expected owned asteroid");

    // Add a complete ship yard
    const yardId = buildingId("test-yard");
    world.buildings.set(yardId, {
      id: yardId,
      defKind: "shipYard",
      asteroidId: asteroid.id,
      cell: { x: 6, y: 6 },
      hp: 100,
      maxHp: 100,
      constructionProgress: 1,
      active: true,
      damage: 0,
    });
    asteroid.buildings.push(yardId);

    const shipsBefore = world.ships.size;
    applyCommand(world, { kind: "launchShip", asteroidId: asteroid.id, shipKind: "scout" });
    expect(world.ships.size).toBe(shipsBefore + 1);
  });
});

describe("shipSystem", () => {
  it("scout moves toward its target each tick", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const [asteroid] = world.asteroids.values();
    if (!asteroid) throw new Error("expected asteroid");

    const id = shipId("test-scout");
    world.ships.set(id, {
      id,
      defKind: "scout",
      ownerId: asteroid.ownerId ?? (asteroid.id as unknown as import("@fa/domain").PlayerId),
      hullHp: 20,
      shieldHp: 5,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      order: { kind: "scout", target: { x: 5, y: 5 } },
      cargo: {},
    });

    const before = { x: world.ships.get(id)!.position.x, y: world.ships.get(id)!.position.y };
    tickShips(world);
    const after = world.ships.get(id)!.position;

    expect(after.x).toBeGreaterThan(before.x);
    expect(after.y).toBeGreaterThan(before.y);
  });

  it("ship goes idle when it reaches its destination", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const [asteroid] = world.asteroids.values();
    if (!asteroid) throw new Error("expected asteroid");

    const id = shipId("arriving-scout");
    world.ships.set(id, {
      id,
      defKind: "scout",
      ownerId: asteroid.ownerId ?? (asteroid.id as unknown as import("@fa/domain").PlayerId),
      hullHp: 20,
      shieldHp: 5,
      position: { x: 0.3, y: 0 }, // within ARRIVAL_RADIUS of (0,0)
      velocity: { x: 0, y: 0 },
      order: { kind: "moveTo", target: { x: 0, y: 0 } },
      cargo: {},
    });

    tickShips(world);

    expect(world.ships.get(id)!.order.kind).toBe("idle");
  });

  it("idle ship does not move", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const [asteroid] = world.asteroids.values();
    if (!asteroid) throw new Error("expected asteroid");

    const id = shipId("idle-ship");
    world.ships.set(id, {
      id,
      defKind: "scout",
      ownerId: asteroid.ownerId ?? (asteroid.id as unknown as import("@fa/domain").PlayerId),
      hullHp: 20,
      shieldHp: 5,
      position: { x: 2, y: 3 },
      velocity: { x: 0, y: 0 },
      order: { kind: "idle" },
      cargo: {},
    });

    tickShips(world);

    const ship = world.ships.get(id)!;
    expect(ship.position.x).toBe(2);
    expect(ship.position.y).toBe(3);
  });
});

describe("traderSystem", () => {
  it("isTraderActive returns false at tick 0", () => {
    expect(isTraderActive(0)).toBe(false);
    expect(isTraderActive(1)).toBe(false);
  });

  it("isTraderActive returns true at tick TICKS_PER_MONTH", () => {
    expect(isTraderActive(TICKS_PER_MONTH)).toBe(true);
  });

  it("isTraderActive returns false after TRADER_WINDOW_TICKS", () => {
    expect(isTraderActive(TICKS_PER_MONTH + TRADER_WINDOW_TICKS)).toBe(false);
  });

  it("mining fills player oreInventory, not credits", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const human = [...world.players.values()].find((p) => p.isHuman)!;
    const [asteroid] = world.asteroids.values();
    if (!asteroid) throw new Error("expected asteroid");

    // Ensure the asteroid is owned and has selenium to extract
    asteroid.ownerId = human.id;
    (asteroid.deposits as Record<string, number>).selenium = 5000;

    const mineId = buildingId("test-mine-inv");
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

    const creditsBefore = human.credits;
    tickMining(world);
    expect(human.credits).toBe(creditsBefore); // credits unchanged
    const totalInventory = Object.values(human.oreInventory).reduce((s, v) => s + (v ?? 0), 0);
    expect(totalInventory).toBeGreaterThan(0); // ore accumulated
  });

  it("sellOreToTrader command sells all of a given ore type when trader is active", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    world.tick = TICKS_PER_MONTH; // trader active

    const human = [...world.players.values()].find((p) => p.isHuman)!;
    human.oreInventory.selenium = 100;
    const creditsBefore = human.credits;

    applyCommand(world, { kind: "sellOreToTrader", playerId: human.id, oreKind: "selenium" });

    expect(human.oreInventory.selenium ?? 0).toBe(0);
    expect(human.credits).toBeGreaterThan(creditsBefore);
  });
});

describe("combatSystem", () => {
  function makeShip(
    id: string,
    kind: "scout" | "assaultCraft",
    ownerId: import("@fa/domain").PlayerId,
    position: { x: number; y: number },
    order: import("@fa/domain").ShipOrder,
  ) {
    return {
      id: shipId(id),
      defKind: kind,
      ownerId,
      hullHp: kind === "assaultCraft" ? 80 : 20,
      shieldHp: 0,
      position: { ...position },
      velocity: { x: 0, y: 0 },
      order,
      cargo: {},
    };
  }

  it("attacking ship damages asteroid stability when no defenders present", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const humanAsteroid = [...world.asteroids.values()].find(
      (a) => a.ownerId !== null && world.players.get(a.ownerId!)?.isHuman,
    );
    if (!humanAsteroid) throw new Error("human asteroid not found");

    const kryll = [...world.players.values()].find((p) => p.raceId === "kryllCollective")!;
    const attacker = makeShip(
      "attacker-1",
      "assaultCraft",
      kryll.id,
      { x: humanAsteroid.sector.x, y: humanAsteroid.sector.y },
      { kind: "attackAsteroid", target: humanAsteroid.id },
    );
    world.ships.set(attacker.id, attacker);

    const stabilityBefore = humanAsteroid.stability;
    tickCombat(world);
    expect(humanAsteroid.stability).toBeLessThan(stabilityBefore);
  });

  it("colony.under_attack event fires when asteroid is attacked", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const humanAsteroid = [...world.asteroids.values()].find(
      (a) => a.ownerId !== null && world.players.get(a.ownerId!)?.isHuman,
    );
    if (!humanAsteroid) throw new Error("human asteroid not found");

    const kryll = [...world.players.values()].find((p) => p.raceId === "kryllCollective")!;
    const attacker = makeShip(
      "attacker-2",
      "assaultCraft",
      kryll.id,
      { x: humanAsteroid.sector.x, y: humanAsteroid.sector.y },
      { kind: "attackAsteroid", target: humanAsteroid.id },
    );
    world.ships.set(attacker.id, attacker);

    world.eventQueue = [];
    tickCombat(world);
    const event = world.eventQueue.find((e) => e.kind === "colony.under_attack");
    expect(event).toBeDefined();
  });

  it("destroyed ships are removed from the world", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });
    const humanAsteroid = [...world.asteroids.values()].find(
      (a) => a.ownerId !== null && world.players.get(a.ownerId!)?.isHuman,
    );
    if (!humanAsteroid) throw new Error("human asteroid not found");

    const kryll = [...world.players.values()].find((p) => p.raceId === "kryllCollective")!;
    const dyingShip = makeShip(
      "dying-1",
      "assaultCraft",
      kryll.id,
      { x: humanAsteroid.sector.x, y: humanAsteroid.sector.y },
      { kind: "attackAsteroid", target: humanAsteroid.id },
    );
    dyingShip.hullHp = 1;
    world.ships.set(dyingShip.id, dyingShip);

    const human = [...world.players.values()].find((p) => p.isHuman)!;
    const defender = makeShip(
      "defender-1",
      "assaultCraft",
      human.id,
      { x: humanAsteroid.sector.x, y: humanAsteroid.sector.y },
      { kind: "defend", target: humanAsteroid.id },
    );
    world.ships.set(defender.id, defender);

    tickCombat(world);
    // The dying ship (1 HP) should be destroyed by the defender's counter-attack
    expect(world.ships.has(dyingShip.id)).toBe(false);
  });
});

describe("combatSystem — defense buildings", () => {
  it("turret battery damages attacking ship each tick", () => {
    const world = createWorld({ seed: 42, humanPlayerRaceId: "helionCorp" });
    const human = [...world.players.values()].find((p) => p.isHuman)!;
    const ai = [...world.players.values()].find((p) => !p.isHuman)!;

    const [targetAsteroid] = world.asteroids.values();
    if (!targetAsteroid) throw new Error("no asteroid");
    targetAsteroid.ownerId = human.id;

    // Place a completed turretBattery on target
    const tId = buildingId("turret-1");
    world.buildings.set(tId, {
      id: tId, defKind: "turretBattery", asteroidId: targetAsteroid.id,
      cell: { x: 0, y: 0 }, hp: 100, maxHp: 100,
      constructionProgress: 1, active: true, damage: 0,
    });
    targetAsteroid.buildings.push(tId);

    // Spawn an attacking ship at the asteroid's position
    const sId = shipId("attacker-1");
    world.ships.set(sId, {
      id: sId, defKind: "assaultCraft", ownerId: ai.id,
      hullHp: 80, shieldHp: 40,
      position: { x: targetAsteroid.sector.x, y: targetAsteroid.sector.y },
      velocity: { x: 0, y: 0 },
      order: { kind: "attackAsteroid", target: targetAsteroid.id },
      cargo: {},
    });

    const beforeHp = 80 + 40; // hull + shield
    tickCombat(world);
    const ship = world.ships.get(sId);
    const afterHp = ship ? (ship.hullHp + ship.shieldHp) : 0;
    expect(afterHp).toBeLessThan(beforeHp);
  });
});

describe("aiSystem", () => {
  it("Kryll AI places a mine when it has credits and ore deposits", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });

    const kryll = [...world.players.values()].find((p) => p.raceId === "kryllCollective");
    if (!kryll) throw new Error("Kryll player not found");
    kryll.credits = 10_000;

    const kryllAsteroid = [...world.asteroids.values()].find((a) => a.ownerId === kryll.id);
    if (!kryllAsteroid) throw new Error("Kryll asteroid not found");

    const buildQueueBefore = kryllAsteroid.buildQueue.length;
    tickAI(world);

    expect(kryllAsteroid.buildQueue.length).toBeGreaterThan(buildQueueBefore);
  });

  it("AI does not act when player has insufficient credits", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });

    const kryll = [...world.players.values()].find((p) => p.raceId === "kryllCollective");
    if (!kryll) throw new Error("Kryll player not found");
    kryll.credits = 0;

    const kryllAsteroid = [...world.asteroids.values()].find((a) => a.ownerId === kryll.id);
    if (!kryllAsteroid) throw new Error("Kryll asteroid not found");

    const buildQueueBefore = kryllAsteroid.buildQueue.length;
    tickAI(world);

    expect(kryllAsteroid.buildQueue.length).toBe(buildQueueBefore);
  });

  it("AI skips asteroid that already has something in the build queue", () => {
    const world = createWorld({ seed: 1, humanPlayerRaceId: "helionCorp" });

    const kryll = [...world.players.values()].find((p) => p.raceId === "kryllCollective");
    if (!kryll) throw new Error("Kryll player not found");
    kryll.credits = 10_000;

    const kryllAsteroid = [...world.asteroids.values()].find((a) => a.ownerId === kryll.id);
    if (!kryllAsteroid) throw new Error("Kryll asteroid not found");

    kryllAsteroid.buildQueue.push({
      buildingKind: "powerPlant",
      progressTicks: 0,
      totalTicks: 100,
      cell: { x: 1, y: 0 },
    });

    const buildQueueBefore = kryllAsteroid.buildQueue.length;
    tickAI(world);

    expect(kryllAsteroid.buildQueue.length).toBe(buildQueueBefore);
  });
});

describe("settlement", () => {
  it("human with scout in orbit can settle unclaimed asteroid", () => {
    const world = createWorld({ seed: 99, humanPlayerRaceId: "helionCorp" });
    const human = [...world.players.values()].find((p) => p.isHuman)!;
    human.credits = 10000;

    const unclaimedAsteroid = [...world.asteroids.values()].find((a) => !a.ownerId);
    if (!unclaimedAsteroid) throw new Error("need unclaimed asteroid");

    const sId = shipId("settle-scout");
    world.ships.set(sId, {
      id: sId, defKind: "scout", ownerId: human.id,
      hullHp: 20, shieldHp: 5,
      position: { x: unclaimedAsteroid.sector.x, y: unclaimedAsteroid.sector.y },
      velocity: { x: 0, y: 0 },
      order: { kind: "idle" },
      cargo: {},
    });

    const creditsBefore = human.credits;
    applyCommand(world, { kind: "settleAsteroid", asteroidId: unclaimedAsteroid.id });

    expect(unclaimedAsteroid.ownerId).toBe(human.id);
    expect(human.credits).toBe(creditsBefore - 3000);
    expect(world.eventQueue.some((e) => e.kind === "asteroid.settled")).toBe(true);
  });

  it("cannot settle asteroid without a scout in orbit", () => {
    const world = createWorld({ seed: 99, humanPlayerRaceId: "helionCorp" });
    const human = [...world.players.values()].find((p) => p.isHuman)!;
    human.credits = 10000;

    const unclaimedAsteroid = [...world.asteroids.values()].find((a) => !a.ownerId);
    if (!unclaimedAsteroid) throw new Error("need unclaimed asteroid");

    applyCommand(world, { kind: "settleAsteroid", asteroidId: unclaimedAsteroid.id });

    expect(unclaimedAsteroid.ownerId).toBeNull();
  });
});

describe("missileSystem", () => {
  it("missile arrives and damages target stability", () => {
    const world = createWorld({ seed: 7, humanPlayerRaceId: "helionCorp" });
    const human = [...world.players.values()].find((p) => p.isHuman)!;
    const asteroids = [...world.asteroids.values()];
    const sourceAsteroid = asteroids[0]!;
    const targetAsteroid = asteroids[1]!;
    if (!targetAsteroid) throw new Error("need 2 asteroids");

    sourceAsteroid.ownerId = human.id;
    human.credits = 99999;

    // Give source a completed missile silo
    const siloId = buildingId("missile-silo-1");
    world.buildings.set(siloId, {
      id: siloId, defKind: "missileSilo", asteroidId: sourceAsteroid.id,
      cell: { x: 0, y: 0 }, hp: 100, maxHp: 100,
      constructionProgress: 1, active: true, damage: 0,
    });
    sourceAsteroid.buildings.push(siloId);

    // Give target a building to potentially destroy
    const targetBId = buildingId("target-building-1");
    world.buildings.set(targetBId, {
      id: targetBId, defKind: "mineMk1", asteroidId: targetAsteroid.id,
      cell: { x: 0, y: 0 }, hp: 100, maxHp: 100,
      constructionProgress: 1, active: true, damage: 0,
    });
    targetAsteroid.buildings.push(targetBId);
    const stabilityBefore = targetAsteroid.stability;

    applyCommand(world, { kind: "fireMissile", sourceAsteroidId: sourceAsteroid.id, targetAsteroidId: targetAsteroid.id });
    expect(world.missiles).toHaveLength(1);

    // Advance to arrival tick
    const arrivalTick = world.missiles[0]!.arrivalTick;
    while (world.tick < arrivalTick) {
      world.tick += 1;
      world.eventQueue = [];
      tickMissiles(world);
    }

    expect(targetAsteroid.stability).toBeLessThan(stabilityBefore);
    expect(world.missiles).toHaveLength(0);
  });
});
