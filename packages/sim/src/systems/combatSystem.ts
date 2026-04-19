import { getShipDef } from "@fa/content";
import type { ShipId, World } from "@fa/domain";

export const COMBAT_RADIUS = 0.5; // sector units — ship must be this close to attack
const DAMAGE_PER_HARDPOINT = 5; // HP per tick per hardpoint

export function tickCombat(world: World): void {
  // Attacking ships deal damage
  for (const ship of world.ships.values()) {
    if (ship.order.kind !== "attackAsteroid") continue;

    const target = world.asteroids.get(ship.order.target);
    if (!target) continue;

    const dx = target.sector.x - ship.position.x;
    const dy = target.sector.y - ship.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > COMBAT_RADIUS) continue;

    const attackerDef = getShipDef(ship.defKind);
    if (!attackerDef || attackerDef.hardpoints === 0) continue;

    const damage = attackerDef.hardpoints * DAMAGE_PER_HARDPOINT;

    // Damage defending ships first; if none, damage asteroid stability
    let hitDefender = false;
    for (const defender of world.ships.values()) {
      if (defender.id === ship.id) continue;
      if (defender.ownerId === ship.ownerId) continue; // don't friendly-fire
      if (defender.order.kind !== "defend") continue;
      if (defender.order.target !== target.id) continue;
      if (defender.hullHp <= 0) continue; // already killed this tick

      defender.hullHp = Math.max(0, defender.hullHp - damage);
      hitDefender = true;
      break;
    }

    if (!hitDefender) {
      target.stability = Math.max(0, target.stability - damage * 0.1);
    }

    // Fire colony.under_attack event once per tick per asteroid
    if (
      target.ownerId &&
      target.ownerId !== ship.ownerId &&
      !world.eventQueue.some((e) => e.kind === "colony.under_attack" && e.asteroidId === target.id)
    ) {
      world.eventQueue.push({
        kind: "colony.under_attack",
        priority: "red",
        asteroidId: target.id,
        attackerId: ship.ownerId,
      });
    }
  }

  // Defending ships counter-attack
  for (const defender of world.ships.values()) {
    if (defender.order.kind !== "defend") continue;

    const defAsteroid = world.asteroids.get(defender.order.target);
    if (!defAsteroid) continue;

    const defDef = getShipDef(defender.defKind);
    if (!defDef || defDef.hardpoints === 0) continue;

    const damage = defDef.hardpoints * DAMAGE_PER_HARDPOINT;

    for (const attacker of world.ships.values()) {
      if (attacker.order.kind !== "attackAsteroid") continue;
      if (attacker.order.target !== defAsteroid.id) continue;
      if (attacker.ownerId === defender.ownerId) continue;

      const dx = defAsteroid.sector.x - attacker.position.x;
      const dy = defAsteroid.sector.y - attacker.position.y;
      if (Math.sqrt(dx * dx + dy * dy) > COMBAT_RADIUS) continue;

      attacker.hullHp = Math.max(0, attacker.hullHp - damage);
      break;
    }
  }

  // Remove destroyed ships
  const dead: ShipId[] = [];
  for (const [id, ship] of world.ships) {
    if (ship.hullHp <= 0) dead.push(id);
  }
  for (const id of dead) {
    world.ships.delete(id);
  }
}
