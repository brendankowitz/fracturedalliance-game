import type { AsteroidId, World } from "@fa/domain";
import { computePowerBalance } from "./systems/resourceSystem.ts";

export interface AsteroidSnapshot {
  id: AsteroidId;
  name: string;
  ownerId: string | null;
  sector: { x: number; y: number };
  sizeClass: string;
  deposits: Record<string, number>;
  radiation: number;
  stability: number;
  happiness: number;
  buildingKinds: string[];
  buildQueue: Array<{ buildingKind: string; progressTicks: number; totalTicks: number }>;
  powerBalance: number;
}

export interface HudSnapshot {
  tick: number;
  credits: number;
  federationStanding: number;
  asteroids: AsteroidSnapshot[];
  events: Array<{ kind: string; priority: string }>;
}

export function takeSnapshot(world: World): HudSnapshot {
  const human = [...world.players.values()].find((p) => p.isHuman);

  const asteroids: AsteroidSnapshot[] = [...world.asteroids.values()].map((a) => ({
    id: a.id,
    name: a.name,
    ownerId: a.ownerId,
    sector: { x: a.sector.x, y: a.sector.y },
    sizeClass: a.sizeClass,
    deposits: Object.fromEntries(Object.entries(a.deposits).filter(([, v]) => v != null)) as Record<
      string,
      number
    >,
    radiation: a.radiation,
    stability: a.stability,
    happiness: a.happiness,
    buildingKinds: a.buildings.map((bid) => world.buildings.get(bid)?.defKind ?? ""),
    buildQueue: a.buildQueue.map((q) => ({
      buildingKind: q.buildingKind,
      progressTicks: q.progressTicks,
      totalTicks: q.totalTicks,
    })),
    powerBalance: computePowerBalance(world, a.id),
  }));

  return {
    tick: world.tick,
    credits: human?.credits ?? 0,
    federationStanding: human?.federationStanding ?? 0,
    asteroids,
    events: world.eventQueue.map((e) => ({ kind: e.kind, priority: e.priority })),
  };
}
