import type { World } from "@fa/domain";
import { applyCommand } from "./commandProcessor.ts";
import type { Command } from "./commands.ts";
import { tick } from "./loop.ts";
import type { AsteroidSnapshot, DiplomacyEntry, HudSnapshot } from "./snapshot.ts";
import { takeSnapshot } from "./snapshot.ts";
import type { WorldConfig } from "./world.ts";
import { createWorld } from "./world.ts";

export type { Command } from "./commands.ts";
export type { AsteroidSnapshot, DiplomacyEntry, HudSnapshot };

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
    return JSON.stringify({
      schemaVersion: this.world.schemaVersion,
      tick: this.world.tick,
      seed: this.world.seed,
    });
  }
}
