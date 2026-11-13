import { defineConfig } from "@playwright/test";

/**
 * The browser tests run against Vite alone, with every GET stubbed from `e2e/fixtures.ts` (a made-up
 * board, a frozen clock): no API, no account, nothing from a real board. Headless Chromium, two workers.
 */
export default defineConfig({
  testDir: "e2e",
  workers: 2,
  timeout: 30_000,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5191",
    locale: "en-US",
    timezoneId: "UTC",
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: "npx vite --port 5191 --strictPort",
    url: "http://localhost:5191/brief-board/",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
