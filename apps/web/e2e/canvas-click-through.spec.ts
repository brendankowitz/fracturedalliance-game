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
 * the reachability assertion below, and a naive blanket `pointer-events:
 * none` fix would fail the "HUD chrome is still clickable" assertion.
 *
 * The reachable map region is discovered at runtime rather than hard-coded.
 * An earlier version pinned five screen coordinates against the pre-console
 * layout; when the console shell moved the world view, two of them landed
 * inside the build palette and the suite went red reporting the signature of
 * the original bug. A stale test that cries wolf about the one bug this
 * project most needs to catch is worse than no test. What must hold is the
 * invariant — the map is broadly reachable and the chrome still works — not
 * any particular pixel.
 */

const VIEWPORT = { width: 1280, height: 800 };
const SEED = "9";

/** Sweep the area inside the console's chrome: left rail, top bar and status line excluded. */
const SWEEP = { xMin: 260, xMax: 1260, yMin: 180, yMax: 760, step: 40 };

/**
 * Finding a rock needs a finer net than proving the map is reachable: an
 * asteroid is ~28px across, so a 40px grid can straddle one entirely, and the
 * belt renders higher in the pane than the reachability sweep starts.
 */
const ROCK_SWEEP = { xMin: 250, xMax: 1260, yMin: 100, yMax: 760, step: 14 };

/**
 * The map must be reachable across a real area, not at one lucky pixel. The
 * pre-fix build scored zero here; the current layout leaves comfortably more
 * than this floor, so a regression that narrows the world to a sliver also
 * fails rather than squeaking through.
 */
const MIN_REACHABLE_POINTS = 20;

function topElementTag(page: Page, x: number, y: number): Promise<string | null> {
  return page.evaluate(([px, py]) => document.elementFromPoint(px, py)?.tagName ?? null, [
    x,
    y,
  ] as const);
}

/** Every sampled point at which a canvas — rather than HUD chrome — receives the pointer. */
function reachableMapPoints(
  page: Page,
  sweep: typeof SWEEP = SWEEP,
): Promise<Array<{ x: number; y: number }>> {
  return page.evaluate((s) => {
    const found: Array<{ x: number; y: number }> = [];
    for (let y = s.yMin; y <= s.yMax; y += s.step) {
      for (let x = s.xMin; x <= s.xMax; x += s.step) {
        if (document.elementFromPoint(x, y)?.tagName === "CANVAS") found.push({ x, y });
      }
    }
    return found;
  }, sweep);
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

    // The sim opens the player's colony on start, which can beat or lose the
    // race against the steps above depending on frame timing. Close it
    // defensively so every test starts from the same panel-free map.
    const backToMap = page.getByRole("button", { name: "← Back to Map" });
    if (await backToMap.isVisible()) {
      await backToMap.click();
      await expect(backToMap).toBeHidden();
    }
  });

  test("the map is broadly reachable, and HUD chrome stays clickable", async ({ page }) => {
    const reachable = await reachableMapPoints(page);
    expect(
      reachable.length,
      `expected at least ${MIN_REACHABLE_POINTS} points where the canvas receives the pointer, found ${reachable.length}`,
    ).toBeGreaterThanOrEqual(MIN_REACHABLE_POINTS);

    // A blanket `pointer-events: none` would pass the sweep above but break
    // this: console chrome must still receive real clicks and act on them.
    const commerceTab = page.getByRole("button", { name: "Commerce section" });
    const tabBox = await commerceTab.boundingBox();
    if (!tabBox) throw new Error("Commerce section tab not found");
    expect(
      await topElementTag(page, tabBox.x + tabBox.width / 2, tabBox.y + tabBox.height / 2),
    ).not.toBe("CANVAS");

    await commerceTab.click();
    await expect(page.getByText("Ore Ledger")).toBeVisible();
  });

  test("clicking the map opens an asteroid inspector", async ({ page }) => {
    // Hunting a ~28px rock across the whole pane is hundreds of clicks in the
    // worst case; the default 30s budget is not enough to be conclusive.
    test.setTimeout(120_000);

    const reachable = await reachableMapPoints(page, ROCK_SWEEP);
    expect(reachable.length).toBeGreaterThan(0);

    // Walk the reachable points until one lands on a rock, rather than
    // assuming a screen position — the belt moves with seed, camera and
    // layout, and hard-coded coordinates are what made the previous version
    // of this file go stale.
    const backToMap = page.getByRole("button", { name: "← Back to Map" });
    for (const { x, y } of reachable) {
      await page.mouse.click(x, y);
      if (await backToMap.isVisible({ timeout: 40 }).catch(() => false)) break;
    }

    // The full path: real hit-test on the canvas → command into the sim →
    // snapshot back → inspector rendered. This is what the original bug broke.
    await expect(backToMap).toBeVisible();
  });
});
