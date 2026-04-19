import type { AsteroidId, EventPriority, World } from "@fa/domain";
import { computePowerBalance } from "./systems/resourceSystem.ts";

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

export interface HudSnapshot {
  tick: number;
  credits: number;
  federationStanding: number;
  asteroids: AsteroidSnapshot[];
  events: Array<{ kind: string; priority: EventPriority }>;
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
    asteroids,
    events: world.eventQueue.map((e) => ({ kind: e.kind, priority: e.priority })),
  };
}
