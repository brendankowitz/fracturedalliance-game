import { describe, expect, it } from "vitest";
import { formatSimDate, simDateOf, simDay, TICKS_PER_SIM_DAY } from "../time.ts";

describe("simDay", () => {
  it("stays on day 0 for the whole first sim-day", () => {
    expect(simDay(0)).toBe(0);
    expect(simDay(TICKS_PER_SIM_DAY - 1)).toBe(0);
  });

  it("advances on each full sim-day", () => {
    expect(simDay(TICKS_PER_SIM_DAY)).toBe(1);
    expect(simDay(TICKS_PER_SIM_DAY * 42)).toBe(42);
  });
});

describe("formatSimDate", () => {
  it("opens on 25-05-2496", () => {
    expect(formatSimDate(0)).toBe("25-05-2496");
  });

  it("rolls into the next month", () => {
    expect(formatSimDate(7)).toBe("01-06-2496");
  });

  it("rolls into the next year", () => {
    expect(formatSimDate(221)).toBe("01-01-2497");
  });

  it("zero-pads day and month", () => {
    expect(formatSimDate(10)).toBe("04-06-2496");
  });
});

describe("simDateOf", () => {
  it("reports calendar parts, so events can be scheduled on a date", () => {
    expect(simDateOf(7)).toEqual({ day: 1, month: 6, year: 2496 });
  });
});
