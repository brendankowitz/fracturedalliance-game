import { getBuildingDef, getRaceDef } from "@fa/content";
import type { Asteroid, RacePersonality, World } from "@fa/domain";
import { applyCommand } from "../commandProcessor.ts";

const AI_BUDGET_MS = 10;
const BUILD_MINE_COST = 500;
const BUILD_POWER_COST = 700;
const BUILD_SHIPYARD_COST = 2000;
const DEFENSE_BUILDING = "securityCentre";
const DEFENSE_COST = 600;

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

function powerBalance(asteroid: Asteroid, world: World): number {
  let balance = 0;
  for (const bid of asteroid.buildings) {
    const b = world.buildings.get(bid);
    if (!b?.active || b.constructionProgress < 1) continue;
    const def = getBuildingDef(b.defKind);
    balance += def.powerDelta;
  }
  return balance;
}

function utilityBuildMine(world: World, asteroid: Asteroid, personality: RacePersonality): number {
  const player = world.players.get(asteroid.ownerId!);
  if (!player || player.credits < BUILD_MINE_COST) return 0;
  if (isBuildingQueued(asteroid, "mineMk1")) return 0;
  const hasDeposits = Object.values(asteroid.deposits).some((v) => (v ?? 0) > 500);
  if (!hasDeposits) return 0;
  if (pickFreeCell(asteroid, world) === null) return 0;
  return 0.6 + personality.techBias * 0.4;
}

function utilityExpand(world: World, asteroid: Asteroid, personality: RacePersonality): number {
  const player = world.players.get(asteroid.ownerId!);
  if (!player || player.credits < BUILD_SHIPYARD_COST) return 0;
  if (hasActiveBuilding(asteroid, world, "shipYard")) return 0;
  if (isBuildingQueued(asteroid, "shipYard")) return 0;
  if (pickFreeCell(asteroid, world) === null) return 0;
  return personality.expansionBias * 0.8;
}

function utilityBuildDefense(world: World, asteroid: Asteroid, personality: RacePersonality): number {
  const player = world.players.get(asteroid.ownerId!);
  if (!player || player.credits < DEFENSE_COST) return 0;
  if (hasActiveBuilding(asteroid, world, DEFENSE_BUILDING)) return 0;
  if (isBuildingQueued(asteroid, DEFENSE_BUILDING)) return 0;
  if (pickFreeCell(asteroid, world) === null) return 0;
  return personality.aggression * 0.5;
}

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

      // Power deficit overrides utility scoring
      if (
        powerBalance(asteroid, world) < 0 &&
        player.credits >= BUILD_POWER_COST &&
        !isBuildingQueued(asteroid, "powerPlant")
      ) {
        const cell = pickFreeCell(asteroid, world);
        if (cell) {
          applyCommand(world, { kind: "placeBuilding", asteroidId: asteroid.id, buildingKind: "powerPlant", cell });
          continue;
        }
      }

      const candidates: Array<{ utility: number; buildingKind: string }> = [
        { utility: utilityBuildMine(world, asteroid, p), buildingKind: "mineMk1" },
        { utility: utilityExpand(world, asteroid, p), buildingKind: "shipYard" },
        { utility: utilityBuildDefense(world, asteroid, p), buildingKind: DEFENSE_BUILDING },
      ];

      let best: { utility: number; buildingKind: string } | undefined;
      for (const c of candidates) {
        if (best === undefined || c.utility > best.utility) best = c;
      }
      if (!best || best.utility <= 0) continue;

      const cell = pickFreeCell(asteroid, world);
      if (cell) {
        applyCommand(world, { kind: "placeBuilding", asteroidId: asteroid.id, buildingKind: best.buildingKind, cell });
      }
    }
  }
}
