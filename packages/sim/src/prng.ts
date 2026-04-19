import type { Prng } from "@fa/domain";

export function makePrng(seed: number): Prng {
  let s = seed >>> 0;

  return {
    next(): number {
      s += 0x6d2b79f5;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    state(): number {
      return s;
    },
    restore(state: number): void {
      s = state >>> 0;
    },
  };
}
