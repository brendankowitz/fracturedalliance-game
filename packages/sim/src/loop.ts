import type { World } from "@fa/domain";
import { tickAgents } from "./systems/agentSystem.ts";
import { tickAI } from "./systems/aiSystem.ts";
import { tickAsteroidEngines } from "./systems/asteroidEngineSystem.ts";
import { tickBlackMarket } from "./systems/blackMarketSystem.ts";
import { tickCombat } from "./systems/combatSystem.ts";
import { tickConstruction } from "./systems/constructionSystem.ts";
import { tickDiplomacy } from "./systems/diplomacySystem.ts";
import { tickEconomy } from "./systems/economySystem.ts";
import { tickHappiness } from "./systems/happinessSystem.ts";
import { tickMining } from "./systems/miningSystem.ts";
import { tickMissiles } from "./systems/missileSystem.ts";
import { tickResources } from "./systems/resourceSystem.ts";
import { tickShips } from "./systems/shipSystem.ts";
import { tickTrader } from "./systems/traderSystem.ts";
import { checkVictory } from "./systems/victorySystem.ts";

export const TICK_MS = 50;

export function tick(world: World): void {
  world.tick += 1;
  world.eventQueue = [];
  tickConstruction(world);
  tickMining(world);
  tickResources(world);
  tickHappiness(world);
  tickShips(world);
  tickCombat(world);
  tickMissiles(world);
  tickAgents(world);
  tickAsteroidEngines(world);
  tickBlackMarket(world);
  tickEconomy(world);
  tickTrader(world);
  tickAI(world);
  tickDiplomacy(world);
  checkVictory(world);
}
