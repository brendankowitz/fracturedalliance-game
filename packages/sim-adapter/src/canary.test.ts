/**
 * Determinism canaries (Stage 1 adoption spec §5, condition (c)).
 *
 * 1. The AI driver must be registered by the `@fab/ai` import side effect —
 *    SimApiV2's constructor throws otherwise, and this test pins that the
 *    wiring holds under the vitest module graph too.
 * 2. The Federal Council must produce autonomous pressure on a fixed seed:
 *    run past several convocations (every 1,200 ticks) and require council
 *    activity — this is the machinery that answers "nothing pushes back",
 *    and it must never be silently lost at the seam.
 */

import { hasAiDriver } from "@fab/sim";
import { describe, expect, it } from "vitest";
import { SimApiV2 } from "./simApiV2.ts";

const CANARY_SEED = 42;

describe("adoption canaries", () => {
  it("the @fab/ai import side effect registered the AI driver", () => {
    expect(hasAiDriver()).toBe(true);
    // And the constructor-level assertion accepts a live driver.
    expect(() => new SimApiV2({ seed: 1 })).not.toThrow();
  });

  it("the Federal Council acts unprovoked within five convocations (seed 42)", () => {
    const api = new SimApiV2({ seed: CANARY_SEED, difficulty: "manager" });

    const seenCouncilEvents: string[] = [];
    let councilStateSeen = false;

    for (let batch = 0; batch < 62; batch++) {
      for (let t = 0; t < 100; t++) api.tick(50);
      const snap = api.getSnapshot();
      for (const e of snap.events) {
        if (e.kind.startsWith("council.")) seenCouncilEvents.push(e.kind);
      }
      if (
        snap.council.embargoes.length > 0 ||
        snap.council.tariffs.length > 0 ||
        snap.council.openVotes.length > 0
      ) {
        councilStateSeen = true;
      }
    }

    expect(seenCouncilEvents.length).toBeGreaterThan(0);
    expect(councilStateSeen).toBe(true);
  });

  it("same seed, same tick count, same world hash (determinism holds through the adapter)", () => {
    const run = (): string => {
      const api = new SimApiV2({ seed: 1337, difficulty: "manager" });
      for (let t = 0; t < 500; t++) api.tick(50);
      const blob = JSON.parse(api.getSaveBlob()) as { worldSnapshot: unknown };
      return JSON.stringify(blob.worldSnapshot);
    };
    expect(run()).toBe(run());
  });
});
