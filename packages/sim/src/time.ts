/**
 * Canonical time model for the simulation.
 *
 *   1 tick    = 50 ms of simulated time (20 Hz, see `TICK_MS` in ./loop.ts)
 *   1 sim-day = 1200 ticks (≈ 1 minute wall-clock at 1× speed)
 *
 * `TICKS_PER_SIM_DAY` matches `copilot-opus/packages/sim/src/time.ts`, whose sim and
 * content tables this package is scheduled to be replaced by. When that lands, `simDay`
 * should read the adopted sim's day counter and everything below keeps working — the
 * calendar has no other dependency on how the day is produced.
 *
 * Note that opus's own content tables are still authored per tick; nothing here converts
 * them. This module exists only to give the player a clock they can read.
 */

export const TICKS_PER_SIM_DAY = 1200;

/** The campaign opens on 25 May 2496, matching the original's fiction. */
export const SIM_EPOCH = { day: 25, month: 5, year: 2496 } as const;

const MS_PER_DAY = 86_400_000;
const EPOCH_UTC_MS = Date.UTC(SIM_EPOCH.year, SIM_EPOCH.month - 1, SIM_EPOCH.day);

export interface SimDate {
  readonly day: number;
  readonly month: number;
  readonly year: number;
}

/** Elapsed sim-days since the campaign start. Day 0 is the epoch itself. */
export function simDay(tick: number): number {
  return Math.floor(tick / TICKS_PER_SIM_DAY);
}

export function simDateOf(day: number): SimDate {
  const d = new Date(EPOCH_UTC_MS + day * MS_PER_DAY);
  return { day: d.getUTCDate(), month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
}

/** `DD-MM-YYYY`, the format the original's date bar used. */
export function formatSimDate(day: number): string {
  const { day: dd, month, year } = simDateOf(day);
  return `${String(dd).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`;
}
