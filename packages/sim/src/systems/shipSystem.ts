import { getShipDef } from "@fa/content";
import type { World } from "@fa/domain";

export const ARRIVAL_RADIUS = 0.5; // sector units — ship is "at destination" when within this range

function length(v: { x: number; y: number }): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

function normalize(v: { x: number; y: number }): { x: number; y: number } {
  const len = length(v);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function tickShips(world: World): void {
  for (const ship of world.ships.values()) {
    const def = getShipDef(ship.defKind);
    if (!def) continue;

    const order = ship.order;
    if (order.kind === "idle" || order.kind === "defend") continue;

    // Resolve target position
    let targetPos: { x: number; y: number } | null = null;
    if (order.kind === "moveTo") targetPos = order.target;
    if (order.kind === "scout") targetPos = order.target;
    if (order.kind === "attackAsteroid") {
      const target = world.asteroids.get(order.target);
      if (target) targetPos = { x: target.sector.x, y: target.sector.y };
    }
    if (order.kind === "trade") {
      const target = world.asteroids.get(order.target);
      if (target) targetPos = { x: target.sector.x, y: target.sector.y };
    }

    if (!targetPos) continue;

    const dx = targetPos.x - ship.position.x;
    const dy = targetPos.y - ship.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= ARRIVAL_RADIUS) {
      // Arrived — snap to target
      ship.position.x = targetPos.x;
      ship.position.y = targetPos.y;
      ship.velocity.x = 0;
      ship.velocity.y = 0;
      // Only go idle if not an attack order — attackers stay in place for combat
      if (ship.order.kind !== "attackAsteroid") {
        ship.order = { kind: "idle" };
      }
      continue;
    }

    // Reynolds arrive: slow down when near destination
    const speedFraction = dist < 2.0 ? dist / 2.0 : 1.0;
    const desiredSpeed = Math.min(def.speed * speedFraction, dist);
    const dir = normalize({ x: dx, y: dy });

    ship.velocity.x = dir.x * desiredSpeed;
    ship.velocity.y = dir.y * desiredSpeed;
    ship.position.x += ship.velocity.x;
    ship.position.y += ship.velocity.y;
  }
}
