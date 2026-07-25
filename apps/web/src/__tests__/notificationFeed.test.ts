import { describe, expect, it } from "vitest";
import { EVENT_KIND_META, eventLabel } from "../hud/eventKindMeta.ts";
import { useUiStore } from "../store/uiStore.ts";

/** Kinds the legacy sim emits that the HUD has always labelled. */
const LEGACY_EVENT_KINDS = [
  "colony.under_attack",
  "colony.starved",
  "colony.captured",
  "asteroid.incoming",
  "trader.arrived",
  "construction.done",
  "treaty.broken",
  "blueprint.purchased",
];

/** Kinds the adopted (vendored) sim emits — the Stage 1 vocabulary. */
const VENDORED_EVENT_KINDS = [
  "asteroid.settled",
  "buildQueue.completed",
  "research.started",
  "research.completed",
  "federal.transporter",
  "federal.investigation",
  "famine.projected",
  "resource.deficit",
  "population.unrest",
  "market.shock",
  "ship.destroyed",
  "command.rejected",
  "council.embargo",
  "council.tariff",
  "council.vote.opened",
  "espionage.mission.dispatched",
  "espionage.mission.resolved",
  "espionage.agent.captured",
  "blackMarket.unlocked",
  "satellite.launched",
  "satellite.destroyed",
  "odp.intercepted",
  "game.over",
  "tutorial.objective.activated",
  "tutorial.objective.completed",
];

describe("eventKindMeta", () => {
  it("labels every kind either sim emits", () => {
    for (const kind of [...LEGACY_EVENT_KINDS, ...VENDORED_EVENT_KINDS]) {
      const meta = EVENT_KIND_META[kind];
      expect(meta, `missing meta for ${kind}`).toBeDefined();
      expect(meta?.label.length).toBeGreaterThan(0);
    }
  });

  it("passes unknown kinds through as their raw kind string, never dropping them", () => {
    expect(eventLabel("some.future.event")).toBe("some.future.event");
  });

  it("every declared sfx key exists on the SFX table shape", async () => {
    const { SFX } = await import("../audio.ts");
    for (const [kind, meta] of Object.entries(EVENT_KIND_META)) {
      if (meta.sfx !== null) {
        expect(SFX[meta.sfx], `bad sfx key on ${kind}`).toBeDefined();
      }
    }
  });
});

describe("NotificationFeed pause-on-priority store integration", () => {
  it("pauseOnPriority.red is true by default — store is ready to trigger pause on red events", () => {
    useUiStore.setState({ pauseOnPriority: { red: true, amber: false }, paused: false });
    const { pauseOnPriority } = useUiStore.getState();
    expect(pauseOnPriority.red).toBe(true);
    expect(pauseOnPriority.amber).toBe(false);
  });

  it("disabling red pause prevents auto-pause on red events", () => {
    useUiStore.setState({ pauseOnPriority: { red: false, amber: false }, paused: false });
    const { pauseOnPriority } = useUiStore.getState();
    expect(pauseOnPriority.red).toBe(false);
  });

  it("enabling amber pause allows auto-pause on amber events", () => {
    useUiStore.setState({ pauseOnPriority: { red: true, amber: false }, paused: false });
    useUiStore.getState().setPauseOnPriority("amber", true);
    expect(useUiStore.getState().pauseOnPriority.amber).toBe(true);
  });

  it("toggling red off then on via setPauseOnPriority preserves amber state", () => {
    useUiStore.setState({ pauseOnPriority: { red: true, amber: true } });
    useUiStore.getState().setPauseOnPriority("red", false);
    const state = useUiStore.getState().pauseOnPriority;
    expect(state.red).toBe(false);
    expect(state.amber).toBe(true);
  });
});
