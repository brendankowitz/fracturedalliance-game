import { type DBSchema, openDB } from "idb";
import type { SaveV1 } from "./serializer.ts";
import { deserialize, serialize } from "./serializer.ts";

interface FaDb extends DBSchema {
  saves: {
    key: number;
    value: { slot: number; bytes: Uint8Array; updatedAt: number; label: string };
  };
}

const DB_NAME = "fractured-alliance";
const DB_VERSION = 1;

// Module-level connection cache — justified exception to the no-module-state rule;
// opening a new IDB handle on every call accumulates handles that are never closed.
let _dbPromise: ReturnType<typeof openDB<FaDb>> | undefined;

function getDb() {
  _dbPromise ??= openDB<FaDb>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore("saves", { keyPath: "slot" });
    },
  });
  return _dbPromise;
}

export async function saveToSlot(slot: number, save: SaveV1, label: string): Promise<void> {
  const db = await getDb();
  const bytes = serialize(save);
  await db.put("saves", { slot, bytes, updatedAt: Date.now(), label });
}

export async function loadFromSlot(slot: number): Promise<SaveV1 | null> {
  const db = await getDb();
  const record = await db.get("saves", slot);
  if (!record) return null;
  return deserialize(record.bytes);
}

export async function listSaveSlots(): Promise<
  Array<{ slot: number; label: string; updatedAt: number }>
> {
  const db = await getDb();
  const all = await db.getAll("saves");
  return all.map(({ slot, label, updatedAt }) => ({ slot, label, updatedAt }));
}

export async function deleteSaveSlot(slot: number): Promise<void> {
  const db = await getDb();
  await db.delete("saves", slot);
}
