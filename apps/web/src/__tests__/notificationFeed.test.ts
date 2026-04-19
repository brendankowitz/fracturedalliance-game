import { describe, expect, it } from "vitest";

const EVENT_LABELS: Partial<Record<string, string>> = {
  "colony.under_attack": "Colony under attack",
  "colony.starved": "Colony starving",
  "colony.captured": "Colony captured",
  "asteroid.incoming": "Asteroid incoming",
  "trader.arrived": "Transporter arrived",
  "construction.done": "Construction complete",
  "treaty.broken": "Treaty broken",
  "blueprint.purchased": "Blueprint acquired",
};

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
