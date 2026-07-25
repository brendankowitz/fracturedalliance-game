import type { AsteroidSnapshot } from "@fa/sim";
import { useEffect, useRef, useState } from "react";

/**
 * Colony vitals, always on screen.
 *
 * Population and life-support stocks only exist once the vendored sim is live, so every
 * reading degrades to a dash rather than to a zero — a colony with no data must not look
 * like a colony that is starving.
 */

export interface ColonyStocks {
  readonly food: number;
  readonly water: number;
  readonly air: number;
}

export interface VitalsBarProps {
  asteroid: AsteroidSnapshot;
  day: number;
  /** Identifies the running world. A new game or a reload must not read as a flow. */
  worldKey: string;
  population: number | null;
  populationCap: number | null;
  stocks: ColonyStocks | null;
}

/**
 * Happiness thresholds. Both simulations agree on these once the adapter has normalised
 * its 0-100 scale to the HUD's 0-1: below UNREST productivity halves, below SECESSION the
 * colony rolls to leave every sim-day.
 */
const HAPPINESS_UNREST = 0.3;
const HAPPINESS_SECESSION = 0.1;

interface Vital {
  readonly label: string;
  readonly value: string;
  /** 0–1, drives the bar under the reading; null hides the bar. */
  readonly fill: number | null;
  readonly tone: string;
  /** Short state word under the reading, for vitals with named thresholds. */
  readonly status?: string;
  /** Fractions along the bar to mark, so proximity to a threshold is visible. */
  readonly marks?: ReadonlyArray<number>;
}

const TONE = {
  ok: "#79c188",
  warn: "#e8a04a",
  bad: "#cc3322",
  cool: "#5c9bb8",
  idle: "#556680",
} as const;

/**
 * Happiness decides whether the colony is still yours, so it is reported against its
 * thresholds rather than as a bare number on a generic good-to-bad ramp.
 */
function happinessStatus(happiness: number): string {
  if (happiness < HAPPINESS_SECESSION) return "SECEDING";
  if (happiness < HAPPINESS_UNREST) return "UNREST";
  return "STABLE";
}

function happinessTone(happiness: number): string {
  if (happiness < HAPPINESS_SECESSION) return TONE.bad;
  if (happiness < HAPPINESS_UNREST) return TONE.warn;
  return TONE.ok;
}

function tone(fraction: number): string {
  if (fraction >= 0.6) return TONE.ok;
  if (fraction >= 0.3) return TONE.warn;
  return TONE.bad;
}

/** `+12.4 / day`, or an em dash when the rate is not yet known. */
function formatRate(rate: number | null): string {
  if (rate === null) return "—";
  const rounded = Math.abs(rate) < 0.05 ? 0 : rate;
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)} / day`;
}

interface StockRates {
  readonly food: number | null;
  readonly water: number | null;
  readonly air: number | null;
}

const NO_RATES: StockRates = { food: null, water: null, air: null };

/** Units per sim-day beyond which a delta is a discontinuity, not production. */
const IMPLAUSIBLE_RATE = 10_000;

/**
 * Per-day flow derived from how the stock actually moved between samples, rather than
 * from summing building deltas. Summing would mean reading whichever content package is
 * live, and that package is being swapped underneath this component.
 */
function useStockRates(
  worldKey: string,
  asteroidId: string,
  day: number,
  stocks: ColonyStocks | null,
): StockRates {
  const sample = useRef<{ key: string; day: number; stocks: ColonyStocks } | null>(null);
  const [rates, setRates] = useState<StockRates>(NO_RATES);

  const food = stocks?.food ?? null;
  const water = stocks?.water ?? null;
  const air = stocks?.air ?? null;

  // Depends on the readings, not on the `stocks` object: the caller rebuilds that every
  // frame, and this only ever recomputes on a day boundary.
  useEffect(() => {
    if (food === null || water === null || air === null) {
      sample.current = null;
      setRates(NO_RATES);
      return;
    }
    const current = { food, water, air };
    const key = `${worldKey}:${asteroidId}`;
    const previous = sample.current;
    // A different world, a different colony, or a clock that moved backwards means the
    // two samples are not comparable — resample rather than render the jump as a flow.
    if (!previous || previous.key !== key || day < previous.day) {
      sample.current = { key, day, stocks: current };
      setRates(NO_RATES);
      return;
    }
    const elapsed = day - previous.day;
    // Sub-day deltas are dominated by rounding, so wait for a whole sim-day.
    if (elapsed < 1) return;
    sample.current = { key, day, stocks: current };
    const next = {
      food: (current.food - previous.stocks.food) / elapsed,
      water: (current.water - previous.stocks.water) / elapsed,
      air: (current.air - previous.stocks.air) / elapsed,
    };
    // A restored save can move a stock by more in one step than any colony could
    // plausibly produce; discard that sample instead of reporting a spike.
    const plausible = Object.values(next).every((rate) => Math.abs(rate) < IMPLAUSIBLE_RATE);
    setRates(plausible ? next : NO_RATES);
  }, [worldKey, asteroidId, day, food, water, air]);

  return rates;
}

export function VitalsBar({
  asteroid,
  day,
  worldKey,
  population,
  populationCap,
  stocks,
}: VitalsBarProps) {
  const rates = useStockRates(worldKey, asteroid.id, day, stocks);

  const popFraction =
    population !== null && populationCap !== null && populationCap > 0
      ? population / populationCap
      : null;

  const vitals: Vital[] = [
    {
      label: "Population",
      value:
        population === null
          ? "—"
          : `${Math.round(population)}${populationCap ? ` / ${Math.round(populationCap)}` : ""}`,
      fill: popFraction,
      tone: popFraction === null ? TONE.idle : TONE.cool,
    },
    {
      label: "Happiness",
      value: `${Math.round(asteroid.happiness * 100)}`,
      fill: asteroid.happiness,
      tone: happinessTone(asteroid.happiness),
      status: happinessStatus(asteroid.happiness),
      marks: [HAPPINESS_SECESSION, HAPPINESS_UNREST],
    },
    {
      label: "Stability",
      value: `${Math.round(asteroid.stability * 100)}`,
      fill: asteroid.stability,
      tone: tone(asteroid.stability),
    },
    {
      label: "Power",
      value: `${asteroid.powerBalance >= 0 ? "+" : ""}${asteroid.powerBalance}`,
      fill: null,
      tone: asteroid.powerBalance < 0 ? TONE.bad : TONE.ok,
    },
    {
      label: "Food",
      value: stocks === null ? "—" : formatRate(rates.food),
      fill: null,
      tone: stocks === null ? TONE.idle : (rates.food ?? 0) < 0 ? TONE.bad : TONE.ok,
    },
    {
      label: "Water",
      value: stocks === null ? "—" : formatRate(rates.water),
      fill: null,
      tone: stocks === null ? TONE.idle : (rates.water ?? 0) < 0 ? TONE.bad : TONE.cool,
    },
    {
      label: "Air",
      value: stocks === null ? "—" : formatRate(rates.air),
      fill: null,
      tone: stocks === null ? TONE.idle : (rates.air ?? 0) < 0 ? TONE.bad : TONE.cool,
    },
    {
      label: "Rad",
      value: `${(asteroid.radiation * 100).toFixed(0)} mSv`,
      fill: asteroid.radiation,
      tone: asteroid.radiation > 0.5 ? TONE.bad : asteroid.radiation > 0.2 ? TONE.warn : TONE.ok,
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: 22,
        padding: "10px 16px",
        borderBottom: "1px solid #1a2840",
        flexWrap: "wrap",
      }}
    >
      {vitals.map((vital) => (
        <div key={vital.label} style={{ minWidth: 76 }}>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 9,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              color: "#8899bb",
            }}
          >
            {vital.label}
          </div>
          <div
            style={{
              fontFamily: "var(--font-data)",
              fontSize: 15,
              color: vital.tone,
              lineHeight: 1.3,
              whiteSpace: "nowrap",
            }}
          >
            {vital.value}
          </div>
          <div style={{ position: "relative", height: 3, background: "#0e1a2c", marginTop: 3 }}>
            {vital.fill !== null && (
              <div
                style={{
                  width: `${Math.max(0, Math.min(1, vital.fill)) * 100}%`,
                  height: "100%",
                  background: vital.tone,
                  transition: "width 0.4s ease",
                }}
              />
            )}
            {vital.marks?.map((mark) => (
              <div
                key={mark}
                style={{
                  position: "absolute",
                  left: `${mark * 100}%`,
                  top: -1,
                  width: 1,
                  height: 5,
                  background: "#c8d8ff",
                  opacity: 0.55,
                }}
              />
            ))}
          </div>
          {vital.status && (
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 8,
                letterSpacing: 1,
                color: vital.tone,
                marginTop: 2,
              }}
            >
              {vital.status}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
