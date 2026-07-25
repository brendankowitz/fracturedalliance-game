/**
 * Economy system.
 *
 * Time model — see {@link ../time.ts}:
 *   • `foodDelta/waterDelta/airDelta` are sim-day rates → divide by
 *     `TICKS_PER_SIM_DAY` to convert into a per-tick delta.
 *   • `creditsProduction` is already per-tick.
 *   • `monthlyUpkeep` is credits per sim-month → divide by
 *     `TICKS_PER_SIM_MONTH`.
 *
 * Per tick we:
 *   1. Walk each owned asteroid; sum building deltas (only those with
 *      `constructionProgress >= 1` and `active` contribute).
 *   2. Subtract population life-support demand (see time.ts).
 *   3. Clamp stocks to ≥ 0. If a colony-level deficit appears, emit one
 *      amber `resource.deficit` event per tick per resource to avoid
 *      flooding the log.
 *   4. Apply credits production/upkeep to the owning player's ledger. A
 *      negative player credits balance is allowed (it's how players feel
 *      debt), but triggers an amber event once.
 *
 * No RNG is consumed here. All math is floating-point deterministic.
 */

import type { BuildingKind } from '@fab/content';
import { BUILDINGS } from '@fab/content';
import type { Asteroid, BuildingDef, World } from '@fab/domain';
import {
  POP_AIR_PER_DAY,
  POP_FOOD_PER_DAY,
  POP_WATER_PER_DAY,
  TICKS_PER_SIM_DAY,
  TICKS_PER_SIM_MONTH,
} from '../time';
import { emitEvent } from './events';

const getDef = (kind: string): BuildingDef | undefined =>
  (BUILDINGS as Readonly<Record<string, BuildingDef>>)[kind as BuildingKind];

interface ColonyDeltas {
  food: number;
  water: number;
  air: number;
  power: number;
  credits: number;
  upkeep: number;
}

const zeroDeltas = (): ColonyDeltas => ({
  food: 0,
  water: 0,
  air: 0,
  power: 0,
  credits: 0,
  upkeep: 0,
});

/** Aggregate *instantaneous* balances + per-tick rates for an asteroid. */
const collectDeltas = (asteroid: Asteroid, world: World): ColonyDeltas => {
  const d = zeroDeltas();
  for (const id of asteroid.buildings) {
    const b = world.buildings.get(id);
    if (!b?.active || b.constructionProgress < 1) continue;
    const def = getDef(b.defKind);
    if (!def) continue;
    d.food += def.foodDelta / TICKS_PER_SIM_DAY;
    d.water += def.waterDelta / TICKS_PER_SIM_DAY;
    d.air += def.airDelta / TICKS_PER_SIM_DAY;
    d.power += def.powerDelta;
    if (def.creditsProduction) d.credits += def.creditsProduction;
    if (def.monthlyUpkeep) d.upkeep += def.monthlyUpkeep / TICKS_PER_SIM_MONTH;
  }
  // Population life-support demand.
  const pop = asteroid.population;
  d.food -= (pop * POP_FOOD_PER_DAY) / TICKS_PER_SIM_DAY;
  d.water -= (pop * POP_WATER_PER_DAY) / TICKS_PER_SIM_DAY;
  d.air -= (pop * POP_AIR_PER_DAY) / TICKS_PER_SIM_DAY;
  return d;
};

const EPS = 1e-9;

export const productionPhase = (world: World): void => {
  for (const asteroid of world.asteroids.values()) {
    if (asteroid.ownerId === null) continue;
    const d = collectDeltas(asteroid, world);
    const s = asteroid.stocks;

    // Apply life-support deltas.
    const preFood = s.food;
    const preWater = s.water;
    const preAir = s.air;
    s.food = Math.max(0, preFood + d.food);
    s.water = Math.max(0, preWater + d.water);
    s.air = Math.max(0, preAir + d.air);

    // Emit deficit events on the *edge* only (stock just hit zero with a
    // negative trend). This avoids flooding the log every tick.
    if (preFood > EPS && s.food <= EPS && d.food < 0) {
      emitEvent(world, {
        kind: 'resource.deficit',
        severity: 'amber',
        asteroidId: asteroid.id,
        resource: 'food',
        tick: world.tick,
      });
    }
    if (preWater > EPS && s.water <= EPS && d.water < 0) {
      emitEvent(world, {
        kind: 'resource.deficit',
        severity: 'amber',
        asteroidId: asteroid.id,
        resource: 'water',
        tick: world.tick,
      });
    }
    if (preAir > EPS && s.air <= EPS && d.air < 0) {
      emitEvent(world, {
        kind: 'resource.deficit',
        severity: 'amber',
        asteroidId: asteroid.id,
        resource: 'air',
        tick: world.tick,
      });
    }

    // Credits: attribute to owning player.
    const player = world.players.get(asteroid.ownerId);
    if (!player) continue;
    const netCredits = d.credits - d.upkeep;
    const prevCredits = player.credits;
    if (d.credits > 0) player.totalCreditsEarned += d.credits;
    player.credits = prevCredits + netCredits;

    // Edge-trigger: crossing zero from above downward.
    if (prevCredits >= 0 && player.credits < 0) {
      emitEvent(world, {
        kind: 'resource.deficit',
        severity: 'amber',
        asteroidId: asteroid.id,
        resource: 'credits',
        tick: world.tick,
      });
    }
  }
};
