import type { AsteroidId, EventPriority, PlayerId, ShipId, World } from "@fa/domain";
import { COMBAT_RADIUS } from "./systems/combatSystem.ts";
import { computePowerBalance } from "./systems/resourceSystem.ts";
import { isTraderActive } from "./systems/traderSystem.ts";

export interface AsteroidSnapshot {
  id: AsteroidId;
  name: string;
  ownerId: string | null;
  sector: { x: number; y: number };
  sizeClass: string;
  deposits: Partial<Record<string, number>>;
  radiation: number;
  stability: number;
  happiness: number;
  buildingKinds: string[];
  buildQueue: Array<{ buildingKind: string; progressTicks: number; totalTicks: number }>;
  powerBalance: number;
}

export interface ShipSnapshot {
  id: ShipId;
  defKind: string;
  ownerId: PlayerId;
  position: { x: number; y: number };
  orderKind: string;
}

export interface CombatFlash {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export interface DiplomacyEntry {
  playerId: PlayerId;
  raceId: string;
  reputation: number;
  napActive: boolean;
  napExpiresTick: number | null;
}

export interface HudSnapshot {
  tick: number;
  credits: number;
  federationStanding: number;
  humanPlayerId: string;
  traderActive: boolean;
  oreInventory: Partial<Record<string, number>>;
  players: Array<{ id: string; raceId: string; isHuman: boolean; alive: boolean; credits: number }>;
  asteroids: AsteroidSnapshot[];
  ships: ShipSnapshot[];
  events: Array<{ kind: string; priority: EventPriority }>;
  marketPrices: Record<string, number>;
  combatFlashes: CombatFlash[];
  diplomacy: DiplomacyEntry[];
}

export function takeSnapshot(world: World): HudSnapshot {
  const human = [...world.players.values()].find((p) => p.isHuman);
  if (!human) throw new Error("takeSnapshot: world has no human player");

  const asteroids: AsteroidSnapshot[] = [...world.asteroids.values()].map((a) => ({
    id: a.id,
    name: a.name,
    ownerId: a.ownerId,
    sector: { x: a.sector.x, y: a.sector.y },
    sizeClass: a.sizeClass,
    deposits: Object.fromEntries(
      Object.entries(a.deposits).filter((entry): entry is [string, number] => entry[1] != null),
    ),
    radiation: a.radiation,
    stability: a.stability,
    happiness: a.happiness,
    buildingKinds: a.buildings.flatMap((bid) => {
      const b = world.buildings.get(bid);
      return b ? [b.defKind] : [];
    }),
    buildQueue: a.buildQueue.map((q) => ({
      buildingKind: q.buildingKind,
      progressTicks: q.progressTicks,
      totalTicks: q.totalTicks,
    })),
    powerBalance: computePowerBalance(world, a.id),
  }));

  return {
    tick: world.tick,
    credits: human.credits,
    federationStanding: human.federationStanding,
    humanPlayerId: human.id,
    traderActive: isTraderActive(world.tick),
    oreInventory: Object.fromEntries(
      Object.entries(human.oreInventory).filter(
        (entry): entry is [string, number] => (entry[1] ?? 0) > 0,
      ),
    ),
    players: [...world.players.values()].map((p) => ({
      id: p.id,
      raceId: p.raceId,
      isHuman: p.isHuman,
      alive: p.alive,
      credits: p.credits,
    })),
    asteroids,
    ships: [...world.ships.values()].map((s) => ({
      id: s.id,
      defKind: s.defKind,
      ownerId: s.ownerId,
      position: { x: s.position.x, y: s.position.y },
      orderKind: s.order.kind,
    })),
    events: world.eventQueue.map((e) => ({ kind: e.kind, priority: e.priority })),
    marketPrices: Object.fromEntries(Object.entries(world.marketPrices)),
    diplomacy: [...world.players.values()]
      .filter((p) => !p.isHuman && p.alive)
      .map((p) => {
        const nap = world.treaties.find(
          (t) =>
            t.kind === "nonAggression" && t.parties.includes(human.id) && t.parties.includes(p.id),
        );
        return {
          playerId: p.id,
          raceId: p.raceId,
          reputation: human.reputation.get(p.id) ?? 0,
          napActive: nap != null,
          napExpiresTick: nap?.expiresTick ?? null,
        };
      }),
    combatFlashes: [...world.ships.values()].flatMap((ship) => {
      if (ship.order.kind !== "attackAsteroid") return [];
      const target = world.asteroids.get(ship.order.target);
      if (!target) return [];
      const dx = target.sector.x - ship.position.x;
      const dy = target.sector.y - ship.position.y;
      if (Math.sqrt(dx * dx + dy * dy) > COMBAT_RADIUS) return [];
      return [
        {
          fromX: ship.position.x,
          fromY: ship.position.y,
          toX: target.sector.x,
          toY: target.sector.y,
        },
      ];
    }),
  };
}
