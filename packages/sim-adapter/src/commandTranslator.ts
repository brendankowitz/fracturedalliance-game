/**
 * Translates opus UI `Command`s into vendored-sim `PlayerCommand`s.
 *
 * This file and hudSnapshot.ts are the only two places where the opus and
 * @fab domains meet; every cross-domain cast lives here (Stage 1 adoption
 * spec §2, condition (b)).
 *
 * Returns `null` for commands with no vendored equivalent yet — the caller
 * drops them. Dropped kinds are deliberate Phase-B scope cuts, documented
 * per-case below; they come back with the Stage-3/4 panel rework.
 */

import type { Command } from "@fa/sim";
import type { AsteroidId, PlayerCommand, PlayerId, ShipId, ShipOrder, World } from "@fab/domain";
import { mapBuildingKind, mapShipKind } from "./buildingKindMap.ts";

/** World-position units per opus sector unit (vendored belts place rocks 100 apart). */
export const POSITION_SCALE = 100;

const asFabAsteroidId = (id: string): AsteroidId => id as AsteroidId;
const asFabShipId = (id: string): ShipId => id as ShipId;
const asFabPlayerId = (id: string): PlayerId => id as PlayerId;

const translateShipOrder = (order: {
  kind: string;
  target?: unknown;
  payload?: unknown;
}): ShipOrder | null => {
  switch (order.kind) {
    case "idle":
      return { kind: "idle" };
    case "moveTo": {
      const t = order.target as { x: number; y: number };
      return { kind: "moveTo", target: { x: t.x * POSITION_SCALE, y: t.y * POSITION_SCALE } };
    }
    // opus "scout" orders carry sector coordinates; vendored movement has no
    // scout order, so scouting becomes a plain flight to those coordinates.
    case "scout": {
      const t = order.target as { x: number; y: number };
      return { kind: "moveTo", target: { x: t.x * POSITION_SCALE, y: t.y * POSITION_SCALE } };
    }
    case "attackAsteroid":
      return { kind: "attackAsteroid", target: asFabAsteroidId(order.target as string) };
    case "defend":
      return { kind: "defend", target: asFabAsteroidId(order.target as string) };
    default:
      return null;
  }
};

/**
 * Translate one opus command. `humanId` is the vendored-world id of the
 * human player; `world` is consulted for context the opus command does not
 * carry (e.g. which colony an ore sale should draw from).
 */
export function translateCommand(
  cmd: Command,
  humanId: PlayerId,
  world: World,
): PlayerCommand | null {
  switch (cmd.kind) {
    case "placeBuilding":
      return {
        kind: "queueBuild",
        asteroid: asFabAsteroidId(cmd.asteroidId),
        building: mapBuildingKind(cmd.buildingKind),
        cell: cmd.cell,
      };
    case "cancelBuildQueue":
      return {
        kind: "cancelBuild",
        asteroid: asFabAsteroidId(cmd.asteroidId),
        index: cmd.index,
      };
    case "launchShip":
      return {
        kind: "produceShip",
        from: humanId,
        asteroid: asFabAsteroidId(cmd.asteroidId),
        ship: mapShipKind(cmd.shipKind) as Extract<PlayerCommand, { kind: "produceShip" }>["ship"],
      };
    case "orderShip": {
      const order = translateShipOrder(cmd.order);
      if (!order) return null; // trade orders have no vendored equivalent yet
      return { kind: "issueShipOrder", ship: asFabShipId(cmd.shipId), order };
    }
    case "sellOre":
    case "sellOreToTrader": {
      // The instant spot market is gone by design: sales become queued
      // Federal Transporter orders drained on the transporter cadence. An
      // explicit asteroidId (per-colony ledger UI) wins; otherwise draw from
      // the colony holding the most of that ore.
      const explicit = cmd.kind === "sellOre" ? cmd.asteroidId : undefined;
      const source = explicit
        ? { asteroidId: asFabAsteroidId(explicit), stock: stockAt(world, explicit, cmd.oreKind) }
        : pickColonyWithOre(world, humanId, cmd.oreKind);
      if (!source) return null;
      const tonnes = cmd.kind === "sellOre" ? Math.min(cmd.quantity, source.stock) : source.stock;
      if (tonnes <= 0) return null;
      return {
        kind: "queueSellOrder",
        playerId: humanId,
        asteroid: source.asteroidId,
        ore: cmd.oreKind as Extract<PlayerCommand, { kind: "queueSellOrder" }>["ore"],
        tonnes,
      };
    }
    case "buyOre": {
      const colony = cmd.asteroidId ? asFabAsteroidId(cmd.asteroidId) : firstColony(world, humanId);
      if (!colony) return null;
      return {
        kind: "queueBuyOrder",
        playerId: humanId,
        asteroid: colony,
        ore: cmd.oreKind as Extract<PlayerCommand, { kind: "queueBuyOrder" }>["ore"],
        tonnes: cmd.quantity,
      };
    }
    case "proposeTreaty":
      return {
        kind: "proposeTreaty",
        from: humanId,
        with: asFabPlayerId(cmd.targetPlayerId),
        treaty: cmd.treatyKind as Extract<PlayerCommand, { kind: "proposeTreaty" }>["treaty"],
      };
    case "buyBlueprint":
      // Purchases become timed research in the vendored model. Blueprint ids
      // differ between catalogues; unmapped ids are forwarded so the sim
      // rejects them visibly. Full id mapping arrives with the Stage-3
      // BlueprintShop rework.
      return {
        kind: "startResearch",
        playerId: humanId,
        blueprint: cmd.blueprintId as Extract<
          PlayerCommand,
          { kind: "startResearch" }
        >["blueprint"],
      };
    case "fireMissile": {
      const source = world.asteroids.get(asFabAsteroidId(cmd.sourceAsteroidId));
      if (!source?.ownerId) return null;
      return {
        kind: "launchMissile",
        from: source.ownerId,
        fromAsteroid: asFabAsteroidId(cmd.sourceAsteroidId),
        target: asFabAsteroidId(cmd.targetAsteroidId),
        missile: "basic",
      };
    }
    case "setAsteroidDestination": {
      const dest = world.asteroids.get(asFabAsteroidId(cmd.destinationId));
      if (!dest) return null;
      return {
        kind: "setAsteroidCourse",
        from: humanId,
        asteroid: asFabAsteroidId(cmd.asteroidId),
        targetX: dest.position.x,
        targetY: dest.position.y,
        thrust: 1,
      };
    }
    case "settleAsteroid":
      return {
        kind: "settleAsteroid",
        from: humanId,
        asteroid: asFabAsteroidId(cmd.asteroidId),
      };
    // ── Dropped in Phase B (documented scope cuts) ────────────────────────
    // cancelAsteroidEngine: no vendored abort path yet (abortEngine is a
    //   legacy stub upstream); engine UI is unreachable until Phase C.
    // hireAgent / assignMission: vendored espionage hires per-mission via
    //   dispatchAgent; the panel is redesigned in Stage 3.
    // blackMarketBuy / bribeOfficial: the opus item shop has no vendored
    //   equivalent; replaced by the Stage-3 market redesign.
    case "cancelAsteroidEngine":
    case "hireAgent":
    case "assignMission":
    case "blackMarketBuy":
    case "bribeOfficial":
      return null;
    default:
      return null;
  }
}

const firstColony = (world: World, ownerId: PlayerId): AsteroidId | null => {
  for (const a of world.asteroids.values()) {
    if (a.ownerId === ownerId) return a.id;
  }
  return null;
};

const stockAt = (world: World, asteroidId: string, ore: string): number => {
  const a = world.asteroids.get(asFabAsteroidId(asteroidId));
  return a?.stocks.ores[ore as keyof typeof a.stocks.ores] ?? 0;
};

const pickColonyWithOre = (
  world: World,
  ownerId: PlayerId,
  ore: string,
): { asteroidId: AsteroidId; stock: number } | null => {
  let best: { asteroidId: AsteroidId; stock: number } | null = null;
  for (const a of world.asteroids.values()) {
    if (a.ownerId !== ownerId) continue;
    const stock = a.stocks.ores[ore as keyof typeof a.stocks.ores] ?? 0;
    if (best === null || stock > best.stock) best = { asteroidId: a.id, stock };
  }
  return best;
};
