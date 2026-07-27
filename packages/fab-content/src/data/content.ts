import { assertValidContent } from '../validate';
import { BLUEPRINTS_LIST } from './blueprints';
import { BUILDINGS_LIST } from './buildings';
import type { ContentBundle } from './content-types';
import { ORES } from './ores';
import { RACES } from './races';
import { SCENARIOS_LIST } from './scenarios';
import { SHIPS_LIST } from './ships';
import { BOMBARDMENTS_LIST, MISSILES_LIST, WEAPONS_LIST } from './weapons';

export type { ContentBundle } from './content-types';

/**
 * The single, canonical content bundle. Built once at module load and
 * validated eagerly so downstream packages can `import { CONTENT }` and
 * assume the data is coherent.
 *
 * Validation enforces:
 *  • zod schema compliance for every row in every table;
 *  • every ore kind is present;
 *  • every blueprint prerequisite resolves;
 *  • the blueprint DAG has no cycles (Kahn topological sort);
 *  • every building/ship/weapon/missile blueprint gate exists.
 */
export const CONTENT: ContentBundle = Object.freeze({
  ores: ORES,
  races: RACES,
  buildings: BUILDINGS_LIST,
  blueprints: BLUEPRINTS_LIST,
  ships: SHIPS_LIST,
  weapons: WEAPONS_LIST,
  missiles: MISSILES_LIST,
  bombardments: BOMBARDMENTS_LIST,
  scenarios: SCENARIOS_LIST,
} satisfies ContentBundle);

assertValidContent(CONTENT);

export const loadContent = (): ContentBundle => CONTENT;
