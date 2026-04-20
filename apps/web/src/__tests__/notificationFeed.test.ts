import { describe, expect, it } from "vitest";
import { EVENT_LABELS } from "../hud/NotificationFeed.tsx";
import { useUiStore } from "../store/uiStore.ts";

const KNOWN_EVENT_KINDS = [
  "colony.under_attack",
  "colony.starved",
  "colony.captured",
  "asteroid.incoming",
  "trader.arrived",
  "construction.done",
  "treaty.broken",
  "blueprint.purchased",
];

describe("NotificationFeed event labels", () => {
  it("maps every known event kind to a human-readable label", () => {
    for (const kind of KNOWN_EVENT_KINDS) {
      expect(EVENT_LABELS[kind]).toBeDefined();
      expect(typeof EVENT_LABELS[kind]).toBe("string");
      expect((EVENT_LABELS[kind] ?? "").length).toBeGreaterThan(0);
    }
  });

  it("all labels are unique", () => {
    const values = Object.values(EVENT_LABELS);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
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
