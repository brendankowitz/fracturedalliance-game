/**
 * Phase 9 — Asteroid Motion (the signature mechanic).
 *
 * Each asteroid integrates position += velocity per tick. If a course is set
 * (SetAsteroidCourse command), thrust accelerates velocity toward the target
 * vector. Collisions are detected in N² (fine for ≤ 50 asteroids).
 *
 * Gravity Nullifier buildings reduce collision damage by 80 %. Impact
 * warnings schedule a red event 1 000 ticks before predicted impact.
 */

import type { Asteroid, PlayerCommand, World } from '@fab/domain';
import { emitEvent, scheduleEvent } from './events';

/** Maximum simultaneous engines per asteroid (spec §I). */
export const MAX_ENGINES = 3;
/** Delta-v imparted per engine per tick. */
const THRUST_PER_ENGINE = 0.005;
/** Collision distance threshold (world units). */
const COLLISION_DISTANCE = 5;
/** Prediction-window ticks used for impact warnings. */
const IMPACT_LOOKAHEAD_TICKS = 1000;
/** Gravity nullifier reduces collision damage by this factor. */
const GRAVITY_NULLIFIER_DAMPENING = 0.2;
/** Velocity→damage coefficient. */
const COLLISION_DAMAGE_COEFF = 500;

const hasActiveNullifier = (world: World, a: Asteroid): boolean => {
  for (const bid of a.buildings) {
    const b = world.buildings.get(bid);
    if (b?.defKind === 'bld.gravity-nullifier' && b.active) return true;
  }
  return false;
};

const engineCount = (world: World, a: Asteroid): number => {
  let n = 0;
  for (const bid of a.buildings) {
    const b = world.buildings.get(bid);
    if (b?.defKind === 'bld.asteroid-engine' && b.active) n++;
  }
  return Math.min(MAX_ENGINES, n);
};

export const handleSetAsteroidCourse = (
  world: World,
  cmd: Extract<PlayerCommand, { kind: 'setAsteroidCourse' }>,
): { ok: boolean; reason?: string } => {
  const a = world.asteroids.get(cmd.asteroid);
  if (!a) return { ok: false, reason: 'asteroid missing' };
  if (a.ownerId !== cmd.from) return { ok: false, reason: 'not owner' };
  if (engineCount(world, a) === 0) return { ok: false, reason: 'no engines' };
  a.course = {
    targetX: cmd.targetX,
    targetY: cmd.targetY,
    thrust: Math.max(0, Math.min(1, cmd.thrust)),
  };
  return { ok: true };
};

const predictImpact = (a: Asteroid, b: Asteroid, lookahead: number): number | null => {
  // Simple linear-interpolation check at per-tick granularity, scanning only
  // the endpoints + midpoint for speed (relative positions are smooth).
  const rx = b.position.x - a.position.x;
  const ry = b.position.y - a.position.y;
  const rvx = b.velocity.x - a.velocity.x;
  const rvy = b.velocity.y - a.velocity.y;
  // d(t)² = |r + v·t|²; minimise to find closest approach.
  const denom = rvx * rvx + rvy * rvy;
  if (denom < 1e-9) return null;
  const tStar = -(rx * rvx + ry * rvy) / denom;
  if (tStar <= 0 || tStar > lookahead) return null;
  const cx = rx + rvx * tStar;
  const cy = ry + rvy * tStar;
  const minDist = Math.hypot(cx, cy);
  return minDist <= COLLISION_DISTANCE ? Math.floor(tStar) : null;
};

/** Apply thrust (if coursed) and integrate position for a single asteroid. */
const integrateAsteroid = (world: World, a: Asteroid): void => {
  if (a.course) {
    const engines = engineCount(world, a);
    if (engines === 0) {
      a.course = null;
    } else {
      const dx = a.course.targetX - a.position.x;
      const dy = a.course.targetY - a.position.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.5) {
        a.course = null;
        a.velocity = { x: 0, y: 0 };
      } else {
        const thrust = THRUST_PER_ENGINE * engines * a.course.thrust;
        a.velocity.x += (dx / d) * thrust;
        a.velocity.y += (dy / d) * thrust;
        a.stability = Math.max(0, a.stability - 0.002 * engines);
      }
    }
  }
  a.position.x += a.velocity.x;
  a.position.y += a.velocity.y;
};

/** Announce an upcoming collision once per asteroid pair. */
const maybeAnnounceImpact = (world: World, a: Asteroid, b: Asteroid): void => {
  if (a.engines.announcedToAll && b.engines.announcedToAll) return;
  const eta = predictImpact(a, b, IMPACT_LOOKAHEAD_TICKS);
  if (eta === null) return;
  scheduleEvent(world, 0, {
    kind: 'asteroid.incoming',
    severity: 'red',
    asteroidId: b.id,
    etaTick: world.tick + eta,
    tick: world.tick,
  });
  a.engines.announcedToAll = true;
  b.engines.announcedToAll = true;
};

/** Entry point wired into tick.ts. */
export const asteroidMotionPhase = (world: World): void => {
  // 1. Integrate thrust + velocity.
  for (const a of world.asteroids.values()) integrateAsteroid(world, a);

  // 2. Collision detection (N²; ≤50 rocks).
  const list = Array.from(world.asteroids.values());
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (!a) continue;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      if (!b) continue;
      const dist = Math.hypot(b.position.x - a.position.x, b.position.y - a.position.y);
      if (dist <= COLLISION_DISTANCE) {
        resolveCollision(world, a, b);
        continue;
      }
      maybeAnnounceImpact(world, a, b);
    }
  }
};

const resolveCollision = (world: World, a: Asteroid, b: Asteroid): void => {
  const relVx = a.velocity.x - b.velocity.x;
  const relVy = a.velocity.y - b.velocity.y;
  const relSpeed = Math.hypot(relVx, relVy);
  // Kinetic damage mass-weighted.
  const kinetic = COLLISION_DAMAGE_COEFF * relSpeed * relSpeed;
  const aDamage = (kinetic * b.mass) / (a.mass + b.mass);
  const bDamage = (kinetic * a.mass) / (a.mass + b.mass);
  const aScale = hasActiveNullifier(world, a) ? GRAVITY_NULLIFIER_DAMPENING : 1;
  const bScale = hasActiveNullifier(world, b) ? GRAVITY_NULLIFIER_DAMPENING : 1;
  applyCollisionDamage(world, a, aDamage * aScale);
  applyCollisionDamage(world, b, bDamage * bScale);
  // Bounce: swap velocities scaled by mass.
  const totalMass = a.mass + b.mass;
  const na = {
    x: (a.velocity.x * (a.mass - b.mass) + 2 * b.mass * b.velocity.x) / totalMass,
    y: (a.velocity.y * (a.mass - b.mass) + 2 * b.mass * b.velocity.y) / totalMass,
  };
  const nb = {
    x: (b.velocity.x * (b.mass - a.mass) + 2 * a.mass * a.velocity.x) / totalMass,
    y: (b.velocity.y * (b.mass - a.mass) + 2 * a.mass * a.velocity.y) / totalMass,
  };
  a.velocity = na;
  b.velocity = nb;
  if (b.ownerId) {
    emitEvent(world, {
      kind: 'colony.under_attack',
      severity: 'red',
      asteroidId: a.id,
      attackerId: b.ownerId,
      tick: world.tick,
    });
  }
};

const applyCollisionDamage = (world: World, a: Asteroid, damage: number): void => {
  a.stability = Math.max(0, a.stability - damage * 0.1);
  const popLoss = Math.min(a.population, Math.floor(damage * 0.05));
  a.population -= popLoss;
  // Damage a random-ish building.
  let remaining = damage;
  for (const bid of a.buildings) {
    if (remaining <= 0) break;
    const b = world.buildings.get(bid);
    if (!b) continue;
    const take = Math.min(b.hp, remaining);
    b.hp -= take;
    b.damage += take;
    remaining -= take;
    if (b.hp <= 0) b.active = false;
  }
};

export const _asteroidMotionInternal = { predictImpact, engineCount, hasActiveNullifier };
