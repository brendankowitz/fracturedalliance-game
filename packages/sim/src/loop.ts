import type { World } from "@fa/domain";
import { tickAI } from "./systems/aiSystem.ts";
import { tickConstruction } from "./systems/constructionSystem.ts";
import { tickMining } from "./systems/miningSystem.ts";
import { tickResources } from "./systems/resourceSystem.ts";
import { tickShips } from "./systems/shipSystem.ts";
import { tickTrader } from "./systems/traderSystem.ts";

export const TICK_MS = 50;

export function tick(world: World): void {
  world.tick += 1;
  world.eventQueue = [];
  tickConstruction(world);
  tickMining(world);
  tickResources(world);
  tickShips(world);
  tickTrader(world);
  tickAI(world);
}
