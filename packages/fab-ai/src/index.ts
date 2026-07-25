/**
 * @fab/ai — layered utility AI + mistreevous behaviour trees.
 */
import { setAiDriver } from '@fab/sim';
import { aiPhase } from './runtime';

// Auto-register the AI driver into the sim at import time so consumers that
// depend on `@fab/ai` get deterministic AI behaviour without extra wiring.
setAiDriver(aiPhase);

export * from './agents/actions';
export * from './agents/personality';
export * from './context';
export * from './runtime';
export * from './utility';
