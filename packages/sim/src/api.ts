import type { World } from "@fa/domain";
import { applyCommand } from "./commandProcessor.ts";
import type { Command } from "./commands.ts";
import { tick } from "./loop.ts";
import { deserializeWorld, serializeWorld } from "./serialization.ts";
import type { AsteroidSnapshot, DiplomacyEntry, HudSnapshot } from "./snapshot.ts";
import { takeSnapshot } from "./snapshot.ts";
import type { WorldConfig } from "./world.ts";
import { createWorld } from "./world.ts";

export type { Command } from "./commands.ts";
export type { AsteroidSnapshot, DiplomacyEntry, HudSnapshot };
export { ARRIVAL_RADIUS } from "./systems/shipSystem.ts";

export class SimApi {
  private world: World;
  private pendingCommands: Command[] = [];

  constructor(config: WorldConfig) {
    this.world = createWorld(config);
  }

  // Phase 0: always advances one fixed step. The worker bridge calls this at TICK_MS
  // cadence; accumulation will be added in Phase 1 when the RAF loop is wired up.
  tick(_deltaMs: number): void {
    for (const cmd of this.pendingCommands) applyCommand(this.world, cmd);
    this.pendingCommands = [];
    tick(this.world);
  }

  enqueueCommand(command: Command): void {
    this.pendingCommands.push(command);
  }

  getSnapshot(): HudSnapshot {
    return takeSnapshot(this.world);
  }

  getSaveBlob(): string {
    const worldSnapshot = serializeWorld(this.world);
    const verdict =
      this.world.gameEndState == null
        ? "inProgress"
        : this.world.gameEndState.startsWith("victory")
          ? "won"
          : "lost";
    return JSON.stringify({
      schemaVersion: 1,
      gameVersion: "0.1.0",
      createdAtIso: new Date().toISOString(),
      playerName: "Commander",
      verdict,
      difficulty: "manager",
      rngSeed: this.world.seed,
      rngState: this.world.prng.state(),
      worldSnapshot,
      uiPrefs: {},
    });
  }

  restore(blob: string): void {
    const save = JSON.parse(blob) as Record<string, unknown>;
    if (save["schemaVersion"] !== 1) {
      throw new Error(`Unsupported save schema version: ${String(save["schemaVersion"] ?? "unknown")}`);
    }
    const rngState = save["rngState"] as number;
    const worldSnapshot = save["worldSnapshot"] as Record<string, unknown>;
    this.world = deserializeWorld(worldSnapshot, rngState);
    this.pendingCommands = [];
  }
}
