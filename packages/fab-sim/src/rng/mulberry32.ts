/**
 * mulberry32 — a tiny, fast, 32-bit PRNG with excellent statistical properties
 * for non-cryptographic use. State is a single unsigned 32-bit integer, which
 * means we can serialise it losslessly with `world.rng.seed`.
 *
 * Reference: https://github.com/bryc/code/blob/master/jshash/PRNGs.md#mulberry32
 */
export interface Prng {
  /** Advance the generator and return a float in [0, 1). */
  next(): number;
  /** Uniform integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** Uniform float in [min, max). */
  float(min: number, max: number): number;
  /** Pick a random element from a non-empty array. */
  pick<T>(arr: readonly T[]): T;
  /** Serialise the current state as a 32-bit unsigned integer. */
  state(): number;
}

export const createMulberry32 = (seed: number): Prng => {
  let s = seed >>> 0;
  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    float: (min: number, max: number) => next() * (max - min) + min,
    pick: <T>(arr: readonly T[]): T => {
      if (arr.length === 0) throw new Error('Prng.pick: empty array');
      return arr[Math.floor(next() * arr.length)] as T;
    },
    state: () => s,
  };
};
