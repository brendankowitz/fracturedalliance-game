import { create } from "zustand";
import type { Cell } from "../game/views/surface/isoProjection.ts";

/**
 * Placement state shared by the console's build palette and the surface view.
 *
 * Both can place a building, and they must never disagree about which cells are already
 * spoken for — so the armed kind and the queued-but-unbuilt cells live in one place
 * rather than in whichever component happened to own them.
 *
 * `pendingByAsteroid` exists because the snapshot's build-queue entries do not carry the
 * cell they were queued on. It can be deleted when they do.
 */
interface BuildState {
  armedKind: string | null;
  pendingByAsteroid: Readonly<Record<string, ReadonlyArray<Cell>>>;
  armKind: (kind: string | null) => void;
  addPending: (asteroidId: string, cell: Cell) => void;
}

export const useBuildStore = create<BuildState>((set) => ({
  armedKind: null,
  pendingByAsteroid: {},
  armKind: (kind) => {
    set({ armedKind: kind });
  },
  addPending: (asteroidId, cell) => {
    set((s) => ({
      pendingByAsteroid: {
        ...s.pendingByAsteroid,
        [asteroidId]: [...(s.pendingByAsteroid[asteroidId] ?? []), cell],
      },
    }));
  },
}));

/** Cells on this asteroid holding a queued build the snapshot cannot yet locate. */
export function selectPendingCells(
  pendingByAsteroid: BuildState["pendingByAsteroid"],
  asteroidId: string,
  queueLength: number,
  isBuilt: (cell: Cell) => boolean,
): ReadonlyArray<Cell> {
  if (queueLength === 0) return [];
  return (pendingByAsteroid[asteroidId] ?? []).filter((cell) => !isBuilt(cell));
}
