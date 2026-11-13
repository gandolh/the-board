import { expect, test, type Page } from "@playwright/test";
import { BASE, stubBoard, type StubOptions } from "./fixtures";

/**
 * The Floor, on every screen and in all three themes: a visible focus ring on each Tab stop, no
 * running animation or transition under reduced motion, and no sideways scroll at 390 px (and 360).
 * The theme switch, and light on a first visit, are tested on the account page.
 */
interface Screen {
  name: string;
  path: string;
  stub?: StubOptions;
  /** A button to click first (a card), to open the detail panel. */
  open?: string;
}

const SCREENS: Screen[] = [
  { name: "board", path: "" },
  { name: "board with the panel open", path: "", open: "shelfmark-31: Search results page" },
  { name: "older done", path: "done" },
  { name: "sprints", path: "sprints" },
  { name: "account", path: "account" },
  { name: "sign-in", path: "login", stub: { signedOut: true } },
  { name: "empty board", path: "", stub: { empty: true } },
  { name: "api down", path: "", stub: { apiDown: true } },
  { name: "gate unreachable", path: "", stub: { sessionDown: true } },
];

type Mode = "light" | "dark" | "system";

async function visit(page: Page, screen: Screen, mode: Mode) {
  await page.addInitScript((m) => localStorage.setItem("theme", m), mode);
  await stubBoard(page, screen.stub);
  await page.goto(BASE + screen.path);
  if (screen.open) await page.getByRole("button", { name: screen.open }).click();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
}

for (const mode of ["light", "dark", "system"] as const) {
  test.describe(`theme ${mode}`, () => {
    test.use({ colorScheme: mode === "system" ? "dark" : mode });

    for (const screen of SCREENS) {
      test(`${screen.name}: a visible focus ring on every Tab stop`, async ({ page }) => {
        await visit(page, screen, mode);
        let stops = 0;
        for (let i = 0; i < 60; i++) {
          await page.keyboard.press("Tab");
          const ring = await page.evaluate(() => {
            const el = document.activeElement;
            if (!el || el === document.body) return null;
            const css = getComputedStyle(el);
            return {
              label: `${el.tagName.toLowerCase()} ${(el.textContent ?? "").trim().slice(0, 30)}`,
              width: parseFloat(css.outlineWidth),
              style: css.outlineStyle,
              visible: el.getBoundingClientRect().width > 0,
            };
          });
          if (!ring) break;
          stops++;
          expect(ring.style, `outline style on ${ring.label}`).not.toBe("none");
          expect(ring.width, `outline width on ${ring.label}`).toBeGreaterThanOrEqual(2);
          expect(ring.visible, `${ring.label} is on screen`).toBe(true);
        }
        expect(stops).toBeGreaterThan(0);
      });

      test(`${screen.name}: no running animation or transition under reduced motion`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await visit(page, screen, mode);
        const moving = await page.evaluate(() => {
          const running = document.getAnimations().length;
          const timed = [...document.querySelectorAll("*")].filter((el) => {
            const css = getComputedStyle(el);
            const seconds = (list: string) => list.split(",").some((t) => parseFloat(t) > 0);
            return (
              (css.transitionProperty !== "none" && seconds(css.transitionDuration)) ||
              (css.animationName !== "none" && seconds(css.animationDuration))
            );
          }).length;
          return { running, timed };
        });
        expect(moving).toEqual({ running: 0, timed: 0 });
      });

      for (const width of [390, 360]) {
        test(`${screen.name}: no sideways scroll at ${width} px`, async ({ page }) => {
          await page.setViewportSize({ width, height: 844 });
          await visit(page, screen, mode);
          const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
          expect(wide).toBeLessThanOrEqual(0);
        });
      }
    }
  });
}

test("the board is light on a first visit, and the switch moves it to dark and system and keeps it", async ({
  page,
}) => {
  await stubBoard(page);
  await page.goto(`${BASE}account`);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const theme = page.getByRole("radiogroup", { name: "Theme" });
  await theme.getByRole("radio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await theme.getByRole("radio", { name: "System" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "system");
  await theme.getByRole("radio", { name: "Light" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("nothing scrolls sideways at the folds: 1240, 1100, 1099, 720, 719 and 360", async ({ page }) => {
  for (const width of [1240, 1100, 1099, 720, 719, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await stubBoard(page);
    await page.goto(BASE);
    await page.getByRole("button", { name: "shelfmark-31: Search results page" }).first().waitFor();
    const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(wide, `${width} px`).toBeLessThanOrEqual(0);
  }
});
