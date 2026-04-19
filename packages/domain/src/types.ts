export type OreKind =
  | 'selenium' | 'asteros'   | 'barium'    | 'crystalite' | 'quazinc'
  | 'bytanium' | 'korellium' | 'dragonium' | 'traxium'    | 'nexos';

export const ALL_ORES: readonly OreKind[] = [
  'selenium', 'asteros', 'barium', 'crystalite', 'quazinc',
  'bytanium', 'korellium', 'dragonium', 'traxium', 'nexos',
];

export type OreRecord<T> = Record<OreKind, T>;
export type PartialOreRecord<T> = Partial<OreRecord<T>>;

export interface Resources {
  credits: number;
  ores: OreRecord<number>;
  population: number;
  food: number;
  water: number;
  air: number;
  power: number;
}

export function zeroOres(): OreRecord<number> {
  return {
    selenium: 0, asteros: 0, barium: 0, crystalite: 0, quazinc: 0,
    bytanium: 0, korellium: 0, dragonium: 0, traxium: 0, nexos: 0,
  };
}

export type SizeClass = 'S' | 'M' | 'L' | 'XL';

export const SIZE_CLASS_GRID: Record<SizeClass, { width: number; height: number }> = {
  S:  { width: 5,  height: 5  },
  M:  { width: 7,  height: 7  },
  L:  { width: 9,  height: 9  },
  XL: { width: 11, height: 11 },
};

export type Difficulty = 'intern' | 'manager' | 'director' | 'ceo' | 'board';
