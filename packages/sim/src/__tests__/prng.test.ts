import { describe, expect, it } from "vitest";
import { makePrng } from "../prng.ts";

describe("makePrng (mulberry32)", () => {
  it("is deterministic — same seed produces same sequence", () => {
    const a = makePrng(42);
    const b = makePrng(42);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("different seeds produce different sequences", () => {
    const a = makePrng(1);
    const b = makePrng(2);
    expect(a.next()).not.toBe(b.next());
  });

  it("outputs are in [0, 1)", () => {
    const rng = makePrng(99);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("state save/restore resumes identical sequence", () => {
    const rng = makePrng(7);
    rng.next();
    rng.next();
    const savedState = rng.state();
    const before = Array.from({ length: 5 }, () => rng.next());
    rng.restore(savedState);
    const after = Array.from({ length: 5 }, () => rng.next());
    expect(after).toEqual(before);
  });
});
