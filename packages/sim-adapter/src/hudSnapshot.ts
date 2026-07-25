/**
 * Projects the vendored (@fab) World into opus's `HudSnapshot` shape, plus
 * V2 extras (calendar date, population, colony stocks, council state).
 *
 * Together with commandTranslator.ts this is the only place the two domains
 * meet; opus-branded ids are minted here by casting the underlying strings.
 * Existing HUD panels keep working off the familiar fields; new UI reads
 * the extras.
 */

import type {
  AsteroidId as OpusAsteroidId,
  PlayerId as OpusPlayerId,
  ShipId as OpusShipId,
} from "@fa/domain";
import type { AgentSnapshot, HudSnapshot } from "@fa/sim";
import { formatSimDate, simDay } from "@fa/sim";
import { BUILDINGS } from "@fab/content";
import type { GameEvent, World } from "@fab/domain";
import { AGENT_CATALOGUE } from "@fab/domain";
import { FED_TRANSPORTER_INTERVAL_TICKS } from "@fab/sim";
import { unmapBuildingKind, unmapShipKind } from "./buildingKindMap.ts";
import { POSITION_SCALE } from "./commandTranslator.ts";

export interface CouncilSummary {
  embargoes: Array<{ target: string; reason: string; expiresTick: number }>;
  tariffs: Array<{ ore: string; multiplier: number; expiresTick: number }>;
  openVotes: Array<{ id: string; description: string; resolveTick: number }>;
}

export interface HudSnapshotV2 extends HudSnapshot {
  /** Tick on which the Federal Transporter next drains queued orders. */
  transporterNextTick: number;
  /** Per-asteroid extras keyed by asteroid id. */
  colonyExtras: Record<
    string,
    {
      population: number;
      stocks: { food: number; water: number; air: number; ores: Partial<Record<string, number>> };
    }
  >;
  council: CouncilSummary;
  researchInProgress: { blueprintId: string; remainingTicks: number; totalTicks: number } | null;
}

const FAB_TO_OPUS_MISSION: Readonly<Record<string, AgentSnapshot["missionKind"]>> = {
  intelGather: "recon",
  stealBlueprint: "techSteal",
  sabotageLifeSupport: "sabotage",
  sabotagePower: "sabotage",
  sabotageDefences: "sabotage",
  sabotageConstruction: "sabotage",
  plantVirus: "sabotage",
  blackmail: "blackmail",
  liberate: "liberate",
};

const mapGameEnd = (world: World, humanId: string): HudSnapshot["gameEndState"] => {
  const outcome = world.outcome;
  if (!outcome) return null;
  if (outcome.winnerId !== humanId) return "defeat";
  switch (outcome.condition) {
    case "economic":
      return "victory:economic";
    case "military":
      return "victory:military";
    case "diplomatic":
      return "victory:diplomatic";
    case "scientific":
      return "victory:science";
    // opus has no "survivor" end state; independence is the nearest banner
    // until the Phase-D end-screen rework adds one.
    case "survival":
      return "victory:independence";
  }
};

/**
 * Build the snapshot. `events` must be the events newly delivered since the
 * previous snapshot (the caller owns the cursor) so SFX/notifications fire
 * once, matching opus semantics.
 */
export function takeHudSnapshot(
  world: World,
  difficulty: HudSnapshot["difficulty"],
  events: readonly GameEvent[],
): HudSnapshotV2 {
  const human = [...world.players.values()].find((p) => p.isHuman);
  if (!human) throw new Error("takeHudSnapshot: vendored world has no human player");

  const oreInventory: Partial<Record<string, number>> = {};
  const colonyExtras: HudSnapshotV2["colonyExtras"] = {};

  const asteroids: HudSnapshot["asteroids"] = [...world.asteroids.values()].map((a) => {
    if (a.ownerId === human.id) {
      for (const [ore, tonnes] of Object.entries(a.stocks.ores)) {
        if (tonnes && tonnes > 0) oreInventory[ore] = (oreInventory[ore] ?? 0) + tonnes;
      }
    }
    colonyExtras[a.id] = {
      population: a.population,
      stocks: {
        food: a.stocks.food,
        water: a.stocks.water,
        air: a.stocks.air,
        ores: { ...a.stocks.ores },
      },
    };

    let powerBalance = 0;
    const buildingKinds: string[] = [];
    const buildingsGrid: HudSnapshot["asteroids"][number]["buildingsGrid"] = [];
    for (const bid of a.buildings) {
      const b = world.buildings.get(bid);
      if (!b) continue;
      const opusKind = unmapBuildingKind(b.defKind);
      buildingKinds.push(opusKind);
      if (b.constructionProgress >= 1) {
        buildingsGrid.push({ kind: opusKind, cell: { x: b.cell.x, y: b.cell.y } });
        if (b.active) {
          const def = (BUILDINGS as Record<string, { powerDelta?: number } | undefined>)[b.defKind];
          powerBalance += def?.powerDelta ?? 0;
        }
      }
    }

    const missile = world.missiles.find((m) => m.targetAsteroid === a.id);

    return {
      id: a.id as unknown as OpusAsteroidId,
      name: a.name,
      ownerId: a.ownerId,
      sector: { x: a.sector.x / POSITION_SCALE, y: a.sector.y / POSITION_SCALE },
      sizeClass: a.sizeClass,
      deposits: Object.fromEntries(
        Object.entries(a.deposits).filter((e): e is [string, number] => e[1] != null && e[1] > 0),
      ),
      radiation: a.radiation,
      stability: a.stability,
      happiness: a.happiness,
      buildingKinds,
      buildingsGrid,
      buildQueue: a.buildQueue.map((q) => ({
        buildingKind: unmapBuildingKind(q.kind),
        progressTicks: q.progressTicks,
        totalTicks: q.totalTicks,
        queuedAt: 0,
      })),
      powerBalance,
      engines: {
        count: a.engines.count,
        destinationId: a.engines.destination,
        etaTick: a.engines.etaTick,
        chargeTick: null,
      },
      incomingMissile: missile ? { arrivalTick: world.tick + missile.remainingTicks } : null,
    };
  });

  const espionage = world.espionage;
  const agents: AgentSnapshot[] = AGENT_CATALOGUE.map((def) => {
    const live = espionage?.agents.find((a) => a.id === def.id);
    const mission = espionage?.missions.find((m) => m.agentId === def.id);
    return {
      id: def.id,
      name: def.name,
      owned: live?.employer === human.id,
      stealth: def.skill,
      hireCost: def.hireCost,
      missionKind: mission ? (FAB_TO_OPUS_MISSION[mission.kind] ?? "recon") : null,
      missionTarget: mission ? String(mission.target) : null,
      missionCompleteTick: mission ? mission.resolveTick : null,
    };
  });

  const council: CouncilSummary = {
    embargoes: (world.council?.embargoes ?? []).map((e) => ({
      target: String(e.target),
      reason: e.reason,
      expiresTick: e.expiresTick,
    })),
    tariffs: (world.council?.tariffs ?? []).map((t) => ({
      ore: String(t.ore),
      multiplier: t.multiplier,
      expiresTick: t.expiresTick,
    })),
    openVotes: (world.council?.openVotes ?? []).map((v) => ({
      id: v.id,
      description: v.description,
      resolveTick: v.resolveTick,
    })),
  };

  return {
    tick: world.tick,
    seed: world.seed,
    difficulty,
    credits: human.credits,
    federationStanding: human.federationStanding,
    suspicion: human.suspicion,
    humanPlayerId: human.id,
    traderActive:
      world.tick % FED_TRANSPORTER_INTERVAL_TICKS >= FED_TRANSPORTER_INTERVAL_TICKS - 600,
    oreInventory,
    players: [...world.players.values()].map((p) => ({
      id: p.id,
      raceId: p.raceId,
      isHuman: p.isHuman,
      alive: p.alive,
      credits: p.credits,
    })),
    asteroids,
    ships: [...world.ships.values()].map((s) => ({
      id: s.id as unknown as OpusShipId,
      defKind: unmapShipKind(s.defKind),
      ownerId: s.ownerId as unknown as OpusPlayerId,
      position: { x: s.position.x / POSITION_SCALE, y: s.position.y / POSITION_SCALE },
      orderKind: s.order.kind,
    })),
    events: events.map((e) => ({ kind: e.kind, priority: e.severity })),
    marketPrices: { ...world.market.current },
    combatFlashes: [...world.ships.values()].flatMap((ship) => {
      if (ship.order.kind !== "attackAsteroid") return [];
      const target = world.asteroids.get(ship.order.target);
      if (!target) return [];
      const dx = target.position.x - ship.position.x;
      const dy = target.position.y - ship.position.y;
      if (Math.hypot(dx, dy) > 20) return [];
      return [
        {
          fromX: ship.position.x / POSITION_SCALE,
          fromY: ship.position.y / POSITION_SCALE,
          toX: target.position.x / POSITION_SCALE,
          toY: target.position.y / POSITION_SCALE,
        },
      ];
    }),
    diplomacy: [...world.players.values()]
      .filter((p) => !p.isHuman && p.alive)
      .map((p) => ({
        playerId: p.id as unknown as OpusPlayerId,
        raceId: p.raceId,
        reputation: human.reputation[p.id] ?? 0,
        activeTreaties: world.treaties
          .filter((t) => t.parties.includes(human.id) && t.parties.includes(p.id))
          .map((t) => ({
            kind: t.kind as HudSnapshot["diplomacy"][number]["activeTreaties"][number]["kind"],
            expiresTick: t.expiresTick ?? null,
          })),
        grudgeScore: p.eventLog.filter((e) => e.kind === "attacked").length * 5,
      })),
    gameEndState: mapGameEnd(world, human.id),
    blueprintsOwned: [...human.blueprintsOwned],
    agents,
    day: simDay(world.tick),
    date: formatSimDate(simDay(world.tick)),
    // ── V2 extras ─────────────────────────────────────────────────────────
    transporterNextTick: world.federalTransporterNextTick,
    colonyExtras,
    council,
    researchInProgress: human.activeResearch
      ? {
          blueprintId: human.activeResearch.blueprintId,
          remainingTicks: human.activeResearch.remainingTicks,
          totalTicks: human.activeResearch.totalTicks,
        }
      : null,
  };
}
