import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type ProxyOptions } from "vite";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The board lives at `/brief-board/` and reaches the API at
 * `/brief-board-api`, locally and on the VPS alike, so one build runs in both
 * places. `BRIEF_BOARD_BASE` moves the board (vps-deploy passes it); the API
 * path is fixed in src/base.ts.
 *
 * In dev the board runs on Vite's server at http://localhost:5178/brief-board/
 * and reaches the API through this proxy, which strips the prefix the way
 * Caddy does, so the browser sees one origin. The session cookie and the
 * auth routes, Ward's callback included (`/brief-board-api/auth/ward/callback`),
 * ride on that one rule.
 *
 * The server refuses a sign-in whose `Origin` isn't its PUBLIC_ORIGIN
 * (`http://localhost:5178` by default). So a request whose `Origin` is exactly
 * the address the browser opened this server at (its `Host`) reaches the API
 * with PUBLIC_ORIGIN instead. Any other `Origin` passes through untouched and
 * is refused, as in production, where there is no Vite.
 */
function devProxy(env: Record<string, string>): Record<string, ProxyOptions> {
  const publicOrigin = env.PUBLIC_ORIGIN || "http://localhost:5178";
  return {
    "/brief-board-api": {
      target: `http://127.0.0.1:${env.PORT || 8806}`,
      rewrite: (url) => url.replace(/^\/brief-board-api(?=\/|\?|$)/, "") || "/",
      configure: (proxy) => {
        proxy.on("proxyReq", (proxyReq, req) => {
          const { origin, host } = req.headers;
          if (typeof origin === "string" && typeof host === "string" && origin === `http://${host}`) {
            proxyReq.setHeader("origin", publicOrigin);
          }
        });
      },
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, REPO_ROOT, "");
  const rawBase = process.env.BRIEF_BOARD_BASE || env.BRIEF_BOARD_BASE || "/brief-board/";
  // Assets and the server's fallback both assume exactly one trailing slash.
  const base = `${rawBase.replace(/\/+$/, "")}/`;

  return {
    base,
    plugins: [react()],
    server: { port: 5178, strictPort: true, proxy: devProxy(env) },
    preview: { port: 4178, strictPort: true, proxy: devProxy(env) },
  };
});
