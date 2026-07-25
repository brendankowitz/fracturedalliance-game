/**
 * Phase 6 — Combat resolver.
 *
 * Resolves missile flight, point-defence intercepts, ship-to-ship duels, and
 * orbital bombardment within a single tick. All randomness flows through the
 * `combat` sub-generator so identical seeds produce identical battles.
 *
 * The unit tests in `combat.test.ts` pin intercept probabilities, shield
 * regen clamping, anti-virus cancellation, and bombardment AoE damage.
 */

import { BOMBARDMENTS, MISSILES, SHIPS, WEAPONS } from '@fab/content';
import type {
  Asteroid,
  Building,
  Missile,
  MissileDef,
  MissileKind,
  PlayerCommand,
  PlayerId,
  Ship,
  ShipClassDef,
  World,
} from '@fab/domain';
import type { Prng } from '../rng/mulberry32';
import type { PrngRegistry } from '../rng/subGenerators';
import { emitEvent } from './events';

/** World units considered a "direct hit" on an asteroid. */
const MISSILE_HIT_RADIUS = 3;
/** Ship-to-ship combat engagement distance (same orbit). */
const SHIP_ENGAGE_RADIUS = 20;
/** Hard upper bound for in-flight missiles before self-destruct. */
const MAX_MISSILE_FLIGHT_TICKS = 600;

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/* ------------------------------------------------------------------------ */
/*  Command handlers                                                         */
/* ------------------------------------------------------------------------ */

/** Validate + spawn a missile from source asteroid toward a target asteroid. */
export const handleLaunchMissile = (
  world: World,
  cmd: Extract<PlayerCommand, { kind: 'launchMissile' }>,
): { ok: boolean; reason?: string } => {
  const src = world.asteroids.get(cmd.fromAsteroid);
  const dst = world.asteroids.get(cmd.target);
  if (!src || !dst) return { ok: false, reason: 'asteroid missing' };
  if (src.ownerId !== cmd.from) return { ok: false, reason: 'not owner' };
  const def: MissileDef = MISSILES[cmd.missile];
  if (!def) return { ok: false, reason: 'unknown missile' };
  // Require a missile silo.
  const hasSilo = src.buildings.some((bid) => world.buildings.get(bid)?.defKind === 'bld.missile-silo');
  if (!hasSilo) return { ok: false, reason: 'no silo' };
  // Blueprint gate.
  const player = world.players.get(cmd.from);
  if (!player) return { ok: false, reason: 'player missing' };
  if (def.blueprintRequired && !player.blueprintsOwned.has(def.blueprintRequired)) {
    return { ok: false, reason: 'missing blueprint' };
  }
  const dx = dst.position.x - src.position.x;
  const dy = dst.position.y - src.position.y;
  const dist = Math.hypot(dx, dy) || 1;
  const vx = (dx / dist) * def.speed;
  const vy = (dy / dist) * def.speed;
  const missile: Missile = {
    id: `mis-${world.nextMissileId++}`,
    kind: def.kind,
    ownerId: cmd.from,
    position: { x: src.position.x, y: src.position.y },
    velocity: { x: vx, y: vy },
    targetAsteroid: dst.id,
    targetShip: null,
    damage: def.damage,
    remainingTicks: Math.min(
      MAX_MISSILE_FLIGHT_TICKS,
      Math.ceil((dist + MISSILE_HIT_RADIUS) / def.speed) + 4,
    ),
  };
  world.missiles.push(missile);
  emitEvent(world, {
    kind: 'command.rejected',
    severity: 'amber',
    reason: `missile.launched:${cmd.missile}`,
    tick: world.tick,
  });
  return { ok: true };
};

export const handleBombard = (
  world: World,
  cmd: Extract<PlayerCommand, { kind: 'bombardAsteroid' }>,
): { ok: boolean; reason?: string } => {
  const src = world.asteroids.get(cmd.fromAsteroid);
  const dst = world.asteroids.get(cmd.target);
  if (!src || !dst) return { ok: false, reason: 'asteroid missing' };
  if (src.ownerId !== cmd.from) return { ok: false, reason: 'not owner' };
  const def = BOMBARDMENTS[cmd.bombardment];
  if (!def) return { ok: false, reason: 'unknown bombardment' };
  // Resolve immediately using the combat PRNG.
  // NOTE: the actual damage application happens during combatPhase via a
  // queued bombardment record stored on world.missiles as a 0-speed marker —
  // but for simplicity we resolve here synchronously.
  applyBombardment(world, dst, def.kind, cmd.from);
  return { ok: true };
};

export const handleLaunchFleet = (
  world: World,
  cmd: Extract<PlayerCommand, { kind: 'launchFleet' }>,
): { ok: boolean; reason?: string } => {
  const src = world.asteroids.get(cmd.sourceAsteroid);
  const dst = world.asteroids.get(cmd.targetAsteroid);
  if (!src || !dst) return { ok: false, reason: 'asteroid missing' };
  if (src.ownerId !== cmd.from) return { ok: false, reason: 'not owner' };
  if (cmd.ships.length === 0) return { ok: false, reason: 'no ships' };
  for (const sid of cmd.ships) {
    const ship = world.ships.get(sid);
    if (!ship || ship.ownerId !== cmd.from) continue;
    const idx = src.inOrbit.indexOf(sid);
    if (idx >= 0) src.inOrbit.splice(idx, 1);
    ship.position = { x: src.position.x, y: src.position.y };
    ship.order = { kind: 'attackAsteroid', target: dst.id };
  }
  return { ok: true };
};

export const handleRecallFleet = (
  world: World,
  cmd: Extract<PlayerCommand, { kind: 'recallFleet' }>,
): { ok: boolean; reason?: string } => {
  for (const sid of cmd.ships) {
    const ship = world.ships.get(sid);
    if (!ship || ship.ownerId !== cmd.from) continue;
    ship.order = { kind: 'idle' };
  }
  return { ok: true };
};

export const handleProduceShip = (
  world: World,
  cmd: Extract<PlayerCommand, { kind: 'produceShip' }>,
): { ok: boolean; reason?: string } => {
  const asteroid = world.asteroids.get(cmd.asteroid);
  if (!asteroid || asteroid.ownerId !== cmd.from) return { ok: false, reason: 'not owner' };
  const def: ShipClassDef = SHIPS[cmd.ship];
  if (!def) return { ok: false, reason: 'unknown ship' };
  const hasShipyard = asteroid.buildings.some((bid) => world.buildings.get(bid)?.defKind === 'bld.shipyard');
  if (!hasShipyard) return { ok: false, reason: 'no shipyard' };
  const player = world.players.get(cmd.from);
  if (!player) return { ok: false, reason: 'player missing' };
  if (player.credits < def.costCredits) return { ok: false, reason: 'insufficient credits' };
  if (def.blueprintRequired && !player.blueprintsOwned.has(def.blueprintRequired)) {
    return { ok: false, reason: 'missing blueprint' };
  }
  player.credits -= def.costCredits;
  const id = `ship-${world.nextShipId++}` as Ship['id'];
  const ship: Ship = {
    id,
    defKind: def.kind,
    ownerId: cmd.from,
    hullHp: def.hullHp,
    shieldHp: def.shieldHp,
    position: { x: asteroid.position.x, y: asteroid.position.y },
    velocity: { x: 0, y: 0 },
    order: { kind: 'idle' },
    cargo: {},
    hardpoints: Array.from({ length: def.hardpoints }, () => ({
      weapon: def.hardpointTypes?.[0] ?? 'laser',
      cooldownTicks: 20,
      cooldownRemaining: 0,
    })),
  };
  world.ships.set(id, ship);
  asteroid.inOrbit.push(id);
  return { ok: true };
};

/* ------------------------------------------------------------------------ */
/*  Per-tick resolution                                                      */
/* ------------------------------------------------------------------------ */

/** Return AA defenders (laser + plasma turrets) operational on an asteroid. */
const aaTurrets = (world: World, a: Asteroid): Building[] => {
  const out: Building[] = [];
  for (const bid of a.buildings) {
    const b = world.buildings.get(bid);
    if (!b?.active || b.constructionProgress < 1) continue;
    if (b.defKind === 'bld.laser-turret' || b.defKind === 'bld.plasma-turret') out.push(b);
  }
  return out;
};

/** Compute hit/intercept probability for a missile vs an AA turret. */
export const interceptProbability = (
  missileKind: MissileKind,
  turretKind: 'bld.laser-turret' | 'bld.plasma-turret',
): number => {
  const weapon = turretKind === 'bld.laser-turret' ? WEAPONS.laser : WEAPONS.plasma;
  const missile = MISSILES[missileKind];
  // Base = weapon accuracy × (1 − countermeasure resistance).
  const p = weapon.accuracy * (1 - missile.countermeasureResistance);
  return clamp(p, 0, 0.95);
};

const applyAsteroidBuildingDamage = (world: World, asteroid: Asteroid, damage: number): void => {
  // Spread damage across construction + random buildings; used by missiles and bombardment.
  let remaining = damage;
  for (const bid of asteroid.buildings) {
    if (remaining <= 0) break;
    const b = world.buildings.get(bid);
    if (!b) continue;
    const taken = Math.min(b.hp, remaining / 2);
    b.hp -= taken;
    b.damage += taken;
    remaining -= taken;
    if (b.hp <= 0) {
      b.active = false;
    }
  }
  // Population casualties proportional to remaining overflow damage.
  const popLoss = Math.min(asteroid.population, Math.floor(remaining));
  asteroid.population -= popLoss;
};

const applyBombardment = (
  world: World,
  target: Asteroid,
  kind: 'napalm' | 'vortex' | 'chaos',
  attacker: PlayerId,
): void => {
  const def = BOMBARDMENTS[kind];
  if (!def) return;
  // Area falloff across all buildings; every building in radius takes
  // damage scaled linearly by (radius - d + 1) / (radius + 1).
  const buildings: Building[] = [];
  for (const bid of target.buildings) {
    const b = world.buildings.get(bid);
    if (b) buildings.push(b);
  }
  // Pick a random centre-cell deterministically via mass+tick.
  const centreX = Math.floor((target.mass * 7 + world.tick) % target.grid.width);
  const centreY = Math.floor((target.mass * 3 + world.tick) % target.grid.height);
  for (const b of buildings) {
    const d = Math.abs(b.cell.x - centreX) + Math.abs(b.cell.y - centreY);
    if (d > def.radius) continue;
    const falloff = (def.radius - d + 1) / (def.radius + 1);
    const dmg = def.damage * falloff;
    b.hp = Math.max(0, b.hp - dmg);
    b.damage += dmg;
    if (b.hp <= 0) b.active = false;
  }
  // Population loss proportional to building loss (5% of damaged + direct).
  const popLoss = Math.min(target.population, Math.floor(def.damage * 0.1));
  target.population -= popLoss;
  emitEvent(world, {
    kind: 'colony.under_attack',
    severity: 'red',
    asteroidId: target.id,
    attackerId: attacker,
    tick: world.tick,
  });
};

/**
 * Try to cancel one in-flight enemy virus missile with an anti-virus missile.
 * Returns true if the anti-virus was consumed.
 */
const tryAntiVirusCancel = (world: World, m: Missile): boolean => {
  if (m.kind !== 'antiVirus') return false;
  for (let i = 0; i < world.missiles.length; i++) {
    const other = world.missiles[i];
    if (!other || other === m) continue;
    if (other.kind !== 'virus') continue;
    if (other.ownerId === m.ownerId) continue;
    world.missiles.splice(i, 1);
    emitEvent(world, {
      kind: 'command.rejected',
      severity: 'amber',
      reason: 'antiVirus.cancelled',
      tick: world.tick,
    });
    return true;
  }
  return false;
};

/** Roll intercept against every AA turret on `target`. Returns true if intercepted. */
const rollIntercepts = (world: World, target: Asteroid, m: Missile, combatRng: Prng): boolean => {
  for (const turret of aaTurrets(world, target)) {
    const p = interceptProbability(m.kind, turret.defKind as 'bld.laser-turret' | 'bld.plasma-turret');
    if (combatRng.next() < p) {
      emitEvent(world, {
        kind: 'command.rejected',
        severity: 'amber',
        reason: `missile.intercepted:${m.kind}`,
        tick: world.tick,
      });
      return true;
    }
  }
  return false;
};

/** Apply a virus missile's steal-blueprint side effect. */
const applyVirusImpact = (world: World, target: Asteroid, m: Missile, combatRng: Prng): void => {
  target.happiness = 0;
  const owner = target.ownerId;
  if (!owner) return;
  const opp = world.players.get(owner);
  const me = world.players.get(m.ownerId);
  if (!opp || !me) return;
  const bps = Array.from(opp.blueprintsOwned);
  const pick = bps[Math.floor(combatRng.next() * bps.length)];
  if (pick && !me.blueprintsOwned.has(pick)) me.blueprintsOwned.add(pick);
};

const applyMissileImpact = (world: World, target: Asteroid, m: Missile, combatRng: Prng): void => {
  switch (m.kind) {
    case 'basic':
    case 'nuclear':
    case 'mega':
      applyAsteroidBuildingDamage(world, target, m.damage);
      return;
    case 'virus':
      applyVirusImpact(world, target, m, combatRng);
      return;
    case 'stasis':
      for (const bid of target.buildings) {
        const b = world.buildings.get(bid);
        if (b) b.active = false;
      }
      return;
    case 'nexos':
      for (const bid of target.buildings) world.buildings.delete(bid);
      target.buildings = [];
      target.population = 0;
      return;
    case 'antiVirus':
      return;
  }
};

/** Resolve a single missile this tick: move, try intercept, check impact. */
const stepMissile = (world: World, m: Missile, combatRng: Prng): boolean => {
  m.position.x += m.velocity.x;
  m.position.y += m.velocity.y;
  m.remainingTicks -= 1;
  if (m.remainingTicks <= 0) return false;

  if (tryAntiVirusCancel(world, m)) return false;

  if (!m.targetAsteroid) return true;
  const target = world.asteroids.get(m.targetAsteroid);
  if (!target) return false;
  const dx = target.position.x - m.position.x;
  const dy = target.position.y - m.position.y;
  const d = Math.hypot(dx, dy);
  if (d > MISSILE_HIT_RADIUS) return true; // still flying

  if (rollIntercepts(world, target, m, combatRng)) return false;

  // Impact.
  if (target.ownerId) {
    emitEvent(world, {
      kind: 'colony.under_attack',
      severity: 'red',
      asteroidId: target.id,
      attackerId: m.ownerId,
      tick: world.tick,
    });
  }
  applyMissileImpact(world, target, m, combatRng);
  return false;
};

/** Regen shields (capped at def.shieldHp) and decrement weapon cooldowns. */
const regenShipsAndCooldowns = (ships: readonly Ship[]): void => {
  for (const ship of ships) {
    const def = SHIPS[ship.defKind];
    if (def) ship.shieldHp = Math.min(def.shieldHp, ship.shieldHp + def.shieldRegenPerTick);
    for (const hp of ship.hardpoints) {
      if (hp.cooldownRemaining > 0) hp.cooldownRemaining -= 1;
    }
  }
};

/** Resolve who an attacker targets: honoured order, else closest enemy in range. */
const selectVictim = (attacker: Ship, ships: readonly Ship[], world: World): Ship | null => {
  if (attacker.order.kind === 'attackShip') {
    return world.ships.get(attacker.order.target) ?? null;
  }
  for (const other of ships) {
    if (other === attacker) continue;
    if (other.ownerId === attacker.ownerId) continue;
    if (other.hullHp <= 0) continue;
    const d = Math.hypot(other.position.x - attacker.position.x, other.position.y - attacker.position.y);
    if (d <= SHIP_ENGAGE_RADIUS) return other;
  }
  return null;
};

/** Fire every ready hardpoint on attacker at victim. */
const fireHardpoints = (attacker: Ship, victim: Ship, combatRng: Prng): void => {
  for (const hp of attacker.hardpoints) {
    if (hp.cooldownRemaining > 0) continue;
    const w = WEAPONS[hp.weapon];
    if (!w) continue;
    hp.cooldownRemaining = hp.cooldownTicks;
    if (combatRng.next() > w.accuracy) continue;
    let dmg = w.damage;
    if (victim.shieldHp > 0) {
      const shieldTake = Math.min(victim.shieldHp, dmg * w.vsShield);
      victim.shieldHp -= shieldTake;
      dmg -= shieldTake / w.vsShield;
    }
    if (dmg > 0) victim.hullHp -= dmg * w.vsHull;
  }
};

/** Remove destroyed ships from world + all orbit lists. */
const cleanupDestroyedShips = (world: World): void => {
  for (const [id, ship] of world.ships) {
    if (ship.hullHp > 0) continue;
    world.ships.delete(id);
    for (const a of world.asteroids.values()) {
      const idx = a.inOrbit.indexOf(id);
      if (idx >= 0) a.inOrbit.splice(idx, 1);
    }
  }
};

const regenAndFireShips = (world: World, combatRng: Prng): void => {
  const shipsArr = Array.from(world.ships.values());
  regenShipsAndCooldowns(shipsArr);
  for (const attacker of shipsArr) {
    if (attacker.hullHp <= 0) continue;
    const victim = selectVictim(attacker, shipsArr, world);
    if (!victim || victim.hullHp <= 0) continue;
    fireHardpoints(attacker, victim, combatRng);
    if (victim.hullHp <= 0) {
      emitEvent(world, {
        kind: 'ship.destroyed',
        severity: 'amber',
        shipId: victim.id,
        ownerId: victim.ownerId,
        tick: world.tick,
      });
    }
  }
  cleanupDestroyedShips(world);
};

type MoveTarget = { tx: number; ty: number; asteroidTarget: boolean };

const resolveMoveTarget = (world: World, ship: Ship): MoveTarget | null => {
  const order = ship.order;
  if (order.kind === 'attackAsteroid' || order.kind === 'dock') {
    const target = world.asteroids.get(order.target);
    if (!target) return null;
    return { tx: target.position.x, ty: target.position.y, asteroidTarget: true };
  }
  if (order.kind === 'moveTo') {
    return { tx: order.target.x, ty: order.target.y, asteroidTarget: false };
  }
  return null;
};

const dockAtTarget = (world: World, ship: Ship): void => {
  if (ship.order.kind !== 'attackAsteroid' && ship.order.kind !== 'dock') return;
  const target = world.asteroids.get(ship.order.target);
  if (target && !target.inOrbit.includes(ship.id)) target.inOrbit.push(ship.id);
};

/** Move ships that have a destination toward their target and dock when close. */
const moveFleets = (world: World): void => {
  for (const ship of world.ships.values()) {
    const target = resolveMoveTarget(world, ship);
    if (!target) continue;
    const def = SHIPS[ship.defKind];
    if (!def) continue;
    const dx = target.tx - ship.position.x;
    const dy = target.ty - ship.position.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) {
      if (target.asteroidTarget) dockAtTarget(world, ship);
      ship.velocity = { x: 0, y: 0 };
      continue;
    }
    const v = def.speed;
    ship.velocity = { x: (dx / d) * v, y: (dy / d) * v };
    ship.position.x += ship.velocity.x;
    ship.position.y += ship.velocity.y;
  }
};

/** Entry point wired into tick.ts. */
export const combatPhase = (world: World, reg: PrngRegistry): void => {
  const rng = reg.get('combat');
  // Missile flight.
  const keep: Missile[] = [];
  for (const m of world.missiles) {
    if (stepMissile(world, m, rng)) keep.push(m);
  }
  world.missiles = keep;
  // Ship movement + duels.
  moveFleets(world);
  regenAndFireShips(world, rng);
};

/** Exposed for tests. */
export const _combatInternal = { applyBombardment, applyAsteroidBuildingDamage, stepMissile };
