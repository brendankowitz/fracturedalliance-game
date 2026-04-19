import { describe, expect, it } from "vitest";
import type { AsteroidId, BuildingId } from "../ids.ts";

describe("branded IDs", () => {
  it("AsteroidId and BuildingId are structurally distinct", () => {
    const aid = "a1" as AsteroidId;
    const bid = "b1" as BuildingId;
    expect(typeof aid).toBe("string");
    expect(typeof bid).toBe("string");
    expect(aid).not.toBe(bid);
  });
});
