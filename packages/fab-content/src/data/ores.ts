import type { OreDef, OreKind } from '@fab/domain';
import { ORE_KINDS } from '@fab/domain';

/**
 * Canonical ore catalogue. All 10 `OreKind` entries are represented.
 *
 * Rarity tiers bucket the 10-level `ORE_RARITY` scale into 5 groups
 * (1 = ubiquitous, 5 = legendary) for UI colour-coding and drop-table
 * weighting. Radiation risk rises steeply for the Seismic-Penetrator-only
 * deep ores (Traxium, Nexos).
 */
export const ORES = {
  selenium: {
    kind: 'selenium',
    displayName: 'Selenium',
    baseValue: 8,
    volatilityIndex: 0.08,
    rarityTier: 1,
    radiationRisk: 0.0,
    flavour: 'Bulk structural feedstock; the cardboard of the asteroid belt.',
  },
  asteros: {
    kind: 'asteros',
    displayName: 'Asteros',
    baseValue: 14,
    volatilityIndex: 0.1,
    rarityTier: 1,
    radiationRisk: 0.0,
    flavour: 'Ferrous silicate matrix — the mandatory ingredient of any hull.',
  },
  barium: {
    kind: 'barium',
    displayName: 'Barium',
    baseValue: 22,
    volatilityIndex: 0.12,
    rarityTier: 2,
    radiationRisk: 0.05,
    flavour: 'Dense slurry used in shield ballast and radiation shimming.',
  },
  crystalite: {
    kind: 'crystalite',
    displayName: 'Crystalite',
    baseValue: 34,
    volatilityIndex: 0.15,
    rarityTier: 2,
    radiationRisk: 0.0,
    flavour: 'Piezoelectric lattices. Kryll will pay triple; most others will not.',
  },
  quazinc: {
    kind: 'quazinc',
    displayName: 'Quazinc',
    baseValue: 50,
    volatilityIndex: 0.2,
    rarityTier: 3,
    radiationRisk: 0.1,
    flavour: 'Superconductor alloy precursor. Powers everything past tier two.',
  },
  bytanium: {
    kind: 'bytanium',
    displayName: 'Bytanium',
    baseValue: 75,
    volatilityIndex: 0.22,
    rarityTier: 3,
    radiationRisk: 0.1,
    flavour: 'Only known flex-armour base. Brakkat will sign treaties for a crate.',
  },
  korellium: {
    kind: 'korellium',
    displayName: 'Korellium',
    baseValue: 120,
    volatilityIndex: 0.3,
    rarityTier: 4,
    radiationRisk: 0.15,
    flavour: 'Motkaj mystical metal. Objectively great for missile casings.',
  },
  dragonium: {
    kind: 'dragonium',
    displayName: 'Dragonium',
    baseValue: 190,
    volatilityIndex: 0.35,
    rarityTier: 4,
    radiationRisk: 0.2,
    flavour: 'Rigellian favourite. Powers tier-3 photon lasing cavities.',
  },
  traxium: {
    kind: 'traxium',
    displayName: 'Traxium',
    baseValue: 320,
    volatilityIndex: 0.5,
    rarityTier: 5,
    radiationRisk: 0.7,
    flavour: 'Seismic-Penetrator only. Every tonne mined dirties the colony.',
  },
  nexos: {
    kind: 'nexos',
    displayName: 'Nexos',
    baseValue: 550,
    volatilityIndex: 0.65,
    rarityTier: 5,
    radiationRisk: 0.9,
    flavour: 'Endgame warhead mineral. Rigellians refuse to touch the stuff.',
  },
} as const satisfies Readonly<Record<OreKind, OreDef>>;

/** Convenience: ordered array form of {@link ORES} matching {@link ORE_KINDS}. */
export const ORES_LIST: readonly OreDef[] = ORE_KINDS.map((k) => ORES[k]);
