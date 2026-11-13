import { test, type Page } from "@playwright/test";
import { BASE, stubBoard, type StubOptions } from "./fixtures";

/**
 * `SHOTS_DIR=<dir> npx playwright test shots` writes one screenshot per screen, width and theme,
 * named `<screen>-<theme>-<width>.png`. Without SHOTS_DIR the spec is skipped.
 */
const DIR = process.env.SHOTS_DIR;
test.skip(!DIR, "SHOTS_DIR is not set");

interface Screen {
  name: string;
  path: string;
  stub?: StubOptions;
  /** Clicks a card or a row first. */
  open?: string;
  /** Viewport height, where the screen is a stage of its own. */
  height?: (width: number) => number;
  full?: boolean;
}

const SCREENS: Screen[] = [
  { name: "board", path: "", full: true },
  { name: "detail", path: "", open: "shelfmark-31: Search results page", height: (w) => (w === 390 ? 1243 : 1180) },
  { name: "older-done", path: "done" },
  { name: "sprints", path: "sprints", full: true },
  { name: "account", path: "account" },
  { name: "login", path: "login", stub: { signedOut: true } },
  { name: "gate-loading", path: "", stub: { hang: true } },
  { name: "gate-unreachable", path: "", stub: { apiDown: true } },
  { name: "board-empty", path: "", stub: { empty: true } },
  { name: "board-api-down", path: "", stub: { apiDown: true } },
];

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
}

for (const theme of ["light", "dark"] as const) {
  for (const width of [1280, 390] as const) {
    for (const screen of SCREENS) {
      test(`${screen.name} ${theme} ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: screen.height?.(width) ?? (width === 390 ? 844 : 800) });
        await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
        await stubBoard(page, screen.stub);
        await page.goto(BASE + screen.path);
        if (screen.open) await page.getByRole("button", { name: screen.open }).click();
        await settle(page);
        await page.screenshot({ path: `${DIR}/${screen.name}-${theme}-${width}.png`, fullPage: screen.full ?? false });
      });
    }
  }
}
