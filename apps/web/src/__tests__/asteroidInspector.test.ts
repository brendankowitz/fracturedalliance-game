import { describe, expect, it } from "vitest";

function formatKind(kind: string): string {
  return kind.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

describe("formatKind", () => {
  it("converts camelCase to Title Case words", () => {
    expect(formatKind("airProcessor")).toBe("Air Processor");
    expect(formatKind("mineMk1")).toBe("Mine Mk1");
    expect(formatKind("shipYard")).toBe("Ship Yard");
    expect(formatKind("assaultCraft")).toBe("Assault Craft");
  });

  it("handles single-word kinds", () => {
    expect(formatKind("cpu")).toBe("Cpu");
    expect(formatKind("scout")).toBe("Scout");
  });
});
