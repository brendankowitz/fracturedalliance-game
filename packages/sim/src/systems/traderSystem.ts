import type { World } from "@fa/domain";

export const TICKS_PER_MONTH = 3_000;
export const TRADER_WINDOW_TICKS = 600;

export function isTraderActive(tick: number): boolean {
  return tick >= TICKS_PER_MONTH && tick % TICKS_PER_MONTH < TRADER_WINDOW_TICKS;
}

export function tickTrader(world: World): void {
  if (world.tick <= 0) return;
  if (world.tick % TICKS_PER_MONTH !== 0) return;

  // Trader arrives — emit event for each human-owned asteroid
  for (const asteroid of world.asteroids.values()) {
    if (!asteroid.ownerId) continue;
    const player = world.players.get(asteroid.ownerId);
    if (!player?.isHuman) continue;
    world.eventQueue.push({ kind: "trader.arrived", priority: "amber", asteroidId: asteroid.id });
  }
}
