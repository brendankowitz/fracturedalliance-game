import { getRaceDef } from "@fa/content";
import type { OreKind, OreRecord, World } from "@fa/domain";

export const BASE_PRICES: OreRecord<number> = {
  selenium: 100,
  asteros: 150,
  barium: 220,
  crystalite: 300,
  quazinc: 380,
  bytanium: 500,
  korellium: 650,
  dragonium: 820,
  traxium: 1100,
  nexos: 1500,
};

export function clampOrePrice(oreKind: OreKind, price: number): number {
  const base = BASE_PRICES[oreKind];
  return Math.max(base * 0.5, Math.min(base * 2.0, price));
}

export function getSellPrice(ore: OreKind, basePrice: number, buyerRaceId: string): number {
  const race = getRaceDef(buyerRaceId);
  const modifier = race?.demandModifiers?.[ore] ?? 1.0;
  return Math.round(basePrice * modifier * 100) / 100;
}

export function tickEconomy(world: World): void {
  if (world.tick % 60 !== 0) return;

  for (const key of Object.keys(world.marketPrices) as OreKind[]) {
    const current = world.marketPrices[key];
    const drifted = current * (1 + (world.prng.next() - 0.5) * 0.1);
    world.marketPrices[key] = Math.round(clampOrePrice(key, drifted) * 100) / 100;
  }
}
