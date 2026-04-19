import type { World } from "@fa/domain";
import { applyCommand } from "./commandProcessor.ts";
import type { Command } from "./commands.ts";
import { tick } from "./loop.ts";
import type { HudSnapshot } from "./snapshot.ts";
import { takeSnapshot } from "./snapshot.ts";
import type { WorldConfig } from "./world.ts";
import { createWorld } from "./world.ts";

export class SimApi {
  private world: World;
  private pendingCommands: Command[] = [];

  constructor(config: WorldConfig) {
    this.world = createWorld(config);
  }

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
