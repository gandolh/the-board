# brief-board

One board for every corpus brief across the estate: a Fastify + SQLite API, a
read-only React board, and the `brief-board` CLI agents use. Read
[corpus/index.md](corpus/index.md) first.

## Commands

- `npm run dev`: the API on 8806 and the board on Vite's 5178.
- `npm run check`: typecheck, lint, format check, conventions, tests. Run it
  before every hand-back.
- `npm run check:fast`: the typecheck, then ESLint on the changed files. The
  Stop hook runs it.
- `npx vitest run <file>`: one test file.
- `npm run format`: Prettier writes every file it covers (Markdown stays out).
- `npm run seed -w @brief-board/server`: a local account.

## Places that mislead

- `shared` is consumed through `shared/dist`. `pretest` and `dev` build it; a
  bare `vitest` on a fresh clone does not.
- The typecheck is two runs: `tsc -b` (shared, server, cli), then
  `tsc -p web --noEmit`. `tsc -b` also rebuilds `cli/dist`, which the global
  `brief-board` command runs from.
- `.env` sits at the repo root, not in a workspace.
- `scripts/seed-demo.ts` sends no token and gets a 401
  ([corpus/wiki/status.md](corpus/wiki/status.md), "Open"). Seed a scratch board
  with `brief-board sync` instead ([docs/images/shots.md](docs/images/shots.md)).
- `vendor/house-style/`, `server/vendor/` and `web/vendor/` are generated copies.
  Never edit them; `npm run house-style:sync` refreshes the first.

## Hard rules

- **No secrets.** Never write a password, token or key into the corpus or the
  repo. Name a secret by its file and key, never by its value.
- **No CI.** Don't add GitHub Actions, runners or other GitHub-specific
  automation.
- **No pushes.** Commit locally. The owner pushes.
- **Deploys and git hooks are owner steps.** Write the exact commands down and
  hand them over.

## brief-board

Brief progress goes on brief-board. Run `brief-board guide` before you
start or resume a brief, and follow it.
