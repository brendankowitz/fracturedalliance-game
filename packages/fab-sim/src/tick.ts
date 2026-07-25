/**
 * Deterministic fixed-timestep tick pipeline (20 Hz).
 *
 * Phase order is canonical (spec §D):
 *
 *   1. commandPhase          — validate & apply queued player commands
 *   2. miningPhase           — extract ore from owned mines
 *   3. productionPhase       — life-support flows, credits, upkeep
 *   4. populationPhase       — happiness drift, growth, starvation
 *   5. buildQueuePhase       — advance queued builds, instantiate completions
 *   6. researchPhase         — advance per-player active research
 *   7. marketPhase           — price drift, Federal Transporter, shocks
 *   8. aiPhase               — utility-AI agents emit commands for next tick (Phase 7)
 *   9. diplomacyPhase        — treaty expiry, reputation drift, embassy bonus (Phase 8)
 *  10. asteroidMotionPhase   — asteroid engine integration, collisions (Phase 9)
 *  11. combatPhase           — missile flight, fleet duels, bombardment (Phase 6)
 *  12. victoryPhase          — evaluate 5 victory conditions (Phase 10)
 *  13. eventPhase            — drain scheduled events into the notification bus
 *  14. tickIncrement         — `world.tick += 1`
 *
 * All RNG flows through `PrngRegistry`: restored from `world.rng` at the
 * start of the tick, snapshotted back at the end. This keeps `World` a
 * plain-data structure and serialisation-safe while giving systems a
 * mutable stream.
 */

import type { World } from '@fab/domain';
import { PrngRegistry } from './rng/subGenerators';
import { asteroidMotionPhase } from './systems/asteroidMotion';
import { buildQueuePhase } from './systems/buildQueue';
import { combatPhase } from './systems/combat';
import { commandPhase } from './systems/commands';
import { detectionPhase } from './systems/detection';
import { diplomacyPhase } from './systems/diplomacy';
import { productionPhase } from './systems/economy';
import { espionagePhase } from './systems/espionage';
import { eventPhase } from './systems/events';
import { federalCouncilPhase } from './systems/federalCouncil';
import { marketPhase } from './systems/market';
import { miningPhase } from './systems/mining';
import { populationPhase } from './systems/population';
import { researchPhase } from './systems/research';
import { satellitesPhase } from './systems/satellites';
import { scenarioTriggersPhase } from './systems/scenarioHooks';
import { tutorialPhase } from './systems/tutorial';
import { victoryPhase } from './systems/victory';

/** Re-exported for convenience — see `./time.ts` for the full time model. */
export { FIXED_STEP_MS } from './time';

/**
 * Pluggable AI driver. `@fab/ai` registers its `aiPhase(world, reg)` here at
 * module load so the sim need not depend on the AI package. If no driver is
 * installed, the hook is a no-op.
 */
export type AiDriver = (world: World, reg: PrngRegistry) => void;

let aiDriver: AiDriver | null = null;
export const setAiDriver = (driver: AiDriver | null): void => {
  aiDriver = driver;
};

/** Advance the world exactly one fixed step. */
export const tickOnce = (world: World): void => {
  const reg = PrngRegistry.restore(world.rng);

  commandPhase(world);
  miningPhase(world);
  productionPhase(world);
  populationPhase(world);
  buildQueuePhase(world);
  researchPhase(world);
  marketPhase(world, reg);
  if (aiDriver) aiDriver(world, reg);
  if (world.aiHooks) world.aiHooks(world);
  diplomacyPhase(world);
  asteroidMotionPhase(world);
  combatPhase(world, reg);
  satellitesPhase(world, reg);
  espionagePhase(world, reg);
  federalCouncilPhase(world, reg);
  scenarioTriggersPhase(world);
  detectionPhase(world);
  victoryPhase(world);
  tutorialPhase(world);
  eventPhase(world);

  world.tick += 1;
  world.rng = reg.snapshot();
};

/** Advance `n` ticks back-to-back. */
export const runTicks = (world: World, n: number): void => {
  for (let i = 0; i < n; i++) tickOnce(world);
};
