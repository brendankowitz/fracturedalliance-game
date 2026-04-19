import type { World } from "@fa/domain";
import { DESTROYED_SECTOR_COORD } from "./asteroidEngineSystem.ts";

export function checkVictory(world: World): void {
  if (world.gameEndState !== null) return;

  const human = [...world.players.values()].find((p) => p.isHuman);

  if (!human || !human.alive) {
    world.gameEndState = "defeat";
    world.eventQueue.push({ kind: "game.ended", priority: "red", state: "defeat" });
    return;
  }

  // Military: all AI players dead
  const aiPlayers = [...world.players.values()].filter((p) => !p.isHuman);
  if (aiPlayers.length > 0 && aiPlayers.every((p) => !p.alive)) {
    world.gameEndState = "victory:military";
    world.eventQueue.push({ kind: "game.ended", priority: "red", state: "victory:military" });
    return;
  }

  // Economic: 1,000,000 credits
  if (human.credits >= 1_000_000) {
    world.gameEndState = "victory:economic";
    world.eventQueue.push({ kind: "game.ended", priority: "red", state: "victory:economic" });
    return;
  }

  // Diplomatic: federation standing >= 100
  if (human.federationStanding >= 100) {
    world.gameEndState = "victory:diplomatic";
    world.eventQueue.push({ kind: "game.ended", priority: "red", state: "victory:diplomatic" });
    return;
  }

  // Scientific: all 40 blueprints owned
  if (human.blueprintsOwned.size >= 40) {
    world.gameEndState = "victory:science";
    world.eventQueue.push({ kind: "game.ended", priority: "red", state: "victory:science" });
    return;
  }

  // Independence: human owns > 50% of non-destroyed asteroids
  const nonDestroyed = [...world.asteroids.values()].filter(
    (a) => a.sector.x !== DESTROYED_SECTOR_COORD || a.sector.y !== DESTROYED_SECTOR_COORD,
  );
  if (nonDestroyed.length > 0) {
    const humanOwned = nonDestroyed.filter((a) => a.ownerId === human.id).length;
    if (humanOwned / nonDestroyed.length > 0.5) {
      world.gameEndState = "victory:independence";
      world.eventQueue.push({
        kind: "game.ended",
        priority: "red",
        state: "victory:independence",
      });
    }
  }
}
