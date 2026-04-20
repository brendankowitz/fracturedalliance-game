import { describe, expect, it } from "vitest";
import { SimApi } from "../api.ts";

/**
 * Performance regression guard: 1000 sim ticks must complete in under 5 seconds on
 * any modern dev machine. This is ~50ms per tick budget, far above the actual overhead.
 * If this fails, the AI or simulation has regressed significantly.
 */
describe("tick performance", () => {
  it("runs 1000 ticks in under 5000 ms", () => {
    const api = new SimApi({ seed: 1, humanPlayerRaceId: "helionCorp", difficulty: "manager" });
    const start = performance.now();
    for (let i = 0; i < 1000; i++) api.tick(50);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });

  it("runs 1000 ticks in under 5000 ms on ceo difficulty", () => {
    const api = new SimApi({ seed: 2, humanPlayerRaceId: "helionCorp", difficulty: "ceo" });
    const start = performance.now();
    for (let i = 0; i < 1000; i++) api.tick(50);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });
});
