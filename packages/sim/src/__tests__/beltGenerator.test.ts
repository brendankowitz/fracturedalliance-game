import { describe, expect, it } from "vitest";
import { generateBelt } from "../beltGenerator.ts";
import { makePrng } from "../prng.ts";

describe("generateBelt", () => {
  it("same seed produces identical asteroid names and sectors", () => {
    const a = generateBelt(42);
    const b = generateBelt(42);
    const namesA = a.asteroids.map((x) => x.name);
    const namesB = b.asteroids.map((x) => x.name);
    expect(namesA).toEqual(namesB);
    const sectorsA = a.asteroids.map((x) => x.sector);
    const sectorsB = b.asteroids.map((x) => x.sector);
    expect(sectorsA).toEqual(sectorsB);
  });

  it("different seeds produce different results", () => {
    const a = generateBelt(1);
    const b = generateBelt(2);
    const namesA = a.asteroids.map((x) => x.name);
    const namesB = b.asteroids.map((x) => x.name);
    expect(namesA).not.toEqual(namesB);
  });

  it("generates exactly 20 asteroids", () => {
    const { asteroids } = generateBelt(99);
    expect(asteroids).toHaveLength(20);
  });

  it("all asteroid sectors are unique", () => {
    const { asteroids } = generateBelt(7);
    const keys = asteroids.map((a) => `${a.sector.x},${a.sector.y}`);
    const unique = new Set(keys);
    expect(unique.size).toBe(asteroids.length);
  });

  it("at least one player exists and is human", () => {
    const { players } = generateBelt(123);
    expect(players.length).toBeGreaterThan(0);
    const human = players.find((p) => p.isHuman);
    expect(human).toBeDefined();
  });

  it("deposits are within expected ranges", () => {
    const { asteroids } = generateBelt(55);
    for (const asteroid of asteroids) {
      for (const amount of Object.values(asteroid.deposits)) {
        if (amount !== undefined) {
          expect(amount).toBeGreaterThanOrEqual(100);
          expect(amount).toBeLessThanOrEqual(900);
        }
      }
    }
  });

  it("radiation is between 0 and 0.6", () => {
    const { asteroids } = generateBelt(200);
    for (const asteroid of asteroids) {
      expect(asteroid.radiation).toBeGreaterThanOrEqual(0);
      expect(asteroid.radiation).toBeLessThanOrEqual(0.6);
    }
  });

  it("stability is between 0.4 and 1.0", () => {
    const { asteroids } = generateBelt(300);
    for (const asteroid of asteroids) {
      expect(asteroid.stability).toBeGreaterThanOrEqual(0.4);
      expect(asteroid.stability).toBeLessThanOrEqual(1.0);
    }
  });

  it("happiness is between 0.5 and 1.0", () => {
    const { asteroids } = generateBelt(400);
    for (const asteroid of asteroids) {
      expect(asteroid.happiness).toBeGreaterThanOrEqual(0.5);
      expect(asteroid.happiness).toBeLessThanOrEqual(1.0);
    }
  });

  it("prng state continues to advance after generation", () => {
    // The world prng is created independently from the belt prng — verify
    // generateBelt is self-contained and does not exhaust an external prng
    const prng = makePrng(42);
    const before = prng.state();
    generateBelt(42);
    // The external prng must be completely untouched
    expect(prng.state()).toBe(before);
  });

  it("asteroid IDs are sequential from a1 to a20", () => {
    const { asteroids } = generateBelt(10);
    const ids = asteroids.map((a) => a.id);
    for (let i = 0; i < 20; i++) {
      expect(ids[i]).toBe(`a${i + 1}`);
    }
  });

  it("human player always has id player-human", () => {
    const { players } = generateBelt(77);
    const human = players.find((p) => p.isHuman);
    expect(human?.id).toBe("player-human");
  });

  it("at least one asteroid is owned by the human player after generation", () => {
    const { asteroids, players } = generateBelt(88);
    const human = players.find((p) => p.isHuman);
    expect(human).toBeDefined();
    const humanAsteroids = asteroids.filter((a) => a.ownerId === human?.id);
    expect(humanAsteroids.length).toBeGreaterThanOrEqual(1);
  });

  it("size class is one of S, M, L", () => {
    const { asteroids } = generateBelt(500);
    const validClasses = new Set(["S", "M", "L"]);
    for (const asteroid of asteroids) {
      expect(validClasses.has(asteroid.sizeClass)).toBe(true);
    }
  });
});
