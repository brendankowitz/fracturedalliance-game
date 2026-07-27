/**
 * Population system.
 *
 * Runs after `productionPhase` so stocks already reflect consumption on
 * this tick. Mechanics (spec §C.4):
 *
 *   • popCap = Σ(building.popCapDelta) × 100 for completed housing.
 *   • Population drifts toward popCap when fed/watered/aired, happiness
 *     ≥ 30, and surplus exists. Drift is slow (~1 person per sim-day
 *     under ideal conditions).
 *   • If a life-support stock is zero *and* the delta was negative this
 *     tick (recorded implicitly: stock == 0 + population > 0 is starving),
 *     the colony starves: pop -= ceil(pop × 0.01) per tick, emit one red
 *     `colony.starved` event the first tick starvation starts.
 *   • Happiness drifts toward a target bracket computed from surpluses,
 *     radiation, and whether unrest event has been emitted recently.
 *   • Radiation > 50 and happiness < HAPPINESS_UNREST emit
 *     `population.unrest` once per crossing.
 *
 * No RNG is consumed.
 */

import type { BuildingKind } from '@fab/content';
import { BUILDINGS } from '@fab/content';
import type { Asteroid, BuildingDef, World } from '@fab/domain';
import {
  HAPPINESS_UNREST,
  POP_AIR_PER_DAY,
  POP_FOOD_PER_DAY,
  POP_WATER_PER_DAY,
  TICKS_PER_SIM_DAY,
} from '../time';
import { emitEvent } from './events';

const getDef = (kind: string): BuildingDef | undefined =>
  (BUILDINGS as Readonly<Record<string, BuildingDef>>)[kind as BuildingKind];

/** Compute the maximum population cap for an asteroid based on finished housing. */
export const populationCapOf = (asteroid: Asteroid, world: World): number => {
  let cap = 0;
  for (const id of asteroid.buildings) {
    const b = world.buildings.get(id);
    if (!b || b.constructionProgress < 1) continue;
    const def = getDef(b.defKind);
    if (!def) continue;
    cap += def.popCapDelta * 100;
  }
  return cap;
};

const HAPPINESS_DRIFT_PER_TICK = 5 / TICKS_PER_SIM_DAY; // ±5 per sim-day, capped
const POP_GROWTH_PER_TICK = 1 / TICKS_PER_SIM_DAY;
const POP_STARVE_PER_TICK = 0.01; // ≈ 12 workers/day out of 100

/**
 * Days of supply at which a stock stops reading as comfortable, and at which it starts
 * reading as a crisis. **Balance dials, not spec-derived** — §C.4 asks for "food surplus,
 * water surplus" without giving figures, so whoever tunes these is choosing, not
 * correcting a mistake.
 */
const SUPPLY_COMFORTABLE_DAYS = 15;
const SUPPLY_STRAINED_DAYS = 5;

/**
 * Solved to a principle, not tuned by eye: a *sustained total outage of any single*
 * life-support resource must be able to reach unrest (30), and two simultaneous outages
 * must reach secession (10). With the old numbers a permanent food outage landed at
 * 50-20+5+5 = 35, so the spec's "productivity halves and strike events fire" could never
 * trigger from starving a colony.
 *
 * Base 25 + three bonuses of 15 keeps a well-supplied colony at 70, where it used to sit
 * permanently. Now it can fall:
 *   food out   → 25 - 30 + 15 + 15 = 25   (unrest)
 *   water out  → 25 + 15 - 28 + 15 = 27   (unrest)
 *   air out    → 25 + 15 + 15 - 35 = 20   (unrest)
 *   two out    → negative, clamped to 0   (secession)
 * Air stays the harshest and water the mildest, as the original weighting had it.
 */
const HAPPINESS_BASE = 25;
const FOOD_BONUS = 15;
const FOOD_PENALTY = 30;
const WATER_BONUS = 15;
const WATER_PENALTY = 28;
const AIR_BONUS = 15;
const AIR_PENALTY = 35;

const daysOfSupply = (stock: number, perPersonPerDay: number, population: number): number =>
  population <= 0 ? Number.POSITIVE_INFINITY : stock / (population * perPersonPerDay);

const gradeSupply = (days: number, bonus: number, penalty: number): number => {
  if (days > SUPPLY_COMFORTABLE_DAYS) return bonus;
  if (days > SUPPLY_STRAINED_DAYS) return bonus * 0.5;
  if (days > 0) return 0;
  return -penalty;
};

/**
 * Spec §C.4 grades happiness on life-support *surplus*. Testing `stock > 0` instead graded
 * it on mere presence, so a colony could drain a hundred sim-days of food with the number
 * pinned at 50+10+5+5 = 70 and no warning — and because starvation culls population, which
 * drops demand below production, the stock went positive again within a tick or two and the
 * target barely dipped even at the famine.
 */
const computeTargetHappiness = (asteroid: Asteroid): number => {
  const pop = asteroid.population;
  let target = HAPPINESS_BASE;
  target += gradeSupply(
    daysOfSupply(asteroid.stocks.food, POP_FOOD_PER_DAY, pop),
    FOOD_BONUS,
    FOOD_PENALTY,
  );
  target += gradeSupply(
    daysOfSupply(asteroid.stocks.water, POP_WATER_PER_DAY, pop),
    WATER_BONUS,
    WATER_PENALTY,
  );
  target += gradeSupply(
    daysOfSupply(asteroid.stocks.air, POP_AIR_PER_DAY, pop),
    AIR_BONUS,
    AIR_PENALTY,
  );
  // Radiation penalty (0..100).
  target -= asteroid.radiation * 0.2;
  return Math.max(0, Math.min(100, target));
};

/**
 * Amenity buildings' contribution to the happiness target.
 *
 * The Pleasure Dome was a purchasable no-op: 1,500cr and -5 power for a description, its
 * "+10 happiness" living only in flavour prose because `BuildingDef` had no field to
 * carry it. Colony-wide rather than "in radius" for now — a dome that works everywhere is
 * closer to the spec than one that works nowhere, and radius needs a spatial query this
 * system does not otherwise do.
 */
const amenityHappiness = (asteroid: Asteroid, world: World): number => {
  let total = 0;
  for (const id of asteroid.buildings) {
    const b = world.buildings.get(id);
    if (!b || b.constructionProgress < 1 || !b.active) continue;
    total += getDef(b.defKind)?.happinessDelta ?? 0;
  }
  return total;
};

const updateHappiness = (world: World, asteroid: Asteroid): void => {
  const prev = asteroid.happiness;
  const target = Math.max(
    0,
    Math.min(100, computeTargetHappiness(asteroid) + amenityHappiness(asteroid, world)),
  );
  asteroid.happiness +=
    Math.sign(target - prev) * Math.min(Math.abs(target - prev), HAPPINESS_DRIFT_PER_TICK);
  asteroid.happiness = Math.max(0, Math.min(100, asteroid.happiness));
  if (prev >= HAPPINESS_UNREST && asteroid.happiness < HAPPINESS_UNREST) {
    emitEvent(world, {
      kind: 'population.unrest',
      severity: 'amber',
      asteroidId: asteroid.id,
      happiness: asteroid.happiness,
      tick: world.tick,
    });
  }
};

const isStarving = (asteroid: Asteroid): boolean =>
  asteroid.population > 0 &&
  (asteroid.stocks.food <= 0 || asteroid.stocks.water <= 0 || asteroid.stocks.air <= 0);

/**
 * Happiness lost per 1% of the colony killed by famine.
 *
 * A famine has to be *remembered*, not merely observed. Culling population drops demand
 * below production, so the stock is positive again within a tick or two and the
 * state-based target barely dips — grading state is the wrong tool for an event. Scaling
 * by the fraction lost rather than a flat hit keeps this independent of colony size.
 */
const STARVATION_HAPPINESS_PER_PERCENT_LOST = 3;

const applyStarvation = (world: World, asteroid: Asteroid): void => {
  const loss = Math.max(1, Math.ceil(asteroid.population * POP_STARVE_PER_TICK));
  const prev = asteroid.population;
  asteroid.population = Math.max(0, asteroid.population - loss);

  if (prev > 0) {
    const percentLost = ((prev - asteroid.population) / prev) * 100;
    asteroid.happiness = Math.max(
      0,
      asteroid.happiness - percentLost * STARVATION_HAPPINESS_PER_PERCENT_LOST,
    );
  }
  if (
    prev > 0 &&
    asteroid.population <= prev &&
    asteroid.happiness < 100 &&
    world.tick % TICKS_PER_SIM_DAY === 0
  ) {
    emitEvent(world, {
      kind: 'colony.starved',
      severity: 'red',
      asteroidId: asteroid.id,
      tick: world.tick,
    });
  }
};

export const populationPhase = (world: World): void => {
  for (const asteroid of world.asteroids.values()) {
    if (asteroid.ownerId === null) continue;
    const cap = populationCapOf(asteroid, world);
    updateHappiness(world, asteroid);

    if (isStarving(asteroid)) {
      applyStarvation(world, asteroid);
      continue;
    }

    // Growth under healthy conditions.
    if (asteroid.happiness >= HAPPINESS_UNREST && asteroid.population < cap) {
      asteroid.population = Math.min(cap, asteroid.population + POP_GROWTH_PER_TICK);
    }
  }
};
