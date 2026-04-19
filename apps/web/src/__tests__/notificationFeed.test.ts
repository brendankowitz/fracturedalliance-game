import { describe, expect, it } from "vitest";
import { EVENT_LABELS } from "../hud/NotificationFeed.tsx";

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
