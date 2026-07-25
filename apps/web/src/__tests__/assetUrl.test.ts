import { afterEach, describe, expect, it, vi } from "vitest";
import { assetUrl } from "../assetUrl";

function withBase(base: string, fn: () => void): void {
  vi.stubEnv("BASE_URL", base);
  fn();
}

describe("assetUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is a no-op at the root base", () => {
    withBase("/", () => {
      expect(assetUrl("/assets/ships/player.png")).toBe("/assets/ships/player.png");
      expect(assetUrl("/audio/sfx/attack.wav")).toBe("/audio/sfx/attack.wav");
    });
  });

  it("prefixes a sub-path base", () => {
    withBase("/fracturedalliance-game/", () => {
      expect(assetUrl("/assets/ships/player.png")).toBe(
        "/fracturedalliance-game/assets/ships/player.png",
      );
    });
  });

  it("never produces a double slash", () => {
    withBase("/sub/", () => {
      expect(assetUrl("assets/a.png")).toBe("/sub/assets/a.png");
    });
    withBase("/sub", () => {
      expect(assetUrl("/assets/a.png")).toBe("/sub/assets/a.png");
    });
  });
});
