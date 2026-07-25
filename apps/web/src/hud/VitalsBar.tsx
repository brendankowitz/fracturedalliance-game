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
  population: number | null;
  populationCap: number | null;
  stocks: ColonyStocks | null;
}

interface Vital {
  readonly label: string;
  readonly value: string;
  /** 0–1, drives the bar under the reading; null hides the bar. */
  readonly fill: number | null;
  readonly tone: string;
}

const TONE = {
  ok: "#79c188",
  warn: "#e8a04a",
  bad: "#cc3322",
  cool: "#5c9bb8",
  idle: "#556680",
} as const;

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

/**
 * Per-day flow derived from how the stock actually moved between samples, rather than
 * from summing building deltas. Summing would mean reading whichever content package is
 * live, and that package is being swapped underneath this component.
 */
function useStockRates(asteroidId: string, day: number, stocks: ColonyStocks | null): StockRates {
  const sample = useRef<{ id: string; day: number; stocks: ColonyStocks } | null>(null);
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
    const previous = sample.current;
    if (!previous || previous.id !== asteroidId) {
      sample.current = { id: asteroidId, day, stocks: current };
      setRates(NO_RATES);
      return;
    }
    const elapsed = day - previous.day;
    // Sub-day deltas are dominated by rounding, so wait for a whole sim-day.
    if (elapsed < 1) return;
    setRates({
      food: (current.food - previous.stocks.food) / elapsed,
      water: (current.water - previous.stocks.water) / elapsed,
      air: (current.air - previous.stocks.air) / elapsed,
    });
    sample.current = { id: asteroidId, day, stocks: current };
  }, [asteroidId, day, food, water, air]);

  return rates;
}

export function VitalsBar({ asteroid, day, population, populationCap, stocks }: VitalsBarProps) {
  const rates = useStockRates(asteroid.id, day, stocks);

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
      tone: tone(asteroid.happiness),
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
          <div style={{ height: 3, background: "#0e1a2c", marginTop: 3 }}>
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
          </div>
        </div>
      ))}
    </div>
  );
}
