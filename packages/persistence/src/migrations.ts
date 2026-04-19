import type { SaveV1 } from "./serializer.ts";

type AnyRaw = Record<string, unknown>;

const MIGRATIONS: Array<(raw: AnyRaw) => AnyRaw> = [
  // v0 → v1: add schemaVersion field
  (raw) => ({ ...raw, schemaVersion: 1 }),
];

export function applyMigrations(raw: AnyRaw): SaveV1 {
  let current = raw;
  const version = (raw.schemaVersion as number | undefined) ?? 0;
  for (let i = version; i < MIGRATIONS.length; i++) {
    const migrate = MIGRATIONS[i];
    if (migrate !== undefined) {
      current = migrate(current);
    }
  }
  return current as unknown as SaveV1;
}
