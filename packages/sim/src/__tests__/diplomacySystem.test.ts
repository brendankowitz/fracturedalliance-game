import type { World } from "@fa/domain";
import {
  type AsteroidId,
  asteroidId,
  type BuildingId,
  buildingId,
  type PlayerId,
  playerId,
  type ShipId,
  shipId,
  treatyId,
} from "@fa/domain";
import { describe, expect, it } from "vitest";
import { makePrng } from "../prng.ts";
import { tickDiplomacy } from "../systems/diplomacySystem.ts";

function makeMinimalWorld(): World {
  const humanId: PlayerId = playerId("player-human");
  const aiId: PlayerId = playerId("player-ai");
  const humanAsteroidId: AsteroidId = asteroidId("asteroid-human");
  const aiAsteroidId: AsteroidId = asteroidId("asteroid-ai");
  const cpuBid: BuildingId = buildingId("cpu-1");

  const humanAsteroid = {
    id: humanAsteroidId,
    name: "Human Base",
    ownerId: humanId,
    sector: { x: 0, y: 0 },
    sizeClass: "M" as const,
    deposits: {},
    radiation: 0,
    stability: 100,
    happiness: 75,
    buildings: [cpuBid],
    buildQueue: [],
    inOrbit: [],
    engines: { count: 0, destinationId: null, etaTick: null, chargeTick: null },
  };

  const aiAsteroid = {
    id: aiAsteroidId,
    name: "AI Base",
    ownerId: aiId,
    sector: { x: 10, y: 10 },
    sizeClass: "M" as const,
    deposits: {},
    radiation: 0,
    stability: 100,
    happiness: 75,
    buildings: [],
    buildQueue: [],
    inOrbit: [],
    engines: { count: 0, destinationId: null, etaTick: null, chargeTick: null },
  };

  const humanPlayer = {
    id: humanId,
    raceId: "helionCorp",
    isHuman: true,
    credits: 10_000,
    oreInventory: {},
    reputation: new Map<PlayerId, number>(),
    federationStanding: 50,
    blueprintsOwned: new Set<import("@fa/domain").BlueprintId>(),
    eventLog: [],
    alive: true,
    suspicion: 0,
  };

  const aiPlayer = {
    id: aiId,
    raceId: "kryllCollective",
    isHuman: false,
    credits: 8_000,
    oreInventory: {},
    reputation: new Map<PlayerId, number>(),
    federationStanding: 30,
    blueprintsOwned: new Set<import("@fa/domain").BlueprintId>(),
    eventLog: [],
    alive: true,
    suspicion: 0,
  };

  const cpu = {
    id: cpuBid,
    defKind: "cpu",
    asteroidId: humanAsteroidId,
    cell: { x: 3, y: 3 },
    hp: 100,
    maxHp: 100,
    constructionProgress: 1,
    active: true,
    damage: 0,
  };

  return {
    tick: 6,
    seed: 1,
    asteroids: new Map([
      [humanAsteroidId, humanAsteroid],
      [aiAsteroidId, aiAsteroid],
    ]),
    buildings: new Map([[cpuBid, cpu]]),
    ships: new Map(),
    players: new Map([
      [humanId, humanPlayer],
      [aiId, aiPlayer],
    ]),
    treaties: [],
    marketPrices: {
      selenium: 100,
      asteros: 150,
      barium: 220,
      crystalite: 300,
      quazinc: 380,
      bytanium: 500,
      korellium: 650,
      dragonium: 820,
      traxium: 1100,
      nexos: 1500,
    },
    eventQueue: [],
    prng: makePrng(1),
    schemaVersion: 1,
    nextBuildingSeq: 0,
    nextShipSeq: 0,
    nextTreatySeq: 0,
  };
}

function makeNap(world: World, humanId: PlayerId, aiId: PlayerId, expiresTick: number) {
  world.treaties.push({
    id: treatyId("treaty-test-nap"),
    parties: [humanId, aiId],
    kind: "nonAggression",
    signedTick: 1,
    expiresTick,
  });
}

function makeAttackingAiShip(world: World, aiId: PlayerId, targetId: AsteroidId): ShipId {
  const id = shipId("ship-attacker");
  world.ships.set(id, {
    id,
    defKind: "assaultCraft",
    ownerId: aiId,
    hullHp: 80,
    shieldHp: 0,
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    order: { kind: "attackAsteroid", target: targetId },
    cargo: {},
  });
  return id;
}

describe("diplomacySystem — treaty expiry", () => {
  it("removes treaties whose expiresTick <= current tick", () => {
    const world = makeMinimalWorld();
    const humanId = playerId("player-human");
    const aiId = playerId("player-ai");
    makeNap(world, humanId, aiId, 5);

    tickDiplomacy(world);

    expect(world.treaties).toHaveLength(0);
  });

  it("removes treaties whose expiresTick equals current tick", () => {
    const world = makeMinimalWorld();
    const humanId = playerId("player-human");
    const aiId = playerId("player-ai");
    makeNap(world, humanId, aiId, 6);

    tickDiplomacy(world);

    expect(world.treaties).toHaveLength(0);
  });

  it("keeps treaties that have not yet expired", () => {
    const world = makeMinimalWorld();
    const humanId = playerId("player-human");
    const aiId = playerId("player-ai");
    makeNap(world, humanId, aiId, 100);

    tickDiplomacy(world);

    expect(world.treaties).toHaveLength(1);
  });

  it("keeps treaties with no expiresTick (permanent)", () => {
    const world = makeMinimalWorld();
    const humanId = playerId("player-human");
    const aiId = playerId("player-ai");
    world.treaties.push({
      id: treatyId("treaty-permanent"),
      parties: [humanId, aiId],
      kind: "nonAggression",
      signedTick: 1,
    });

    tickDiplomacy(world);

    expect(world.treaties).toHaveLength(1);
  });
});

describe("diplomacySystem — NAP violation detection", () => {
  it("fires treaty.broken when AI ship attacks human asteroid under active NAP", () => {
    const world = makeMinimalWorld();
    const humanId = playerId("player-human");
    const aiId = playerId("player-ai");
    const humanAsteroidId = asteroidId("asteroid-human");
    makeNap(world, humanId, aiId, 100);
    makeAttackingAiShip(world, aiId, humanAsteroidId);

    tickDiplomacy(world);

    const broken = world.eventQueue.find((e) => e.kind === "treaty.broken");
    expect(broken).toBeDefined();
    if (broken?.kind === "treaty.broken") {
      expect(broken.by).toBe(aiId);
      expect(broken.against).toBe(humanId);
      expect(broken.treaty).toBe("nonAggression");
    }
  });

  it("removes the NAP after a violation", () => {
    const world = makeMinimalWorld();
    const humanId = playerId("player-human");
    const aiId = playerId("player-ai");
    const humanAsteroidId = asteroidId("asteroid-human");
    makeNap(world, humanId, aiId, 100);
    makeAttackingAiShip(world, aiId, humanAsteroidId);

    tickDiplomacy(world);

    expect(world.treaties).toHaveLength(0);
  });

  it("applies -20 reputation penalty to the violator", () => {
    const world = makeMinimalWorld();
    const humanId = playerId("player-human");
    const aiId = playerId("player-ai");
    const humanAsteroidId = asteroidId("asteroid-human");
    makeNap(world, humanId, aiId, 100);
    makeAttackingAiShip(world, aiId, humanAsteroidId);

    tickDiplomacy(world);

    const human = world.players.get(humanId);
    expect(human?.reputation.get(aiId)).toBe(-20);
  });

  it("stacks -20 on top of existing reputation", () => {
    const world = makeMinimalWorld();
    const humanId = playerId("player-human");
    const aiId = playerId("player-ai");
    const humanAsteroidId = asteroidId("asteroid-human");
    const human = world.players.get(humanId);
    human?.reputation.set(aiId, 10);
    makeNap(world, humanId, aiId, 100);
    makeAttackingAiShip(world, aiId, humanAsteroidId);

    tickDiplomacy(world);

    expect(human?.reputation.get(aiId)).toBe(-10);
  });

  it("does not fire treaty.broken when AI ship attacks non-human asteroid", () => {
    const world = makeMinimalWorld();
    const humanId = playerId("player-human");
    const aiId = playerId("player-ai");
    const aiAsteroidId = asteroidId("asteroid-ai");
    makeNap(world, humanId, aiId, 100);

    const id = shipId("ship-friendly-fire");
    world.ships.set(id, {
      id,
      defKind: "assaultCraft",
      ownerId: aiId,
      hullHp: 80,
      shieldHp: 0,
      position: { x: 10, y: 10 },
      velocity: { x: 0, y: 0 },
      order: { kind: "attackAsteroid", target: aiAsteroidId },
      cargo: {},
    });

    tickDiplomacy(world);

    expect(world.eventQueue.find((e) => e.kind === "treaty.broken")).toBeUndefined();
    expect(world.treaties).toHaveLength(1);
  });

  it("does not fire treaty.broken when no NAP is active", () => {
    const world = makeMinimalWorld();
    const aiId = playerId("player-ai");
    const humanAsteroidId = asteroidId("asteroid-human");
    makeAttackingAiShip(world, aiId, humanAsteroidId);

    tickDiplomacy(world);

    expect(world.eventQueue.find((e) => e.kind === "treaty.broken")).toBeUndefined();
  });

  it("does not fire treaty.broken when AI ship is idle (no attack order)", () => {
    const world = makeMinimalWorld();
    const humanId = playerId("player-human");
    const aiId = playerId("player-ai");
    makeNap(world, humanId, aiId, 100);

    const id = shipId("ship-idle");
    world.ships.set(id, {
      id,
      defKind: "assaultCraft",
      ownerId: aiId,
      hullHp: 80,
      shieldHp: 0,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      order: { kind: "idle" },
      cargo: {},
    });

    tickDiplomacy(world);

    expect(world.eventQueue.find((e) => e.kind === "treaty.broken")).toBeUndefined();
    expect(world.treaties).toHaveLength(1);
  });
});
