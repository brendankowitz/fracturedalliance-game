import type { Player, TreatyKind, World } from "@fa/domain";

const ATTACK_VIOLATING_KINDS: ReadonlyArray<TreatyKind> = ["nonAggression", "peace", "openBorders"];

const GRUDGE_WINDOW_TICKS = 2400;

const GRUDGE_WEIGHTS: Readonly<Record<string, number>> = {
  human_attacked_asteroid: 5,
  human_captured_asteroid: 30,
};

export function computeGrudgeScore(aiPlayer: Player): number {
  return aiPlayer.eventLog.reduce((sum, e) => sum + (GRUDGE_WEIGHTS[e.kind] ?? 0), 0);
}

export function tickDiplomacy(world: World): void {
  const now = world.tick;
  world.treaties = world.treaties.filter((t) => t.expiresTick == null || t.expiresTick > now);

  // Trim AI event logs to rolling 2400-tick window
  const cutoff = world.tick - GRUDGE_WINDOW_TICKS;
  for (const player of world.players.values()) {
    if (player.isHuman) continue;
    player.eventLog = player.eventLog.filter((e) => e.tick >= cutoff);
  }

  const human = [...world.players.values()].find((p) => p.isHuman);
  if (!human) return;

  // Record grudge events when human ships attack AI asteroids (every 20 ticks)
  for (const ship of world.ships.values()) {
    if (ship.ownerId !== human.id) continue;
    if (ship.order.kind !== "attackAsteroid") continue;
    const target = world.asteroids.get(ship.order.target);
    if (!target?.ownerId) continue;
    const aiOwner = world.players.get(target.ownerId);
    if (!aiOwner || aiOwner.isHuman || !aiOwner.alive) continue;
    if (world.tick % 20 === 0) {
      aiOwner.eventLog.push({
        tick: world.tick,
        kind: "human_attacked_asteroid",
        data: { by: human.id as string, asteroidId: target.id as string },
      });
    }
  }

  // Detect treaty violations — AI ships attacking human asteroids
  for (const ship of world.ships.values()) {
    if (ship.order.kind !== "attackAsteroid") continue;
    const shipOwner = world.players.get(ship.ownerId);
    if (!shipOwner || shipOwner.isHuman || !shipOwner.alive) continue;

    const targetAsteroid = world.asteroids.get(ship.order.target);
    if (!targetAsteroid?.ownerId) continue;
    if (targetAsteroid.ownerId !== human.id) continue;

    for (const kind of ATTACK_VIOLATING_KINDS) {
      const treatyIndex = world.treaties.findIndex(
        (t) =>
          t.kind === kind &&
          t.parties.includes(ship.ownerId) &&
          t.parties.includes(human.id),
      );
      if (treatyIndex === -1) continue;

      world.eventQueue.push({
        kind: "treaty.broken",
        priority: "amber",
        by: ship.ownerId,
        against: human.id,
        treaty: kind,
      });
      world.treaties.splice(treatyIndex, 1);

      const current = human.reputation.get(ship.ownerId) ?? 0;
      human.reputation.set(ship.ownerId, current - 20);
    }
  }
}
