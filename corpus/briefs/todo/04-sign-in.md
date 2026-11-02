# Task 04: Sign-in for the browser: a local account, and Sign in with Ward

## Context

On the VPS the board shows every project's brief titles and comments. On
2026-11-02 the owner chose to put it behind sign-in like the estate's other
apps: "Sign in with Ward", plus a username and password kept in the board's
own SQLite, so the board still opens when Ward is down.

Almanac is the model, so copy its shape:

- the vendored `ward-auth` 0.3.1 in `server/vendor/ward/`: the server bundle,
  the React hooks, the README and the LICENSE;
- `wardAuth` registered first in `server/src/app.ts`, as the one guard;
- accounts from `createAccounts` with the SQLite store;
- `server/src/config.ts` validating `PUBLIC_ORIGIN`, the `WARD_OIDC_*`
  settings and `AUTH_TRUSTED_PROXIES`;
- `server/src/seed.ts`, which makes an account inside the container;
- a login page in the web app.

The UI stays read-only ([decisions.md](../../wiki/decisions.md), "The UI is
read-only"). Sign-in adds a login page, an account page and sign-out, and no
buttons on cards. There is no register page. Who gets in through Ward is
decided by grants in Ward's console, an owner step in brief 05. Every
signed-in user sees the whole board, and there are no per-user boards.

Depends on 02 (the paths) and 03 (the token).

## Files you OWN

- `server/vendor/ward/` (new, copied from almanac's), `server/src/app.ts`,
  `server/src/config.ts` (new), `server/src/index.ts`, `server/src/seed.ts`
  (new), `server/src/db.ts` (only if the accounts' tables need it; almanac
  lets the vendored SQLite store create them), `server/package.json` (a
  `seed` script),
  `server/src/*.test.ts`
- `web/src/`: the login page, the account page, sign-out, and the 401
  handling in `api.ts` and `App.tsx`. Also `web/vite.config.ts` (the dev
  port).
- `.env.example` (new), `README.md` ("Run it locally"), `cli/src/cli.test.ts`
  (only to give its test server a token)
- In wzd_auth: `infrastructure/local/seed.mjs` and
  `infrastructure/local/README.md`
- `corpus/wiki/architecture.md`, `corpus/wiki/decisions.md`,
  `corpus/wiki/status.md`

## Files you must NOT touch

`shared/` beyond what the auth routes need, `cli/src` apart from its tests,
and anything in vps-deploy (that's brief 05).

## What to do

1. **One guard.** Register `wardAuth` before any route, with cookie
   `brief_board_session`, cookie path `/brief-board-api` (the browser-visible
   prefix, from `BRIEF_BOARD_API_PREFIX` with that default) and route prefix
   `/auth`. Pass `loginPath: "/brief-board/login"`, `settingsPath:
   "/brief-board/account"` and `afterSignInPath: "/brief-board/"`. Its
   `isPublic` lets through `GET /api/health`, and any `/api/*` request
   carrying brief 03's bearer token, checked by the same constant-time
   compare. Brief 03's separate check goes away, so no route authenticates
   itself. When no token is configured, the bearer path is closed, not open.
2. **Sessions only read.** A session cookie may only `GET` under `/api`, and
   only the CLI's token can write. Use a `validateSession` validator that
   returns `{ ok: false, reason: "read_only_session" }` without `endSession`
   for any other method under `/api`. That refuses the request and keeps the
   user signed in; see `SessionVerdict` in `ward-auth.d.ts`. The validator
   also runs on `GET /auth/session`, so match on the `/api` path. On a shared origin, a script running in another app
   could send the owner's cookie. This keeps the worst case at reading the
   board. The `/auth/*` routes are not affected.
3. **Ward is optional.** With no `WARD_OIDC_*` settings, only local accounts
   work and the login page shows no Ward button, as in almanac. Config
   problems stop the server at start with a message naming the variable.
   Today `index.ts` reads `process.env` only. Load the repo root's `.env`
   with `process.loadEnvFile` in `index.ts` and `seed.ts`, as almanac does,
   so that the values Ward's local seed writes there take effect.
4. **Seed.** Run with `npm run seed -w @brief-board/server`, and in the
   container with `node server/dist/seed.js`. It takes `SEED_USERNAME` and
   `SEED_PASSWORD`, or prompts without echo. An existing user is left as it
   is.
5. **Web.**
   - A 401 from any request sends the browser to `/brief-board/login`
     instead of showing the API-down banner.
   - The login page has the username and password form, a "Sign in with
     Ward" button, and a message for `?ward_error=`.
   - The account page shows who is signed in, links a Ward account, and
     signs out.
   - Build these from the vendored React hooks, use Base UI for any widget
     (decisions.md), and put the styles in `styles.css`.
   - Run Vite dev on port 5178 with `strictPort`.
6. **Local Ward.** Add `{ slug: "brief-board", name: "brief-board", repo:
   "brief-board", envFiles: [".env"], dev:
   "http://localhost:5178/brief-board/", api: "/brief-board-api" }` to `APPS`
   in wzd_auth's `infrastructure/local/seed.mjs`, and its row to that
   folder's README. Commit that in wzd_auth on `main`, one commit, no push.
   Don't run the seed.
7. **`.env.example`.** List every variable the server reads, with
   placeholders and no real values. A comment says `BRIEF_BOARD_TOKEN` and
   `WARD_OIDC_CLIENT_KEY` are secrets.
8. **Tests.**
   - Signed out, `/api/board` is a 401.
   - A local sign-in reads the board.
   - A session `PUT`, `POST` and `/api/sync` are refused.
   - The bearer token still reads and writes.
   - Health is open.
   - The CLI tests pass with a token on their server.
9. **Decision.** Add a `decisions.md` entry, "On the VPS at /brief-board,
   behind sign-in like the other apps", dated 2026-11-02. Rejected
   alternatives:
   - open to anyone, which makes every brief title public;
   - Ward only, which locks the board whenever Ward is down;
   - a host of its own, which needs a DNS record and keeps cookies off the
     shared origin, a gain the read-only sessions make small.

## Acceptance

- `npm run typecheck && npm run lint && npm run test && npm run build` pass.
- Locally, against a scratch database and a seeded test account, `/brief-board/` sends you to the
  login page, and signing in shows the board.
- If the local Ward container is up, "Sign in with Ward" works after the
  local seed. Otherwise the hand-back says it was not tried.
- No password, token or key in any file.
- `bash corpus/lint.sh` passes.
