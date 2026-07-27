/**
 * @fab/content — typed, zod-validated game content.
 *
 * Phase 2 payload:
 *   • 10 ores (`ORES`)
 *   • 26 buildings (`BUILDINGS`, 25 player-buildable + free CPU Core)
 *   • 40 blueprints (`BLUEPRINTS`, 8 per discipline × 5)
 *   • 9 ship classes (`SHIPS`, 7 combat + 2 NPC haulers)
 *   • 3 direct-fire weapon tiers + 7 missile kinds + 3 bombardments
 *   • 5 scenarios (tutorial, short-game, classic-skirmish, advanced-primer, federation-war)
 *   • 7 races (existing, from Phase 0)
 *
 * Every export is a `readonly Record<K, V> as const satisfies ...` so
 * downstream packages can key into tables with compile-time safety.
 *
 * Validation runs at module load: `CONTENT` throws on any structural or
 * cross-reference error (see `validate.ts`).
 */

export * from './data/blueprints';
export * from './data/buildings';
export * from './data/content';
export * from './data/ores';
export * from './data/races';
export * from './data/scenarios';
export * from './data/ships';
export * from './data/weapons';
export * from './validate';
