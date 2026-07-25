import { expect, type Page, test } from "@playwright/test";

/**
 * Regression test for the bug that made the map unclickable in every build
 * shipped between 2026-04-19 and its fix here: App.tsx wrapped the HUD in a
 * full-viewport `pointerEvents:"auto"` div, which defeated the
 * `pointerEvents:"none"` on its parent and swallowed every pointer event
 * bound for the PixiJS canvas underneath. Asteroid selection, pan, zoom, the
 * inspector, settling, missiles and the asteroid engine were all
 * unreachable, and the 376-test unit/component suite stayed green through
 * all of it because nothing in it does real hit-testing.
 *
 * This has to run against a real browser: the bug lived entirely in CSS
 * compositing (the pointer-events cascade), which jsdom cannot reproduce —
 * jsdom does no layout or paint, so `document.elementFromPoint` there is not
 * meaningfully implemented. Both directions matter: the pre-fix state failed
 * the "canvas is topmost" assertions below, and a naive blanket
 * `pointer-events: none` fix would fail the "HUD chrome is still clickable"
 * assertion.
 */

const VIEWPORT = { width: 1280, height: 800 };

// Seed 9 places the human home asteroid (Egeria) at sector (4,4) — verified
// with `new SimApi({ seed: 9, humanPlayerRaceId: "helionCorp", difficulty:
// "manager" })` from @fa/sim (humanPlayerRaceId and the default "manager"
// difficulty come from apps/web/src/game/renderLoop.ts and the uiStore
// default respectively). SectorView centres the camera on sector (3,3) at
// 1:1 scale on load with no drag/zoom (apps/web/src/game/views/sectorView.ts,
// SECTOR_SCALE = 80px per sector unit), so at this viewport the asteroid
// renders at screen (640 + 80, 400 + 80) = (720, 480). Re-derive both numbers
// together if the world generator or SECTOR_SCALE ever changes.
const SEED = "9";
const HOME_ASTEROID = { x: VIEWPORT.width / 2 + 80, y: VIEWPORT.height / 2 + 80 };

// Points scattered across the map area, clear of the top HUD bar (72px) —
// used to assert the canvas receives pointer events broadly, not just at one
// lucky spot.
const MAP_PROBE_POINTS = [
  { x: 120, y: 150 },
  { x: 640, y: 400 },
  { x: 1150, y: 200 },
  { x: 500, y: 700 },
  { x: 950, y: 650 },
];

function topElementTag(page: Page, x: number, y: number): Promise<string | null> {
  return page.evaluate(([px, py]) => document.elementFromPoint(px, py)?.tagName ?? null, [
    x,
    y,
  ] as const);
}

test.describe("map click-through", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORT);
    await page.goto("/");
    await page.getByLabel("Seed").fill(SEED);
    await page.getByRole("button", { name: "Launch Game" }).click();

    // The mission-briefing tutorial tooltip is the first thing to render once
    // the sim has produced a snapshot — use it as the "game has started"
    // signal, then dismiss it so every test starts from a clean, panel-free
    // and tooltip-free map view.
    const skipTutorial = page.getByRole("button", { name: "Skip Tutorial" });
    await skipTutorial.waitFor({ timeout: 15_000 });
    await skipTutorial.click();
    await expect(skipTutorial).toBeHidden();

    // The sim auto-selects the human colony on its first tick (renderLoop.ts),
    // which can beat or lose the race against the steps above depending on
    // frame timing. Close it defensively so every test starts from the same
    // panel-free map, regardless of that race's outcome.
    const backToMap = page.getByRole("button", { name: "← Back to Map" });
    if (await backToMap.isVisible()) {
      await backToMap.click();
      await expect(backToMap).toBeHidden();
    }
  });

  test("canvas is topmost across the map, and HUD chrome stays clickable", async ({ page }) => {
    for (const { x, y } of MAP_PROBE_POINTS) {
      expect(await topElementTag(page, x, y), `point (${x},${y}) should hit the canvas`).toBe(
        "CANVAS",
      );
    }

    // A naive `pointer-events: none` slapped on everything would pass the
    // loop above but break this: HUD chrome must still receive real clicks.
    const tradeButton = page.getByRole("button", { name: "Trade panel" });
    const tradeBox = await tradeButton.boundingBox();
    if (!tradeBox) throw new Error("Trade nav button not found");
    const tradePoint = { x: tradeBox.x + tradeBox.width / 2, y: tradeBox.y + tradeBox.height / 2 };
    expect(await topElementTag(page, tradePoint.x, tradePoint.y)).not.toBe("CANVAS");

    await tradeButton.click();
    await expect(page.getByText("Ore Market")).toBeVisible();
  });

  test("clicking an asteroid on the canvas opens its inspector", async ({ page }) => {
    expect(await topElementTag(page, HOME_ASTEROID.x, HOME_ASTEROID.y)).toBe("CANVAS");

    await page.mouse.click(HOME_ASTEROID.x, HOME_ASTEROID.y);

    await expect(page.getByRole("button", { name: "← Back to Map" })).toBeVisible();
    await expect(page.getByText("Egeria", { exact: true })).toBeVisible();
  });
});
