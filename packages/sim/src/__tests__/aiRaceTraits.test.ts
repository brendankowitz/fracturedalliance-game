import { describe, expect, it } from "vitest";
import type { AsteroidId, BuildingId, PlayerId, ShipId, World } from "@fa/domain";
import {
  agentId,
  asteroidId,
  buildingId,
  playerId,
  shipId,
  treatyId,
} from "@fa/domain";
import { makePrng } from "../prng.ts";
import { applyCommand } from "../commandProcessor.ts";
import { tickCombat } from "../systems/combatSystem.ts";
import { tickDiplomacy, resolveKryllAccusation, applyTreatySignedTraits } from "../systems/diplomacySystem.ts";
import { tickAI } from "../systems/aiSystem.ts";

// ---------------------------------------------------------------------------
// Shared inline factories
// ---------------------------------------------------------------------------

const MARKET_PRICES = {
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
} as const;

function makeAsteroid(id: AsteroidId, ownerId: PlayerId | null, sector = { x: 0, y: 0 }) {
  return {
    id,
    name: `Asteroid ${id}`,
    ownerId,
    sector,
    sizeClass: "M" as const,
    deposits: {},
    radiation: 0,
    stability: 100,
    happiness: 75,
    buildings: [] as BuildingId[],
    buildQueue: [],
    inOrbit: [],
    engines: { count: 0, destinationId: null, etaTick: null, chargeTick: null },
  };
}

function makePlayer(id: PlayerId, raceId: string, isHuman: boolean, credits = 10_000) {
  return {
    id,
    raceId,
    isHuman,
    credits,
    oreInventory: {},
    reputation: new Map<PlayerId, number>(),
    federationStanding: 50,
    blueprintsOwned: new Set<import("@fa/domain").BlueprintId>(),
    eventLog: [],
    alive: true,
    suspicion: 0,
    licenseRevoked: false,
  };
}

function makeWorld(overrides: Partial<World> = {}): World {
  const humanId = playerId("player-human");
  const aiId = playerId("player-ai");
  const humanAsteroidId = asteroidId("asteroid-human");
  const aiAsteroidId = asteroidId("asteroid-ai");
  const cpuBid = buildingId("cpu-1");

  const humanAsteroid = makeAsteroid(humanAsteroidId, humanId, { x: 0, y: 0 });
  humanAsteroid.buildings.push(cpuBid);

  const aiAsteroid = makeAsteroid(aiAsteroidId, aiId, { x: 10, y: 10 });

  const base: World = {
    tick: 1,
    seed: 1,
    difficulty: "manager",
    asteroids: new Map([
      [humanAsteroidId, humanAsteroid],
      [aiAsteroidId, aiAsteroid],
    ]),
    buildings: new Map([
      [
        cpuBid,
        {
          id: cpuBid,
          defKind: "cpu",
          asteroidId: humanAsteroidId,
          cell: { x: 3, y: 3 },
          hp: 100,
          maxHp: 100,
          constructionProgress: 1,
          active: true,
          damage: 0,
        },
      ],
    ]),
    ships: new Map(),
    players: new Map([
      [humanId, makePlayer(humanId, "helionCorp", true)],
      [aiId, makePlayer(aiId, "kryllCollective", false)],
    ]),
    treaties: [],
    marketPrices: { ...MARKET_PRICES },
    eventQueue: [],
    prng: makePrng(1),
    schemaVersion: 1,
    nextBuildingSeq: 0,
    nextShipSeq: 0,
    nextTreatySeq: 0,
    gameEndState: null,
    agents: new Map(),
    expeditionFleet: { active: false, ticksRemaining: 0, fleetsLaunched: 0 },
  };

  return { ...base, ...overrides };
}

function addIdleShip(world: World, ownerId: PlayerId, id: ShipId, pos = { x: 0, y: 0 }) {
  world.ships.set(id, {
    id,
    defKind: "assaultCraft",
    ownerId,
    hullHp: 80,
    shieldHp: 0,
    position: pos,
    velocity: { x: 0, y: 0 },
    order: { kind: "idle" },
    cargo: {},
  });
}

// ---------------------------------------------------------------------------
// Rigal tech-steal duration halved
// ---------------------------------------------------------------------------

describe("Rigal Conclave — tech-steal duration halved", () => {
  it("baseline techSteal duration is 400 ticks", () => {
    const world = makeWorld();
    const humanId = playerId("player-human");
    const aiId = playerId("player-ai");
    const human = world.players.get(humanId)!;
    // Override raceId to non-rigal baseline (helionCorp)
    (human as { raceId: string }).raceId = "helionCorp";

    const agId = agentId("agent-rigal");
    world.agents.set(agId, {
      id: agId,
      name: "Test Agent",
      ownerId: humanId,
      stealth: 80,
      hireCost: 1000,
      missionKind: null,
      missionTarget: null,
      missionCompleteTick: null,
      tributeActive: false,
      tributeEndTick: null,
    });

    world.tick = 100;
    applyCommand(world, {
      kind: "assignMission",
      agentId: agId,
      missionKind: "techSteal",
      targetAsteroidId: asteroidId("asteroid-ai"),
    });

    const agent = world.agents.get(agId)!;
    expect(agent.missionCompleteTick).toBe(100 + 400);
  });

  it("Rigal player gets techSteal duration of 200 (halved from 400)", () => {
    const world = makeWorld();
    const humanId = playerId("player-human");
    const human = world.players.get(humanId)!;
    // Override raceId to rigal
    (human as { raceId: string }).raceId = "rigal";

    const agId = agentId("agent-rigal");
    world.agents.set(agId, {
      id: agId,
      name: "Test Agent",
      ownerId: humanId,
      stealth: 80,
      hireCost: 1000,
      missionKind: null,
      missionTarget: null,
      missionCompleteTick: null,
      tributeActive: false,
      tributeEndTick: null,
    });

    world.tick = 100;
    applyCommand(world, {
      kind: "assignMission",
      agentId: agId,
      missionKind: "techSteal",
      targetAsteroidId: asteroidId("asteroid-ai"),
    });

    const agent = world.agents.get(agId)!;
    expect(agent.missionCompleteTick).toBe(100 + 200);
  });

  it("Rigal player recon duration is unchanged (only techSteal is halved)", () => {
    const world = makeWorld();
    const humanId = playerId("player-human");
    const human = world.players.get(humanId)!;
    (human as { raceId: string }).raceId = "rigal";

    const agId = agentId("agent-rigal-recon");
    world.agents.set(agId, {
      id: agId,
      name: "Recon Agent",
      ownerId: humanId,
      stealth: 80,
      hireCost: 1000,
      missionKind: null,
      missionTarget: null,
      missionCompleteTick: null,
      tributeActive: false,
      tributeEndTick: null,
    });

    world.tick = 100;
    applyCommand(world, {
      kind: "assignMission",
      agentId: agId,
      missionKind: "recon",
      targetAsteroidId: asteroidId("asteroid-ai"),
    });

    const agent = world.agents.get(agId)!;
    expect(agent.missionCompleteTick).toBe(100 + 200); // recon baseline is 200, unchanged
  });
});

// ---------------------------------------------------------------------------
// Mauna assault fleet — Board difficulty
// ---------------------------------------------------------------------------

describe("Mauna — Board difficulty assault fleet at tick 1", () => {
  function makeMaunaWorld(difficulty: "board" | "director"): World {
    const humanId = playerId("player-human");
    const maunaId = playerId("player-mauna");
    const humanAsteroidId = asteroidId("asteroid-human");
    const maunaAsteroidId = asteroidId("asteroid-mauna");
    const cpuBid = buildingId("cpu-mauna");

    const humanAsteroid = makeAsteroid(humanAsteroidId, humanId, { x: 5, y: 5 });
    const maunaAsteroid = makeAsteroid(maunaAsteroidId, maunaId, { x: 20, y: 20 });
    maunaAsteroid.buildings.push(cpuBid);

    return {
      tick: 1,
      seed: 42,
      difficulty,
      asteroids: new Map([
        [humanAsteroidId, humanAsteroid],
        [maunaAsteroidId, maunaAsteroid],
      ]),
      buildings: new Map([
        [
          cpuBid,
          {
            id: cpuBid,
            defKind: "cpu",
            asteroidId: maunaAsteroidId,
            cell: { x: 3, y: 3 },
            hp: 100,
            maxHp: 100,
            constructionProgress: 1,
            active: true,
            damage: 0,
          },
        ],
      ]),
      ships: new Map(),
      players: new Map([
        [humanId, makePlayer(humanId, "helionCorp", true, 4000)],
        [maunaId, makePlayer(maunaId, "mauna", false, 8800)],
      ]),
      treaties: [],
      marketPrices: { ...MARKET_PRICES },
      eventQueue: [],
      prng: makePrng(42),
      schemaVersion: 1,
      nextBuildingSeq: 0,
      nextShipSeq: 0,
      nextTreatySeq: 0,
      gameEndState: null,
      agents: new Map(),
      expeditionFleet: { active: false, ticksRemaining: 0, fleetsLaunched: 0 },
    };
  }

  it("fires mauna.assault_fleet event on Board difficulty at tick 1", () => {
    const world = makeMaunaWorld("board");
    tickAI(world);

    const assaultEvent = world.eventQueue.find((e) => e.kind === "mauna.assault_fleet");
    expect(assaultEvent).toBeDefined();
    expect(assaultEvent?.kind).toBe("mauna.assault_fleet");
  });

  it("assault fleet event targets the human asteroid", () => {
    const world = makeMaunaWorld("board");
    const humanAsteroidId = asteroidId("asteroid-human");

    tickAI(world);

    const assaultEvent = world.eventQueue.find((e) => e.kind === "mauna.assault_fleet");
    expect(assaultEvent?.kind === "mauna.assault_fleet" && assaultEvent.targetAsteroidId).toBe(
      humanAsteroidId,
    );
  });

  it("does NOT fire mauna.assault_fleet on Director difficulty", () => {
    const world = makeMaunaWorld("director");
    tickAI(world);

    const assaultEvent = world.eventQueue.find((e) => e.kind === "mauna.assault_fleet");
    expect(assaultEvent).toBeUndefined();
  });

  it("does NOT fire mauna.assault_fleet on Board difficulty at tick 2", () => {
    const world = makeMaunaWorld("board");
    world.tick = 2;
    tickAI(world);

    const assaultEvent = world.eventQueue.find((e) => e.kind === "mauna.assault_fleet");
    expect(assaultEvent).toBeUndefined();
  });

  it("orders existing idle Mauna ships to attack on Board difficulty tick 1", () => {
    const world = makeMaunaWorld("board");
    const maunaId = playerId("player-mauna");
    const humanAsteroidId = asteroidId("asteroid-human");
    const maunaShipId = shipId("ship-mauna-1");

    addIdleShip(world, maunaId, maunaShipId, { x: 20, y: 20 });

    tickAI(world);

    const ship = world.ships.get(maunaShipId)!;
    expect(ship.order.kind).toBe("attackAsteroid");
    if (ship.order.kind === "attackAsteroid") {
      expect(ship.order.target).toBe(humanAsteroidId);
    }
  });
});

// ---------------------------------------------------------------------------
// Kryll Collective — accusation bonus
// ---------------------------------------------------------------------------

describe("Kryll Collective — accusation success multiplier", () => {
  it("resolveKryllAccusation applies 1.25x multiplier for Kryll attacker", () => {
    const kryllPlayer = makePlayer(playerId("kryll-1"), "kryllCollective", false);
    const targetPlayer = makePlayer(playerId("human-1"), "helionCorp", true);

    // With base 40% chance and roll of 45: baseline fails, Kryll succeeds (40 * 1.25 = 50 >= 45)
    const result = resolveKryllAccusation(kryllPlayer, targetPlayer, 40, 45);
    expect(result).toBe("success");
  });

  it("resolveKryllAccusation fails when roll exceeds boosted chance", () => {
    const kryllPlayer = makePlayer(playerId("kryll-2"), "kryllCollective", false);
    const targetPlayer = makePlayer(playerId("human-2"), "helionCorp", true);

    // Roll 55 exceeds 40 * 1.25 = 50, should fail
    const result = resolveKryllAccusation(kryllPlayer, targetPlayer, 40, 55);
    expect(result).toBe("failed");
  });

  it("sets accusationBonusActive on Kryll player after successful accusation", () => {
    const kryllPlayer = makePlayer(playerId("kryll-3"), "kryllCollective", false);
    const targetPlayer = makePlayer(playerId("human-3"), "helionCorp", true);

    expect(kryllPlayer.accusationBonusActive).toBeUndefined();
    resolveKryllAccusation(kryllPlayer, targetPlayer, 80, 10);
    expect(kryllPlayer.accusationBonusActive).toBe(true);
  });

  it("does not set accusationBonusActive for non-Kryll attacker", () => {
    const helionPlayer = makePlayer(playerId("helion-1"), "helionCorp", false);
    const targetPlayer = makePlayer(playerId("human-4"), "helionCorp", true);

    resolveKryllAccusation(helionPlayer, targetPlayer, 80, 10);
    expect(helionPlayer.accusationBonusActive).toBeUndefined();
  });

  it("Kryll accusationBonusActive applies +25% damage in combat and clears flag", () => {
    const world = makeWorld();
    const humanId = playerId("player-human");
    const aiId = playerId("player-ai");
    const humanAsteroidId = asteroidId("asteroid-human");

    const kryllPlayer = world.players.get(aiId)!;
    kryllPlayer.accusationBonusActive = true;

    // Place Kryll ship at the human asteroid position (combat radius 0.5)
    const kryllShipId = shipId("ship-kryll-1");
    world.ships.set(kryllShipId, {
      id: kryllShipId,
      defKind: "assaultCraft",
      ownerId: aiId,
      hullHp: 80,
      shieldHp: 0,
      position: { x: 0, y: 0 }, // same position as human asteroid
      velocity: { x: 0, y: 0 },
      order: { kind: "attackAsteroid", target: humanAsteroidId },
      cargo: {},
    });

    const asteroidBefore = world.asteroids.get(humanAsteroidId)!.stability;
    tickCombat(world);
    const asteroidAfter = world.asteroids.get(humanAsteroidId)!.stability;

    // Stability should have dropped (damage was dealt)
    expect(asteroidAfter).toBeLessThan(asteroidBefore);

    // Flag should be cleared after attack
    expect(kryllPlayer.accusationBonusActive).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Achar Gatherings — 500-tick grace period after treaty
// ---------------------------------------------------------------------------

describe("Achar Gatherings — grace period after treaty", () => {
  it("applyTreatySignedTraits sets gracePeriodUntil on Achar party A", () => {
    const world = makeWorld();
    const acharPlayer = makePlayer(playerId("achar-1"), "achar", false);
    const humanPlayer = makePlayer(playerId("human-1"), "helionCorp", true);
    world.tick = 100;

    applyTreatySignedTraits(world, acharPlayer, humanPlayer);

    expect(acharPlayer.gracePeriodUntil).toBe(600); // 100 + 500
  });

  it("applyTreatySignedTraits sets gracePeriodUntil on Achar party B", () => {
    const world = makeWorld();
    const humanPlayer = makePlayer(playerId("human-2"), "helionCorp", true);
    const acharPlayer = makePlayer(playerId("achar-2"), "achar", false);
    world.tick = 200;

    applyTreatySignedTraits(world, humanPlayer, acharPlayer);

    expect(acharPlayer.gracePeriodUntil).toBe(700); // 200 + 500
  });

  it("applyTreatySignedTraits does not set gracePeriodUntil for non-Achar parties", () => {
    const world = makeWorld();
    const helionPlayer = makePlayer(playerId("helion-g"), "helionCorp", false);
    const kryllPlayer = makePlayer(playerId("kryll-g"), "kryllCollective", false);

    applyTreatySignedTraits(world, helionPlayer, kryllPlayer);

    expect(helionPlayer.gracePeriodUntil).toBeUndefined();
    expect(kryllPlayer.gracePeriodUntil).toBeUndefined();
  });

  it("Achar ship does not attack during grace period in combat", () => {
    const world = makeWorld();
    const humanId = playerId("player-human");
    const aiId = playerId("player-ai");
    const humanAsteroidId = asteroidId("asteroid-human");

    // Override the AI player to be Achar with grace period
    const acharPlayer = world.players.get(aiId)!;
    (acharPlayer as { raceId: string }).raceId = "achar";
    acharPlayer.gracePeriodUntil = 500; // world.tick is 1, so grace period active

    const acharShipId = shipId("ship-achar-1");
    world.ships.set(acharShipId, {
      id: acharShipId,
      defKind: "assaultCraft",
      ownerId: aiId,
      hullHp: 80,
      shieldHp: 0,
      position: { x: 0, y: 0 }, // at the human asteroid
      velocity: { x: 0, y: 0 },
      order: { kind: "attackAsteroid", target: humanAsteroidId },
      cargo: {},
    });

    const stabilityBefore = world.asteroids.get(humanAsteroidId)!.stability;
    tickCombat(world);
    const stabilityAfter = world.asteroids.get(humanAsteroidId)!.stability;

    // Stability should be unchanged — Achar skipped attack during grace period
    expect(stabilityAfter).toBe(stabilityBefore);
  });

  it("Achar ship attacks after grace period expires", () => {
    const world = makeWorld();
    const humanId = playerId("player-human");
    const aiId = playerId("player-ai");
    const humanAsteroidId = asteroidId("asteroid-human");

    world.tick = 600;
    const acharPlayer = world.players.get(aiId)!;
    (acharPlayer as { raceId: string }).raceId = "achar";
    acharPlayer.gracePeriodUntil = 500; // grace period already expired

    const acharShipId = shipId("ship-achar-2");
    world.ships.set(acharShipId, {
      id: acharShipId,
      defKind: "assaultCraft",
      ownerId: aiId,
      hullHp: 80,
      shieldHp: 0,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      order: { kind: "attackAsteroid", target: humanAsteroidId },
      cargo: {},
    });

    const stabilityBefore = world.asteroids.get(humanAsteroidId)!.stability;
    tickCombat(world);
    const stabilityAfter = world.asteroids.get(humanAsteroidId)!.stability;

    expect(stabilityAfter).toBeLessThan(stabilityBefore);
  });

  it("proposeTreaty with Achar target sets grace period", () => {
    const world = makeWorld();
    const humanId = playerId("player-human");
    const aiId = playerId("player-ai");

    // Override AI player to Achar
    const acharPlayer = world.players.get(aiId)!;
    (acharPlayer as { raceId: string }).raceId = "achar";
    world.tick = 50;

    applyCommand(world, {
      kind: "proposeTreaty",
      targetPlayerId: aiId,
      treatyKind: "nonAggression",
    });

    expect(acharPlayer.gracePeriodUntil).toBe(550); // 50 + 500
  });
});

// ---------------------------------------------------------------------------
// Motkaj Clans — break treaty more easily at low credits
// ---------------------------------------------------------------------------

describe("Motkaj Clans — treaty break at low credits", () => {
  it("Motkaj with sufficient credits does not trigger low-credit treaty break path", () => {
    // We verify that when Motkaj has >= 2000 credits, the break logic is skipped.
    // This is a structural test — the prng won't be called for Motkaj treaty break.
    const world = makeWorld();
    const humanId = playerId("player-human");
    const motkajId = playerId("player-motkaj");

    const motkajAsteroidId = asteroidId("asteroid-motkaj");
    world.asteroids.set(motkajAsteroidId, makeAsteroid(motkajAsteroidId, motkajId));
    world.players.set(motkajId, makePlayer(motkajId, "motkaj", false, 5000));

    world.treaties.push({
      id: treatyId("treaty-motkaj-nap"),
      parties: [humanId, motkajId],
      kind: "nonAggression",
      signedTick: 1,
      expiresTick: 10000,
    });

    // Run 10 ticks — with 5000 credits, treaty should survive
    for (let i = 0; i < 10; i++) {
      world.tick++;
      tickDiplomacy(world);
    }

    // Treaty should still exist (not broken by Motkaj)
    const treatyStillExists = world.treaties.some((t) => t.id === treatyId("treaty-motkaj-nap"));
    expect(treatyStillExists).toBe(true);
  });

  it("Motkaj with < 2000 credits can break a treaty via the 2x chance path", () => {
    // We set prng to always return a value below the break threshold (< 0.1 = base 0.05 * 2)
    // to guarantee the break fires.
    const world = makeWorld();
    const humanId = playerId("player-human");
    const motkajId = playerId("player-motkaj");

    world.players.set(motkajId, makePlayer(motkajId, "motkaj", false, 500));

    world.treaties.push({
      id: treatyId("treaty-motkaj-break"),
      parties: [humanId, motkajId],
      kind: "nonAggression",
      signedTick: 1,
      expiresTick: 10000,
    });

    // Use a PRNG that always returns 0 (below any threshold) to force the break
    let broken = false;
    const originalNext = world.prng.next.bind(world.prng);
    world.prng = {
      ...world.prng,
      next: () => 0, // always 0, which is < MOTKAJ_BREAK_BASE_CHANCE * 2 = 0.1
    };

    world.tick = 5;
    tickDiplomacy(world);

    broken = world.eventQueue.some((e) => e.kind === "treaty.broken");
    expect(broken).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Brakkat Dominion — double retaliation
// ---------------------------------------------------------------------------

describe("Brakkat Dominion — double retaliation orders", () => {
  it("Brakkat gets 2 idle ships ordered to retaliate when their asteroid is attacked", () => {
    const world = makeWorld();
    const humanId = playerId("player-human");
    const brakkatId = playerId("player-brakkat");

    const brakkatAsteroidId = asteroidId("asteroid-brakkat");
    const brakkatAsteroid = makeAsteroid(brakkatAsteroidId, brakkatId, { x: 5, y: 5 });
    world.asteroids.set(brakkatAsteroidId, brakkatAsteroid);
    world.players.set(brakkatId, makePlayer(brakkatId, "brakkat", false));

    // Add 3 idle Brakkat ships
    const bship1 = shipId("brakkat-ship-1");
    const bship2 = shipId("brakkat-ship-2");
    const bship3 = shipId("brakkat-ship-3");
    addIdleShip(world, brakkatId, bship1, { x: 5, y: 5 });
    addIdleShip(world, brakkatId, bship2, { x: 5, y: 5 });
    addIdleShip(world, brakkatId, bship3, { x: 5, y: 5 });

    // Inject the colony.under_attack event (as if combat already fired it)
    world.eventQueue.push({
      kind: "colony.under_attack",
      priority: "red",
      asteroidId: brakkatAsteroidId,
      attackerId: humanId,
    });

    tickCombat(world);

    // Exactly 2 ships should have been ordered to retaliate
    const retaliating = [...world.ships.values()].filter(
      (s) => s.ownerId === brakkatId && s.order.kind === "attackAsteroid",
    );
    expect(retaliating).toHaveLength(2);
  });

  it("Brakkat retaliation target is the attacker's asteroid", () => {
    const world = makeWorld();
    const humanId = playerId("player-human");
    const humanAsteroidId = asteroidId("asteroid-human");
    const brakkatId = playerId("player-brakkat");
    const brakkatAsteroidId = asteroidId("asteroid-brakkat");

    world.asteroids.set(brakkatAsteroidId, makeAsteroid(brakkatAsteroidId, brakkatId));
    world.players.set(brakkatId, makePlayer(brakkatId, "brakkat", false));

    const bship1 = shipId("brakkat-ret-1");
    const bship2 = shipId("brakkat-ret-2");
    addIdleShip(world, brakkatId, bship1);
    addIdleShip(world, brakkatId, bship2);

    world.eventQueue.push({
      kind: "colony.under_attack",
      priority: "red",
      asteroidId: brakkatAsteroidId,
      attackerId: humanId,
    });

    tickCombat(world);

    for (const ship of world.ships.values()) {
      if (ship.ownerId !== brakkatId) continue;
      if (ship.order.kind === "attackAsteroid") {
        expect(ship.order.target).toBe(humanAsteroidId);
      }
    }
  });

  it("non-Brakkat AI does not get double retaliation on attack", () => {
    const world = makeWorld();
    const humanId = playerId("player-human");
    const kryllId = playerId("player-ai"); // default is kryllCollective

    const kryllAsteroidId = asteroidId("asteroid-ai");

    // 3 idle Kryll ships
    const ks1 = shipId("kryll-idle-1");
    const ks2 = shipId("kryll-idle-2");
    const ks3 = shipId("kryll-idle-3");
    addIdleShip(world, kryllId, ks1, { x: 10, y: 10 });
    addIdleShip(world, kryllId, ks2, { x: 10, y: 10 });
    addIdleShip(world, kryllId, ks3, { x: 10, y: 10 });

    world.eventQueue.push({
      kind: "colony.under_attack",
      priority: "red",
      asteroidId: kryllAsteroidId,
      attackerId: humanId,
    });

    tickCombat(world);

    // No ships should have been auto-ordered to retaliate for non-Brakkat
    const retaliating = [...world.ships.values()].filter(
      (s) => s.ownerId === kryllId && s.order.kind === "attackAsteroid",
    );
    expect(retaliating).toHaveLength(0);
  });
});
