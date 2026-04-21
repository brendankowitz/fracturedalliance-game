import type { BuildingId, World } from "@fa/domain";

const MISSILE_STABILITY_DAMAGE = 0.3;

export function tickMissiles(world: World): void {
  if (world.missiles.length === 0) return;

  const arrived: string[] = [];

  for (const missile of world.missiles) {
    if (world.tick < missile.arrivalTick) continue;

    arrived.push(missile.id);

    const target = world.asteroids.get(missile.targetId);
    if (!target) continue;

    target.stability = Math.max(0, target.stability - MISSILE_STABILITY_DAMAGE);

    const destroyable = target.buildings.filter((bid) => {
      const b = world.buildings.get(bid);
      return b && b.constructionProgress >= 1;
    });
    if (destroyable.length > 0) {
      const idx = Math.floor(world.prng.next() * destroyable.length);
      const victimId = destroyable[idx]!;
      world.buildings.delete(victimId);
      (target as { buildings: BuildingId[] }).buildings = target.buildings.filter(
        (id) => id !== victimId,
      );
    }

    world.eventQueue.push({
      kind: "missile.impact",
      priority: "red",
      targetAsteroidName: target.name,
    });
  }

  world.missiles = world.missiles.filter((m) => !arrived.includes(m.id));
}
