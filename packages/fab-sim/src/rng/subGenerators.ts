import type { PrngState } from '@fab/domain';
import { createMulberry32, type Prng } from './mulberry32';

/**
 * Deterministic 32-bit hash of a label string, FNV-1a variant. Used to seed
 * named sub-generators so that one subsystem's coin flips don't perturb
 * another's sequence.
 */
export const hashLabel = (label: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < label.length; i++) {
    h ^= label.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

/** Seed a sub-generator deterministically from (master seed XOR labelHash). */
export const subGenSeed = (masterSeed: number, label: string): number =>
  ((masterSeed >>> 0) ^ hashLabel(label)) >>> 0;

/** Known sub-generator labels. Add new ones rather than reusing. */
export const SUB_GEN_LABELS = ['market', 'combat', 'ai', 'event', 'worldGen', 'trader', 'espionage'] as const;

export type SubGenLabel = (typeof SUB_GEN_LABELS)[number];

export class PrngRegistry {
  private readonly generators = new Map<string, Prng>();

  constructor(private readonly masterSeed: number) {}

  /** Get (or lazily create) a named sub-generator. */
  get(label: SubGenLabel): Prng {
    let g = this.generators.get(label);
    if (!g) {
      g = createMulberry32(subGenSeed(this.masterSeed, label));
      this.generators.set(label, g);
    }
    return g;
  }

  /** Serialise every known sub-generator's state. */
  snapshot(): PrngState {
    const subs: Record<string, number> = {};
    for (const [label, gen] of this.generators) subs[label] = gen.state();
    return { seed: this.masterSeed, subs };
  }

  /** Restore a registry from a serialised PrngState. */
  static restore(state: PrngState): PrngRegistry {
    const reg = new PrngRegistry(state.seed);
    for (const [label, s] of Object.entries(state.subs)) {
      reg.generators.set(label, createMulberry32(s));
    }
    return reg;
  }
}
