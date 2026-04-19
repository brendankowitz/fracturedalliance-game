import { findBuildingDef, getBuildingDef, getRaceDef } from "@fa/content";
import type { Asteroid, Player, RacePersonality, World } from "@fa/domain";
import { applyCommand } from "../commandProcessor.ts";
import { computeGrudgeScore } from "./diplomacySystem.ts";

const AI_BUDGET_MS = 10;
const DEFENSE_BUILDING = "securityCentre";

function pickFreeCell(asteroid: Asteroid, world: World): { x: number; y: number } | null {
  const occupied = new Set<string>();
  for (const bid of asteroid.buildings) {
    const b = world.buildings.get(bid);
    if (b) occupied.add(`${b.cell.x},${b.cell.y}`);
  }
  for (const q of asteroid.buildQueue) {
    occupied.add(`${q.cell.x},${q.cell.y}`);
  }
  for (let x = 0; x < 7; x++) {
    for (let y = 0; y < 7; y++) {
      if (!occupied.has(`${x},${y}`)) return { x, y };
    }
  }
  return null;
}

function hasActiveBuilding(asteroid: Asteroid, world: World, kind: string): boolean {
  return asteroid.buildings.some((bid) => {
    const b = world.buildings.get(bid);
    return b?.defKind === kind && b.constructionProgress >= 1;
  });
}

function isBuildingQueued(asteroid: Asteroid, kind: string): boolean {
  return asteroid.buildQueue.some((q) => q.buildingKind === kind);
}

function computePowerBalance(asteroid: Asteroid, world: World): number {
  let balance = 0;
  for (const bid of asteroid.buildings) {
    const b = world.buildings.get(bid);
    if (!b?.active || b.constructionProgress < 1) continue;
    const def = getBuildingDef(b.defKind);
    balance += def.powerDelta;
  }
  return balance;
}

function utilityBuildMine(
  world: World,
  asteroid: Asteroid,
  player: Player,
  personality: RacePersonality,
  hasSpace: boolean,
): number {
  if (!hasSpace) return 0;
  const def = findBuildingDef("mineMk1");
  if (!def || player.credits < def.costCredits) return 0;
  if (isBuildingQueued(asteroid, "mineMk1")) return 0;
  const hasDeposits = Object.values(asteroid.deposits).some((v) => (v ?? 0) > 500);
  if (!hasDeposits) return 0;
  return 0.6 + personality.tradeBias * 0.4;
}

function utilityExpand(
  world: World,
  asteroid: Asteroid,
  player: Player,
  personality: RacePersonality,
  hasSpace: boolean,
): number {
  if (!hasSpace) return 0;
  const def = findBuildingDef("shipYard");
  if (!def || player.credits < def.costCredits) return 0;
  if (hasActiveBuilding(asteroid, world, "shipYard")) return 0;
  if (isBuildingQueued(asteroid, "shipYard")) return 0;
  return personality.expansionBias * 0.8;
}

function utilityBuildDefense(
  world: World,
  asteroid: Asteroid,
  player: Player,
  personality: RacePersonality,
  hasSpace: boolean,
): number {
  if (!hasSpace) return 0;
  const def = findBuildingDef(DEFENSE_BUILDING);
  if (!def || player.credits < def.costCredits) return 0;
  if (hasActiveBuilding(asteroid, world, DEFENSE_BUILDING)) return 0;
  if (isBuildingQueued(asteroid, DEFENSE_BUILDING)) return 0;
  return personality.aggression * 0.5;
}

const MAX_AI_ASSAULT_CRAFT = 2;

export function tickAI(world: World): void {
  const start = performance.now();

  for (const player of world.players.values()) {
    if (player.isHuman || !player.alive) continue;
    if (performance.now() - start > AI_BUDGET_MS) break;

    const raceDef = getRaceDef(player.raceId);
    if (!raceDef) continue;

    for (const asteroid of world.asteroids.values()) {
      if (asteroid.ownerId !== player.id) continue;
      if (performance.now() - start > AI_BUDGET_MS) break;
      if (asteroid.buildQueue.length > 0) continue;

      const p = raceDef.personality;
      const cell = pickFreeCell(asteroid, world);
      const hasSpace = cell !== null;

      // Power deficit is priority-0: always build a power plant first
      if (
        hasSpace &&
        computePowerBalance(asteroid, world) < 0 &&
        !isBuildingQueued(asteroid, "powerPlant")
      ) {
        const powerDef = findBuildingDef("powerPlant");
        if (powerDef && player.credits >= powerDef.costCredits && cell) {
          applyCommand(world, {
            kind: "placeBuilding",
            asteroidId: asteroid.id,
            buildingKind: "powerPlant",
            cell,
          });
          if (performance.now() - start > AI_BUDGET_MS) break;
          continue;
        }
      }

      // Score all three strategic actions
      const candidates: Array<{ utility: number; buildingKind: string }> = [
        {
          utility: utilityBuildMine(world, asteroid, player, p, hasSpace),
          buildingKind: "mineMk1",
        },
        { utility: utilityExpand(world, asteroid, player, p, hasSpace), buildingKind: "shipYard" },
        {
          utility: utilityBuildDefense(world, asteroid, player, p, hasSpace),
          buildingKind: DEFENSE_BUILDING,
        },
      ];

      let best: { utility: number; buildingKind: string } | undefined;
      for (const c of candidates) {
        if (best === undefined || c.utility > best.utility) best = c;
      }
      if (!best || best.utility <= 0 || !cell) continue;

      applyCommand(world, {
        kind: "placeBuilding",
        asteroidId: asteroid.id,
        buildingKind: best.buildingKind,
        cell,
      });
      if (performance.now() - start > AI_BUDGET_MS) break;
    }
  }

  // AI launches assault craft if it can and needs to
  for (const player of world.players.values()) {
    if (player.isHuman || !player.alive) continue;
    if (performance.now() - start > AI_BUDGET_MS) break;

    const aiCraft = [...world.ships.values()].filter(
      (s) => s.ownerId === player.id && s.defKind === "assaultCraft",
    );
    if (aiCraft.length >= MAX_AI_ASSAULT_CRAFT) continue;

    const launchAsteroid = [...world.asteroids.values()].find(
      (a) =>
        a.ownerId === player.id &&
        a.buildings.some((bid) => {
          const b = world.buildings.get(bid);
          return b?.defKind === "shipYard" && b.constructionProgress >= 1;
        }),
    );
    if (!launchAsteroid) continue;

    applyCommand(world, {
      kind: "launchShip",
      asteroidId: launchAsteroid.id,
      shipKind: "assaultCraft",
    });
    if (performance.now() - start > AI_BUDGET_MS) break;
  }

  // Order idle AI assault craft to attack the nearest human asteroid
  for (const ship of world.ships.values()) {
    const owner = world.players.get(ship.ownerId);
    if (!owner || owner.isHuman || !owner.alive) continue;
    if (ship.defKind !== "assaultCraft") continue;
    if (ship.order.kind !== "idle") continue;
    if (performance.now() - start > AI_BUDGET_MS) break;

    let closest: { id: import("@fa/domain").AsteroidId; dist: number } | undefined;
    for (const asteroid of world.asteroids.values()) {
      if (!asteroid.ownerId) continue;
      const targetOwner = world.players.get(asteroid.ownerId);
      if (!targetOwner?.isHuman) continue;
      const dx = asteroid.sector.x - ship.position.x;
      const dy = asteroid.sector.y - ship.position.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (!closest || d < closest.dist) closest = { id: asteroid.id, dist: d };
    }
    if (!closest) continue;

    const targetAsteroid = world.asteroids.get(closest.id);
    const targetOwnerId = targetAsteroid?.ownerId;
    if (targetOwnerId) {
      const hasPeaceTreaty = world.treaties.some(
        (t) =>
          (t.kind === "nonAggression" || t.kind === "peace" || t.kind === "openBorders") &&
          t.parties.includes(owner.id) &&
          t.parties.includes(targetOwnerId),
      );
      if (hasPeaceTreaty) continue;
    }

    // Grudge influences attack willingness — low-aggression AI needs accumulated grudge
    const raceDef2 = getRaceDef(owner.raceId);
    if (raceDef2) {
      const grudge = computeGrudgeScore(owner);
      const minGrudge = (1 - raceDef2.personality.aggression) * 50;
      if (grudge < minGrudge) continue;
    }

    applyCommand(world, {
      kind: "orderShip",
      shipId: ship.id,
      order: { kind: "attackAsteroid", target: closest.id },
    });
    if (performance.now() - start > AI_BUDGET_MS) break;
  }
}
