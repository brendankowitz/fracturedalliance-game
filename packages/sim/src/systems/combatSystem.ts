import { findBuildingDef, getShipDef } from "@fa/content";
import type { Ship, ShipId, World } from "@fa/domain";

export const COMBAT_RADIUS = 0.5; // sector units — ship must be this close to attack
const DAMAGE_PER_HARDPOINT = 5; // HP per tick per hardpoint
const KRYLL_ACCUSATION_DAMAGE_BONUS = 1.25;
const BRAKKAT_RETALIATION_COUNT = 2;

export function tickCombat(world: World): void {
  // Attacking ships deal damage
  for (const ship of world.ships.values()) {
    if (ship.order.kind !== "attackAsteroid") continue;

    // Achar Gatherings: skip attack orders during grace period
    const shipOwner = world.players.get(ship.ownerId);
    if (
      shipOwner &&
      !shipOwner.isHuman &&
      shipOwner.raceId === "achar" &&
      shipOwner.gracePeriodUntil !== undefined &&
      world.tick < shipOwner.gracePeriodUntil
    ) {
      continue;
    }

    const target = world.asteroids.get(ship.order.target);
    if (!target) continue;

    const dx = target.sector.x - ship.position.x;
    const dy = target.sector.y - ship.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > COMBAT_RADIUS) continue;

    const attackerDef = getShipDef(ship.defKind);
    if (!attackerDef || attackerDef.hardpoints === 0) continue;

    let damage = attackerDef.hardpoints * DAMAGE_PER_HARDPOINT;

    // Kryll Collective: if accusation bonus is active, deal +25% damage and clear the flag
    if (shipOwner && shipOwner.raceId === "kryllCollective" && shipOwner.accusationBonusActive) {
      damage = Math.floor(damage * KRYLL_ACCUSATION_DAMAGE_BONUS);
      shipOwner.accusationBonusActive = false;
    }

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

  // Brakkat Dominion: when their asteroid is attacked, queue 2 retaliation orders instead of 1
  const brakkatAttacked = new Set<import("@fa/domain").AsteroidId>();
  for (const event of world.eventQueue) {
    if (event.kind !== "colony.under_attack") continue;
    const asteroid = world.asteroids.get(event.asteroidId);
    if (!asteroid?.ownerId) continue;
    const owner = world.players.get(asteroid.ownerId);
    if (!owner || owner.isHuman || owner.raceId !== "brakkat" || !owner.alive) continue;
    brakkatAttacked.add(event.asteroidId);
  }

  for (const attackedId of brakkatAttacked) {
    const attackedAsteroid = world.asteroids.get(attackedId);
    if (!attackedAsteroid?.ownerId) continue;
    const brakkatPlayer = world.players.get(attackedAsteroid.ownerId);
    if (!brakkatPlayer) continue;

    // Find the attacker's asteroid to retaliate against
    const attackerEvent = world.eventQueue.find(
      (e) => e.kind === "colony.under_attack" && e.asteroidId === attackedId,
    );
    if (!attackerEvent || attackerEvent.kind !== "colony.under_attack") continue;

    // Find attacker's nearest asteroid as retaliation target
    const attackerId = attackerEvent.attackerId;
    let retaliationTarget: import("@fa/domain").AsteroidId | undefined;
    for (const ast of world.asteroids.values()) {
      if (ast.ownerId === attackerId) {
        retaliationTarget = ast.id;
        break;
      }
    }
    if (!retaliationTarget) continue;

    // Order up to BRAKKAT_RETALIATION_COUNT idle ships to retaliate
    let retaliationsOrdered = 0;
    for (const ship of world.ships.values()) {
      if (retaliationsOrdered >= BRAKKAT_RETALIATION_COUNT) break;
      if (ship.ownerId !== brakkatPlayer.id) continue;
      if (ship.order.kind !== "idle") continue;
      ship.order = { kind: "attackAsteroid", target: retaliationTarget };
      retaliationsOrdered++;
    }
  }

  // Defense buildings auto-fire at attackers in range
  for (const asteroid of world.asteroids.values()) {
    if (!asteroid.ownerId) continue;

    const attackersInRange: Ship[] = [];
    for (const ship of world.ships.values()) {
      if (ship.order.kind !== "attackAsteroid") continue;
      if (ship.order.target !== asteroid.id) continue;
      if (ship.ownerId === asteroid.ownerId) continue;
      const dx = asteroid.sector.x - ship.position.x;
      const dy = asteroid.sector.y - ship.position.y;
      if (Math.sqrt(dx * dx + dy * dy) > COMBAT_RADIUS) continue;
      attackersInRange.push(ship);
    }
    if (attackersInRange.length === 0) continue;

    let totalDps = 0;
    for (const bId of asteroid.buildings) {
      const b = world.buildings.get(bId);
      if (!b?.active || b.constructionProgress < 1) continue;
      const def = findBuildingDef(b.defKind);
      if (def?.defenseDps) totalDps += def.defenseDps;
    }
    if (totalDps === 0) continue;

    const dpsEach = totalDps / attackersInRange.length;
    for (const attacker of attackersInRange) {
      const shieldAbsorb = Math.min(attacker.shieldHp, dpsEach);
      attacker.shieldHp -= shieldAbsorb;
      const hullDmg = dpsEach - shieldAbsorb;
      attacker.hullHp = Math.max(0, attacker.hullHp - hullDmg);
    }
  }
}
