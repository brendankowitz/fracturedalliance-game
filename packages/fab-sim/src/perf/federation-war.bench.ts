/**
 * Federation War — sim throughput benchmark.
 *
 * Constructs a 10-player federation-war scenario (1 human + 9 AI seats by
 * cycling the federation race ids), runs 5 000 deterministic ticks through
 * the canonical pipeline, and reports wall-clock per-tick latency via
 * mitata.
 *
 * Note: the `@fab/ai` runtime is intentionally NOT imported here. Adding it
 * as a static import would require a project reference from `@fab/sim` to
 * `@fab/ai`, which is circular (`@fab/ai` depends on `@fab/sim` for the
 * `setAiDriver` hook). The numbers below therefore measure the canonical
 * tick pipeline with an empty AI slot — representative for "engine
 * throughput", and a strict lower bound for full-game cost. Track AI cost
 * separately via `packages/ai/src/runtime.test.ts` perf assertions.
 *
 * Usage: `npm run bench` from the repo root.
 *
 * Target: < 10 ms / tick average. If we exceed it, capture the headline
 * numbers in `docs/triage/bench-YYYY-MM-DD.md` and note the hot phase —
 * do NOT optimise from this script (see plan F5).
 */

import { SCENARIOS } from '@fab/content';
import type { ScenarioDef } from '@fab/domain';
import { bench, run, summary } from 'mitata';
import { runTicks, tickOnce } from '../tick';
import { createWorld } from '../world/create';

const TICKS = 5_000;
const PLAYER_COUNT = 10;

const buildFederationWarScenario = (): ScenarioDef => {
  const base = (SCENARIOS as Record<string, ScenarioDef>)['scn.federation-war'];
  if (!base) throw new Error('scn.federation-war scenario missing from @fab/content');
  // Pad/truncate the AI roster to (PLAYER_COUNT - 1) by cycling the
  // canonical federation races. Race ids may repeat — `populateFromScenario`
  // mints unique player ids by index (`p.ai.${i}.${raceId}`).
  const roster: string[] = [];
  for (let i = 0; i < PLAYER_COUNT - 1; i++) {
    const r = base.aiRaces[i % base.aiRaces.length];
    if (!r) throw new Error('federation-war scenario has empty aiRaces');
    roster.push(r);
  }
  return {
    ...base,
    playerCount: PLAYER_COUNT,
    aiRaces: roster,
    asteroidCount: Math.max(base.asteroidCount, PLAYER_COUNT * 2),
  };
};

const scenario = buildFederationWarScenario();

// Warmup tick to let JIT settle and surface any boot errors before we
// hand control to mitata's harness.
{
  const w = createWorld({ seed: 1, scenarioId: scenario.id, scenario });
  tickOnce(w);
  console.info(`[bench] warmup OK | players=${w.players.size} | asteroids=${w.asteroids.size}`);
}

summary(() => {
  bench(`federation-war 10p | ${TICKS} ticks`, () => {
    const world = createWorld({ seed: 1, scenarioId: scenario.id, scenario });
    runTicks(world, TICKS);
    // Touch a field so the optimiser cannot DCE the loop.
    if (world.tick !== TICKS) throw new Error('tick count drifted');
  });
});

await run({
  format: 'mitata',
  colors: false,
});
