import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The board lives at `/brief-board/` and reaches the API at
 * `/brief-board-api`, locally and on the VPS alike, so one build runs in both
 * places. `BRIEF_BOARD_BASE` moves the board (vps-deploy passes it); the API
 * path is fixed in src/base.ts.
 *
 * In dev the board runs on Vite's own server and reaches the API through
 * this proxy, which strips the prefix the way Caddy does, so the browser sees
 * one origin, as it does when the server serves the built board.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, REPO_ROOT, "");
  const rawBase = process.env.BRIEF_BOARD_BASE || env.BRIEF_BOARD_BASE || "/brief-board/";
  // Assets and the server's fallback both assume exactly one trailing slash.
  const base = `${rawBase.replace(/\/+$/, "")}/`;

  return {
    base,
    plugins: [react()],
    server: {
      proxy: {
        "/brief-board-api": {
          target: "http://127.0.0.1:8806",
          rewrite: (url) => url.replace(/^\/brief-board-api(?=\/|\?|$)/, "") || "/",
        },
      },
    },
  };
});
