import type { SerializedWorld } from './serialize';

/**
 * Save-file migrations. Each entry upgrades from schemaVersion N-1 to N.
 * Index 0 is the identity migration for the initial v1 schema, index 1
 * is the v1→v2 migration that introduced `tutorialState` alongside the
 * Phase 12 tutorial engine.
 */
export const CURRENT_SCHEMA_VERSION = 2;

type Migration = (raw: unknown) => SerializedWorld;

export const migrations: readonly Migration[] = [
  // v1 — initial schema; accept as-is after a minimal shape check.
  (raw: unknown): SerializedWorld => {
    const r = raw as SerializedWorld;
    if (typeof r !== 'object' || r === null) throw new Error('migrate v1: not an object');
    if (typeof r.tick !== 'number') throw new Error('migrate v1: missing tick');
    return { ...r, schemaVersion: 1 };
  },
  // v2 — Phase 12 added `tutorialState`. Default to `null` for pre-existing saves.
  (raw: unknown): SerializedWorld => {
    const r = raw as SerializedWorld & { tutorialState?: unknown };
    return { ...r, tutorialState: r.tutorialState ?? null, schemaVersion: 2 };
  },
];

export class SaveSchemaError extends Error {
  readonly code = 'SAVE_SCHEMA_ERROR';
  constructor(
    message: string,
    readonly fromVersion: number,
    readonly toVersion: number,
  ) {
    super(message);
    this.name = 'SaveSchemaError';
  }
}

export const migrateToLatest = (raw: unknown): SerializedWorld => {
  const start = (raw as { schemaVersion?: number }).schemaVersion ?? 0;
  if (start > CURRENT_SCHEMA_VERSION) {
    throw new SaveSchemaError(
      `save schemaVersion ${start} is newer than supported ${CURRENT_SCHEMA_VERSION}`,
      start,
      CURRENT_SCHEMA_VERSION,
    );
  }
  let current = raw;
  for (let v = start + 1; v <= CURRENT_SCHEMA_VERSION; v++) {
    const migrate = migrations[v - 1];
    if (!migrate) {
      throw new SaveSchemaError(`no migration registered for schema version ${v}`, start, v);
    }
    current = migrate(current);
  }
  return current as SerializedWorld;
};
