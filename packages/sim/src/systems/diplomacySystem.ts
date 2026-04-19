import type { World } from "@fa/domain";

export function tickDiplomacy(world: World): void {
  const now = world.tick;
  world.treaties = world.treaties.filter((t) => t.expiresTick == null || t.expiresTick > now);

  const human = [...world.players.values()].find((p) => p.isHuman);
  if (!human) return;

  for (const ship of world.ships.values()) {
    if (ship.order.kind !== "attackAsteroid") continue;
    const shipOwner = world.players.get(ship.ownerId);
    if (!shipOwner || shipOwner.isHuman || !shipOwner.alive) continue;

    const targetAsteroid = world.asteroids.get(ship.order.target);
    if (!targetAsteroid?.ownerId) continue;
    if (targetAsteroid.ownerId !== human.id) continue;

    const napIndex = world.treaties.findIndex(
      (t) =>
        t.kind === "nonAggression" &&
        t.parties.includes(ship.ownerId) &&
        t.parties.includes(human.id),
    );
    if (napIndex === -1) continue;

    world.eventQueue.push({
      kind: "treaty.broken",
      priority: "amber",
      by: ship.ownerId,
      against: human.id,
      treaty: "nonAggression",
    });
    world.treaties.splice(napIndex, 1);

    const current = human.reputation.get(ship.ownerId) ?? 0;
    human.reputation.set(ship.ownerId, current - 20);
  }
}
