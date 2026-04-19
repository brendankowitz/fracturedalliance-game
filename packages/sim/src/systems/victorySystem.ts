import type { World } from "@fa/domain";

const TICKS_PER_DAY = 100;
const SURVIVOR_WIN_DAYS = 30;

export function tickVictory(world: World): void {
  if (world.gameEndState !== null) return;

  const human = [...world.players.values()].find((p) => p.isHuman);
  if (!human || !human.alive) {
    world.gameEndState = "defeat";
    return;
  }

  const humanHasAsteroid = [...world.asteroids.values()].some((a) => a.ownerId === human.id);
  if (!humanHasAsteroid) {
    world.gameEndState = "defeat";
    return;
  }

  // Survivor: survive 30 sim-days
  if (world.tick >= SURVIVOR_WIN_DAYS * TICKS_PER_DAY) {
    world.gameEndState = "victory.survivor";
    return;
  }

  // Military Dominance: no living AI player owns any asteroid
  const aiOwnsAsteroid = [...world.asteroids.values()].some((a) => {
    if (!a.ownerId) return false;
    const owner = world.players.get(a.ownerId);
    return owner !== undefined && !owner.isHuman && owner.alive;
  });
  if (!aiOwnsAsteroid) {
    world.gameEndState = "victory.militaryDominance";
  }
}
