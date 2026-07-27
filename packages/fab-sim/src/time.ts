/**
 * Canonical time model for the simulation.
 *
 * All systems inside `@fab/sim` convert rates and durations through these
 * constants. Wall-clock time (`Date.now()`) is never consulted once the
 * world has been created; every temporal decision is tick-indexed.
 *
 * Hierarchy:
 *
 *   1 tick          = 50 ms of simulated time (20 Hz, see `FIXED_STEP_MS`)
 *   1 sim-day       = 1 200 ticks  (≈ 1 minute wall-clock at 1× speed)
 *   1 sim-month     = 30 sim-days  = 36 000 ticks (≈ 30 minutes wall-clock)
 *   1 sim-year      = 12 sim-months (not used directly by systems)
 *
 * Rate conventions on `BuildingDef` (content tables):
 *   • `powerDelta`, `popCapDelta`         — instantaneous balances (not rates).
 *   • `foodDelta`, `waterDelta`, `airDelta` — per sim-day rates (spec §C.4
 *     reads "+20 food/day" which matches `foodDelta: 20` on Hydroponics).
 *   • `oreProduction`, `oreConsumption`    — per-tick rates (tonnes/tick).
 *   • `creditsProduction`                  — per-tick rate.
 *   • `monthlyUpkeep`                      — credits per sim-month.
 *
 * Population consumption is modelled as `per-person, per-sim-day`:
 *   • food  : 0.5 units/day
 *   • water : 1.0 units/day
 *   • air   : 1.0 units/day
 * Converted to per-tick inside {@link ./systems/economy.ts}.
 */

export const FIXED_STEP_MS = 50;
export const TICKS_PER_SECOND = 1000 / FIXED_STEP_MS;
export const TICKS_PER_SIM_DAY = 1200;
export const TICKS_PER_SIM_MONTH = TICKS_PER_SIM_DAY * 30;
export const TICKS_PER_SIM_YEAR = TICKS_PER_SIM_MONTH * 12;

/**
 * Federal Transporter cadence. Every N ticks the phase drains the
 * queued `MarketOrder`s from each player. 6 000 ticks ≈ 5 minutes
 * wall-clock at 1× speed = 5 sim-days.
 */
export const FED_TRANSPORTER_INTERVAL_TICKS = 6000;

/** Federal Transporter spread around the mid-market price (± 5 %). */
export const FED_TRANSPORTER_SPREAD = 0.05;

/** Price bounds as a multiplier of the ore's `baseValue`. */
export const MARKET_MIN_MULT = 0.3;
export const MARKET_MAX_MULT = 3.0;

/** How often the market shock event sub-generator rolls (ticks). */
export const MARKET_SHOCK_INTERVAL_TICKS = 2400; // 2 sim-days

/** Per-person life-support demand, per sim-day. */
export const POP_FOOD_PER_DAY = 0.5;
export const POP_WATER_PER_DAY = 1.0;
export const POP_AIR_PER_DAY = 1.0;

/** Happiness thresholds (spec §C.4). */
export const HAPPINESS_UNREST = 30;
export const HAPPINESS_SECESSION = 10;

/** Productivity multiplier applied when happiness < HAPPINESS_UNREST. */
export const UNREST_PRODUCTIVITY_MULT = 0.5;

/** Rolling AI event log window (24 sim-months). */
export const AI_EVENT_LOG_WINDOW_TICKS = TICKS_PER_SIM_MONTH * 24;
