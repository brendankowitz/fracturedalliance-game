import type { World } from "@fa/domain";

export function tickBlackMarket(world: World): void {
  const human = [...world.players.values()].find((p) => p.isHuman);
  if (!human) return;

  if (world.tick % 100 === 0) {
    human.suspicion = Math.max(0, human.suspicion - 1);

    if (human.suspicion >= 80 && human.federationStanding > 0) {
      if (world.prng.next() < 0.3) {
        world.eventQueue.push({ kind: "federation.investigation_warning", priority: "amber" });
        human.federationStanding = Math.max(-100, human.federationStanding - 10);
      }
    }
  }

  if (world.tick % 50 === 0) {
    for (const asteroid of world.asteroids.values()) {
      if (asteroid.ownerId !== human.id) continue;
      if (asteroid.happiness >= 0.3) continue;
      if (world.prng.next() < 0.05) {
        asteroid.ownerId = null;
        world.eventQueue.push({
          kind: "asteroid.independence",
          priority: "amber",
          asteroidName: asteroid.name,
        });
        human.federationStanding = Math.max(-100, human.federationStanding - 5);
      }
    }
  }
}
