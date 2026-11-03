---
summary: How the board decides who gets in, as built 2026-11-02 and moved to ward-auth 0.7.0 on 2026-11-03. The vendored plugin as the one guard, its rename route off; a local account from the seed or Sign in with Ward; the CLI's bearer token; read-only browser sessions (read_only_session); the 401 rewritten into the API's error shape; the settings in config.ts and .env; the login and account pages; and how the local Ward check went.
updated: 2026-11-03
---

# Sign-in

Why the board is behind sign-in at all is in [decisions.md](decisions.md)
("On the VPS at /brief-board, behind sign-in like the other apps" and "The
CLI authenticates with one shared token"). The code wins where this page and
it disagree.

## The guard

`server/src/app.ts` registers the vendored `wardAuth` plugin
(`server/vendor/ward/`, ward-auth 0.7.0, vendored from `wzd_auth` on
2026-11-03; it was 0.3.1, copied from almanac) before any
route, so no route authenticates itself:

- cookie `brief_board_session`, path `/brief-board-api` (the browser-visible
  prefix, `BRIEF_BOARD_API_PREFIX`), auth routes under `/auth`;
- `GET /api/health` is in `publicRoutes`, for the deploy's check;
- `isPublic` lets an `/api/*` request through when it carries the CLI's
  `Authorization: Bearer <token>`, compared as SHA-256 digests with
  `timingSafeEqual`; with no `BRIEF_BOARD_TOKEN` that path is closed. Paths
  outside `/api` and `/auth` (the board's files, the `/` redirect, a 404) are
  public, so the login page loads. Under `/auth` the plugin's own list
  decides;
- `validateSession` refuses any method but GET and HEAD under `/api` with
  `{ ok: false, reason: "read_only_session" }`, without `endSession`: the
  request fails and the session stays. A script in another app on the
  shared origin could send the owner's cookie; this keeps the worst case at
  reading the board. Every write is the CLI's, with the token;
- `allowRename: false` turns off the library's `POST /auth/username`, on by
  default since 0.4.0. It sits under `/auth`, outside the read-only rule
  above, so a session could otherwise rename itself; the board offers no
  rename and the seed matches accounts by name.

The plugin answers a refusal with `{ error: "unauthorized" }`. An `onSend`
hook rewrites a 401 under `/api` into the API's shape, `{ code:
"unauthorized", message, reason? }`, so the CLI still prints "the board
refused the token" and exits 3. The `/auth/*` bodies stay the plugin's, for
the React hooks.

## Accounts and Ward

`accounts.ts` opens the accounts on the board's own SQLite file; the library
keeps its tables (`auth_*`) and never touches the board's `user_version`.
There is one role, `user`, and nothing checks it: every signed-in user sees
the whole board. There is no sign-up route. `npm run seed -w
@brief-board/server` (or `node server/dist/seed.js` in the container) makes an
account from `SEED_USERNAME` and `SEED_PASSWORD`, or asks without echo, and
leaves an existing one alone.

"Sign in with Ward" turns on when `WARD_OIDC_ISSUER` and the other four
`WARD_OIDC_*` values are set; a first Ward sign-in makes a user. Without them
only local accounts work and the login page has no Ward button.

## Settings

`config.ts` reads the environment, after `index.ts` (and `seed.ts`) load the
repo root's `.env` for whatever the environment leaves unset; `.env.example`
lists every variable. A bad value stops the start with a message naming each
variable at fault: a `PUBLIC_ORIGIN` with a path, a token under 32
characters, Ward settings half set, a Ward redirect URI that isn't
`<origin>/brief-board-api/auth/ward/callback`. `PUBLIC_ORIGIN` defaults to
the Vite dev server, `http://localhost:5178`; `npm start` on its own port
needs `http://127.0.0.1:8806`, or the plugin refuses the login as cross-site.

## The board's pages

`web/src/AuthGate.tsx` wraps the board on the vendored React hooks
(`web/vendor/ward/`, the same 0.7.0 copy): loading, the login page when
signed out (the address becomes `/brief-board/login`), the board or the
account page when signed in. `route.ts` is a three-page router: board,
`login`, `account`. A 401 from `api.ts` asks the hooks about the session
again and the gate swaps to the login page; the polling doesn't count it as
the API being down. The account page shows who is signed in and how, offers
"Link Ward" when Ward is on and unlinked, and signs out. No buttons on cards:
the board still only reads.

## The local Ward check (2026-11-02)

Ward's local seed lives in `wzd_auth`, which the build run that made this
could only read, so brief-board isn't in its `APPS` yet (an owner step in
[status.md](status.md)). The check used a scratch copy of `seed.mjs` with only
brief-board in `APPS`, writing its `.env` outside the repo. The login page at
`http://localhost:5178/brief-board/` showed "Sign in with Ward"; it led to
Ward's login page saying "Continue to brief-board", and "Back to
brief-board" came back through the callback to the login page with the
`access_denied` message. A full Ward sign-in needs a Ward account's password
and wasn't done. Local Ward now has a `brief-board` app and client whose
private key was in that scratch file; the real seed mints a new one beside
it.
