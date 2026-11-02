# Task 02: The board at /brief-board/, the API at /brief-board-api

## Context

On 2026-11-02 the owner chose a sub-path on the main domain over a host of
its own for the VPS board: no DNS record to add, and the same shape as
almanac and shelfmark. In production Caddy serves the built board from
`/brief-board/` and forwards `/brief-board-api/*` to the container with the
prefix stripped (`handle_path`). The server sees bare `/api/*`, plus
`/auth/*` after brief 04.

Today the board assumes it sits at the root. `web/vite.config.ts` has no
`base`, `web/src/api.ts` fetches `/api/...`, and the server answers every
path outside `/api` with the board's `index.html`.

Use the same paths locally as in production, so one build runs in both
places. Almanac is the model: its `web/src/base.ts`, and `ALMANAC_BASE` in
its `web/vite.config.ts`.

## Files you OWN

- `web/vite.config.ts`, `web/src/api.ts`, `web/src/base.ts` (new), and
  `web/index.html` if it links assets from the root
- `server/src/app.ts`, the static serving and the URL rewrite only;
  `server/src/app.test.ts`
- `README.md`, the "Run it locally" lines only
- `corpus/wiki/architecture.md` ("Server", "Board UI", "Running it")

## Files you must NOT touch

`cli/`, `shared/`. The CLI needs no change: it calls `${BRIEF_BOARD_URL}/api/...`,
so production sets `BRIEF_BOARD_URL` to `<production origin>/brief-board-api`
and the local default keeps working.

## What to do

1. **Vite base** from `BRIEF_BOARD_BASE`, default `/brief-board/`, with one
   trailing slash. vps-deploy's stack passes it as `baseEnv` (brief 05).
2. **One API base.** `web/src/base.ts` exports `API_BASE =
   "/brief-board-api"`, and `api.ts` builds every request from it.
3. **Dev proxy.** In `vite.config.ts`, proxy `/brief-board-api` to
   `http://127.0.0.1:8806` and strip the prefix, the way Caddy does.
4. **Server.** Strip a leading `/brief-board-api` from the request URL with
   Fastify's `rewriteUrl`, but only when `/` or the end of the path follows
   it. The same server then answers behind Caddy, where the prefix is
   already gone, and on its own. Serve the built board under
   `/brief-board/`, with the SPA fallback there, and redirect `/` to
   `/brief-board/`. Under `/api`, an unknown path stays a 404 in the error
   shape.
5. **Tests.** `/brief-board-api/api/health` and `/api/health` both answer.
   `/brief-board/anything` gets `index.html`. `/brief-board-apix/api/health`
   is not stripped.
6. **Docs.** In `architecture.md`, the paths under "Server", "Board UI" and
   "Running it". In the README, the board's local address becomes
   `http://127.0.0.1:8806/brief-board/`.

## Acceptance

- `npm run typecheck && npm run lint && npm run test && npm run build` pass.
- After `npm start`, `http://127.0.0.1:8806/brief-board/` shows the board,
  its assets load from `/brief-board/assets/`, and `brief-board list` still
  works against the default address.
- `npm run dev` shows the board through Vite's proxy.
- `bash corpus/lint.sh` passes.
