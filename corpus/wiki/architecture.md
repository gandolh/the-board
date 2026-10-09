---
summary: How brief-board is put together, as built. npm workspaces with a Fastify + SQLite API, a read-only Vite + React board, and the brief-board CLI that agents use; how the CLI finds the board without any repo holding a path; what each project's CLAUDE.md says. Sync runs by hand from the CLI. The owner starts the server by hand on 127.0.0.1:8806.
updated: 2026-10-09
---

# Architecture

Built by briefs 01 to 08 (2026-10-09). Code: `shared/src/` (statuses, the
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

## Sync

`brief-board sync` runs on this machine, in the CLI, and only when someone runs
it. It reads the briefs in every project under the projects directory, which
defaults to `~/projects` and is set in the user-level config. It pushes the
result to the API in one request, so it works the same after the VPS move.

## Running it

The owner starts the server by hand with `npm start`. It listens on
127.0.0.1:8806 and serves the API and the built UI from one origin. The
database is a SQLite file in the gitignored `data/` directory. Nothing restarts
the server; a down board never stops agent work, see
[decisions.md](decisions.md). The UI polls the API, and the Done column shows
the last 14 days. Lanes with nothing open start collapsed.
