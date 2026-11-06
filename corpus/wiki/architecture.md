---
summary: How brief-board is put together, as built 2026-10-09, with the 2026-11-02 sub-path, token and sign-in, the 2026-11-03 todo keys, and the 2026-11-06 runs and their holds. npm workspaces with a Fastify + SQLite API, a read-only Vite + React board, and the brief-board CLI that agents use; how the CLI finds the board without any repo holding a path; keys, the CLI's exit codes, the server's error codes, how the board UI polls and lays out, build gotchas, and what each project's CLAUDE.md says. The owner starts the server by hand on 127.0.0.1:8806.
updated: 2026-11-06
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

The token (since 2026-11-02, [decisions.md](decisions.md)) is
`BRIEF_BOARD_TOKEN` in the environment, else in `~/.config/brief-board/env`;
never a repo's `.env`, since a secret shouldn't sit in every repo. With one,
the CLI sends `Authorization: Bearer <token>` on every request. A 401
(`unauthorized`) prints "the board refused the token" and exits 3, like a
board that can't be reached, so agents follow the guide's "board is down"
section. The server reads `BRIEF_BOARD_TOKEN` (empty is unset, shorter than
32 characters refuses to start); every `/api/*` route but `GET /api/health`
needs it or a signed-in browser, and with no token the CLI is shut out
([sign-in.md](sign-in.md)). Moving the board to the VPS means changing the
address in the user-level file and adding the token there. No other repo
holds a path to brief-board.

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

A todo's ticket (2026-11-03) is `<project>:<slug>`, the todo's file name
without `.md`; a colon is outside a brief key's alphabet, so `parseKey` turns
it down whatever the slug ends in, and `parseTodoKey` reads it. The ticket
routes take either form (`ticketKeySchema`), and such a ticket's `number` is
null. The CLI sends a key with `encodeURIComponent`; the server reads the
colon raw or as `%3A`.

## CLI

`create`, `start`, `move`, `comment`, `release`, `hold`, `drop`, `answer`,
`show`, `list`, `runs`, `questions`, `needs`, `sync` and `guide`. The project is `--project`, else
the `corpus/board-name` of the nearest `corpus/` from the working directory
up to the git root (2026-11-03, for a nested corpus such as churchix), else
the git root's directory name; `create` looks for the brief in that same
corpus. The author is `--author`, else `BRIEF_BOARD_AUTHOR`, else `agent`.

- `move` and `start` fetch the ticket and run the shared move check locally
  first, so an agent learns the table from the CLI before the board refuses.
- Runs (2026-11-06): `start` posts to `/api/tickets/:key/start`, which moves
  the ticket or, on a resume, passes the open run to the new author; the CLI
  warns on stderr when that run was fresh and someone else's. `release` ends
  a stopped agent's run; `runs` lists the open ones, stalest first. `hold`
  and `drop` keep a run's holds; a clash with another open run warns, exit 0.
- Questions (2026-11-06): `--question`, repeatable, on `start`, `move` and
  `comment`. `answer` checks locally that the question is open; a closed or
  unknown number exits 1 naming the open ones.
- A status may be given as the id, hyphenated, or the label
  (`ready_for_test`, `ready-for-test`, "Ready for test").
- Exit codes (`cli/src/main.ts`): 0 success, 1 a usage mistake, 2 the board
  or the local check refused (with the allowed moves and their messages), 3
  the board is unreachable, printed as one line. A 4xx that isn't the
  contract's JSON (another service on the port) counts as unreachable.
- `guide` prints `cli/src/guide.md` with the move table filled in from
  `shared` at print time; a test holds it under 115 lines (80 until runs,
  the controller's section, the report lines and holds came in on 2026-11-06).

## Server

`server/src/`: `db.ts` (schema, `user_version` migrations), `store.ts`,
`sync.ts` and `app.ts` (`buildApp({ dbPath })`, which tests call with
`:memory:`). Author defaults to `agent`; tags are replaced on every `PUT`,
deduplicated, and never include the project. A `PUT` that creates answers
201. Error codes: `invalid_request`, `invalid_key`, `not_found`,
`move_not_allowed`, `message_required`, `sync_owned` (a write on a todo's
ticket, 2026-11-03), `no_open_run`, `question_not_open` and `not_held` (2026-11-06),
`internal`, and `unauthorized` (a 401 from the sign-in guard,
[sign-in.md](sign-in.md)). Migrations run with foreign keys off, because
rebuilding `tickets` (copy, drop, rename, as SQLite changes a CHECK) would
otherwise cascade the drop into every comment and history row; each checks
the keys before it commits. Since 2026-11-02 the vendored `wardAuth` plugin
is the one guard in front of every route; `config.ts` reads the settings.

Runs and questions (2026-11-06) are tables of their own. A ticket has at
most one open run (a partial unique index); `Store` opens it on any move into
In Progress and ends it on any move out, the comment, `PUT` and start routes
set its last-heard time, and sync's writes don't. Stale is worked out on
read from `BRIEF_BOARD_STALE_HOURS` (default 4). A release, a stale end or an
answer is not a status change and leaves no history row; the record and a
comment carry it. A ticket carries its latest run and its count of open
questions; sync never touches questions. Holds are rows keyed by run: those
left when it ends stay on it as leftovers, and the board's tickets omit them.

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

`web/src/`; `api.ts` holds the only requests, three GETs (the board, a
ticket, and since 2026-11-06 what needs the owner, for the strip above the
lanes that narrows the board to one kind at a click), built from
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

On the VPS (since 2026-11-02, not yet deployed) the API is the
`brief-board-api` container from `infrastructure/`, on loopback port 8806 with
its database in a bind-mounted `/data`, restarted by Docker; Caddy serves the
built board at `/brief-board/` and forwards `/brief-board-api/*` to it.
vps-deploy's `brief-board` stack builds and ships both, and the owner's steps
are in `docs/owner-setup.md`. The CLI points there with `BRIEF_BOARD_URL` and
the token in `~/.config/brief-board/env`.

Locally the owner starts the server by hand with `npm start`. It listens on
127.0.0.1:8806 and serves the API and the built UI from one origin: the
board at `http://127.0.0.1:8806/brief-board/`, the API at `/api` (and at
`/brief-board-api/api`, as the browser asks), behind sign-in: a local account
from `npm run seed -w @brief-board/server`, or Ward. Settings come from the
environment and the repo's `.env` (`.env.example` lists them); `npm start`
needs `PUBLIC_ORIGIN=http://127.0.0.1:8806`. `npm run dev` serves the board
from Vite at `http://localhost:5178/brief-board/` through its proxy. The
database is a SQLite file in the gitignored `data/` directory. Nothing restarts
the local server; a down board never stops agent work, see
[decisions.md](decisions.md). The UI polls the API, and the Done column shows
the last 14 days. Lanes with nothing open start collapsed.
