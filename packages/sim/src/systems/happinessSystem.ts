import type { World } from "@fa/domain";

const STRIKE_HAPPINESS_THRESHOLD = 0.3;
const SECESSION_HAPPINESS_THRESHOLD = 0.1;
const SECESSION_CHECK_INTERVAL = 100;
const SECESSION_CHANCE = 0.05;

export function getHappinessMultiplier(happiness: number): number {
  return happiness < STRIKE_HAPPINESS_THRESHOLD ? 0.5 : 1.0;
}

export function tickHappiness(world: World): void {
  for (const asteroid of world.asteroids.values()) {
    if (!asteroid.ownerId) continue;
    if (asteroid.happiness >= SECESSION_HAPPINESS_THRESHOLD) continue;
    if (world.tick % SECESSION_CHECK_INTERVAL !== 0) continue;
    if (world.prng.next() >= SECESSION_CHANCE) continue;

    const ownerId = asteroid.ownerId;
    asteroid.ownerId = null;
    const owner = world.players.get(ownerId);
    if (owner?.isHuman) {
      world.eventQueue.push({ kind: "colony.seceded", priority: "amber", asteroidName: asteroid.name });
    }
  }
}
