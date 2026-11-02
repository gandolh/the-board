---
summary: How brief-board is put together, as built 2026-10-09. npm workspaces with a Fastify + SQLite API, a read-only Vite + React board, and the brief-board CLI that agents use; how the CLI finds the board without any repo holding a path; keys, the CLI's exit codes, the server's error codes, how the board UI polls and lays out, build gotchas, and what each project's CLAUDE.md says. The owner starts the server by hand on 127.0.0.1:8806.
updated: 2026-11-02
---

# Architecture

Built on 2026-10-09. Code: `shared/src/` (statuses, the
move table, keys, the API contract), `server/src/` (`app.ts`, `store.ts`,
`sync.ts`), `cli/src/` (`main.ts`, `commands/`, `sync/`, `guide.md`) and
`web/src/`.

## Pieces

The stack is the one the owner's other projects use. npm workspaces hold four
packages:

- `shared`: the status names, the allowed moves and the zod schemas, used by
  all three of the others.
- `server`: a Fastify API on 127.0.0.1 with better-sqlite3. It enforces the
  move rules and the required messages. It also serves the built UI.
- `web`: a Vite + React board. Read-only, see [decisions.md](decisions.md).
- `cli`: the `brief-board` command. It is the only client agents use.

## How agents reach the board

`npm link` in this repo puts `brief-board` on the owner's PATH. The CLI finds
the board address in this order:
1. `BRIEF_BOARD_URL` in the environment,
2. `BRIEF_BOARD_URL` in the current repo's `.env`,
3. `~/.config/brief-board/env`,
4. the local default.

Moving the board to the VPS later means changing the user-level file and
adding a token there. No other repo holds a path to brief-board.

The CLI works out the project tag from the name of the git root directory, so
repos need no setting for it.

## What other repos carry

Each project's CLAUDE.md gets a short section: track brief progress on
brief-board, and run `brief-board guide` before starting a brief. The section
goes in the root CLAUDE.md if the repo has one, otherwise in
`corpus/CLAUDE.md`. The rules themselves are printed by `brief-board guide`
and live only in this repo. See the guide entry in [glossary.md](glossary.md).

## Keys

`<project>-<NN>` (`shared/src/key.ts`). The key splits on the last
`-<digits>`, so a project may itself end in digits (`3D-sandbox-12`), and may
hold letters, digits, `.`, `_` and `-`. `keySchema` normalises the number to
two digits (`trips-4` is `trips-04`).

## CLI

`create`, `start` (a resume when the ticket is already In Progress), `move`,
`comment`, `show`, `list`, `sync` and `guide`. The project is the git root's
directory name; the author is `--author`, else `BRIEF_BOARD_AUTHOR`, else
`agent`.

- `move` and `start` fetch the ticket and run the shared move check locally
  first, so an agent learns the table from the CLI before the board refuses.
- A status may be given as the id, hyphenated, or the label
  (`ready_for_test`, `ready-for-test`, "Ready for test").
- Exit codes (`cli/src/main.ts`): 0 success, 1 a usage mistake, 2 the board
  or the local check refused (with the allowed moves and their messages), 3
  the board is unreachable, printed as one line. A 4xx that isn't the
  contract's JSON (another service on the port) counts as unreachable.
- `guide` prints `cli/src/guide.md` with the move table filled in from
  `shared` at print time; a test holds it under 80 lines.

## Server

`server/src/`: `db.ts` (schema, `user_version` migrations), `store.ts`,
`sync.ts` and `app.ts` (`buildApp({ dbPath })`, which tests call with
`:memory:`). Author defaults to `agent`; tags are replaced on every `PUT`,
deduplicated, and never include the project. A `PUT` that creates answers
201. Error codes: `invalid_request`, `invalid_key`, `not_found`,
`move_not_allowed`, `message_required`, `internal`.

Paths (since 2026-11-02, for the sub-path on the VPS): the API is `/api/*`.
The browser reaches it at `/brief-board-api/api/*`; Caddy strips that prefix
in production (`handle_path`), and the server strips it too with Fastify's
`rewriteUrl` (`stripApiPrefix`, only when `/`, `?` or the end follows it), so
one build answers behind Caddy and on its own, and the CLI's bare `/api`
keeps working. The built board is served at `/brief-board/`; any path under
it gets `index.html`, `/` and `/brief-board` redirect to `/brief-board/`,
and any other unknown path, `/api` included, is a 404 in the error shape.

## Sync

`brief-board sync` runs on this machine, in the CLI, and only when someone runs
it. It reads the briefs in every project under the projects directory and
pushes them to the API in one request, so it works the same after the VPS
move. The rules per brief state: [sync.md](sync.md).

## Board UI

`web/src/`; `api.ts` holds the only requests, both GETs, built from
`API_BASE` in `base.ts` (`/brief-board-api`). Vite's `base` is
`BRIEF_BOARD_BASE`, default `/brief-board/`, so assets load from
`/brief-board/assets/`; in dev, Vite proxies `/brief-board-api` to
127.0.0.1:8806 and strips the prefix as Caddy does. It polls every 10 s
(`POLL_MS`), pauses while the tab is hidden, and keeps the last data behind a
banner when the API is down. The tag filter works in the browser on the polled
board; the Blocked count and the tab title ("(1 blocked) brief-board") stay
board-wide. Below 1100 px each lane scrolls sideways on its own and shows its
own column names, since one sticky header row can't stay aligned with all of
them. Light and dark follow the system. Ticket markdown goes through
`react-markdown` with `skipHtml`.

Since 2026-10-23 the detail panel is a non-modal Base UI `Dialog` with
`disablePointerDismissal`, so clicking another card switches the ticket
instead of closing the panel. `App.tsx` keys it by ticket, so focus lands on
Close and Escape returns it to the card that opened it. The panel is named by
`aria-label="Ticket <key>"`, not `Dialog.Title`, so its name doesn't change
when the detail loads. Lanes are `Collapsible`s.

`scripts/seed-demo.ts` (plain `node`) fills a scratch board with three
made-up projects. It refuses a board holding any other project. No one ticket
can carry all six message roles, because a confirmation needs Blocked → Done,
so the seed spreads them over two.

## Build gotchas

- Each compiled package writes `tsconfig.tsbuildinfo` into its `dist/`. Left
  at the package root, deleting `dist/` kept the build info and `tsc -b`
  skipped the emit, so a "clean" build made no CLI.
- Tests compile with the rest, so `tsc -b` typechecks them; Vitest reads only
  `*/src/**`.
- The root `package.json` overrides `shell-quote` (pulled by `concurrently`)
  to 1.11.0 for a critical advisory, and Fastify sits above the 5.12.x
  releases `npm audit` flagged on 2026-10-09.

## Running it

The owner starts the server by hand with `npm start`. It listens on
127.0.0.1:8806 and serves the API and the built UI from one origin: the
board at `http://127.0.0.1:8806/brief-board/`, the API at `/api` (and at
`/brief-board-api/api`, as the browser asks). `npm run dev` serves the board
from Vite at `http://localhost:5173/brief-board/` through its proxy. The
database is a SQLite file in the gitignored `data/` directory. Nothing restarts
the server; a down board never stops agent work, see
[decisions.md](decisions.md). The UI polls the API, and the Done column shows
the last 14 days. Lanes with nothing open start collapsed.
