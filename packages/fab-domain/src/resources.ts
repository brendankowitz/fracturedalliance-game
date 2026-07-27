export const ORE_KINDS = [
  'selenium',
  'asteros',
  'barium',
  'crystalite',
  'quazinc',
  'bytanium',
  'korellium',
  'dragonium',
  'traxium',
  'nexos',
] as const;

export type OreKind = (typeof ORE_KINDS)[number];

/** Ascending rarity (1 = most common, 10 = rarest). */
export const ORE_RARITY: Record<OreKind, number> = {
  selenium: 1,
  asteros: 2,
  barium: 3,
  crystalite: 4,
  quazinc: 5,
  bytanium: 6,
  korellium: 7,
  dragonium: 8,
  traxium: 9,
  nexos: 10,
};

export interface OreDef {
  kind: OreKind;
  displayName: string;
  /** Baseline market price in credits per tonne before modulation. */
  baseValue: number;
  /** 0..1. How wildly the sinusoid swings. Rare ores are more volatile. */
  volatilityIndex: number;
  /** 0..1. Mining this ore raises asteroid radiation. Traxium/Nexos = high. */
  radiationRisk: number;
  /** 1 (ubiquitous) .. 5 (legendary). Grouping of the 10-level ORE_RARITY scale. */
  rarityTier: 1 | 2 | 3 | 4 | 5;
  /** Flavour blurb for codex entries. */
  flavour: string;
}

export interface Resources {
  credits: number;
  ores: Record<OreKind, number>;
  population: number;
  food: number;
  water: number;
  air: number;
  power: number;
}

export const emptyOreBag = (): Record<OreKind, number> =>
  ORE_KINDS.reduce(
    (acc, kind) => {
      acc[kind] = 0;
      return acc;
    },
    {} as Record<OreKind, number>,
  );

export const zeroResources = (): Resources => ({
  credits: 0,
  ores: emptyOreBag(),
  population: 0,
  food: 0,
  water: 0,
  air: 0,
  power: 0,
});
