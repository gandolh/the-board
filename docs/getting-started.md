# Getting started

These are the owner's steps. `npm link` installs a command globally, so no agent runs it.

## Prerequisites

- Node 24 or later
- A projects folder whose repos keep briefs in `corpus/briefs/{todo,done,superseded}/` (defaults to `~/projects`); a repo can sit directly in it or one group folder down (`apps/<repo>`)

## 1. Build

From this repo:

```bash
npm install
npm run build
```

Rebuild after pulling changes; the linked command runs `cli/dist/`.

## 2. Put `brief-board` on your PATH

```bash
cd cli && npm link
which brief-board        # prints a path
brief-board --version
```

## 3. Start the board

From this repo, once:

```bash
cp .env.example .env                  # fill BRIEF_BOARD_TOKEN, and PUBLIC_ORIGIN=http://127.0.0.1:8806
npm run seed -w @brief-board/server   # your account; asks for a username and password
```

Then:

```bash
npm start
```

It serves the board on <http://127.0.0.1:8806/brief-board/> and the API under `/api` on the same port, and keeps its data in `data/brief-board.sqlite` (gitignored). The board asks you to sign in. The server reads `.env` for whatever its environment leaves unset; `.env.example` lists every variable.

| Variable | Default | Purpose |
|---|---|---|
| `HOST` | `127.0.0.1` | Address the server listens on |
| `PORT` | `8806` | Port the server listens on |
| `BRIEF_BOARD_DB` | `data/brief-board.sqlite` | SQLite file to use |
| `BRIEF_BOARD_TOKEN` | unset (the CLI is shut out) | The CLI's shared token; at least 32 characters (`openssl rand -base64 32`). Every `/api` call but `/api/health` needs it or a signed-in browser |
| `BRIEF_BOARD_STALE_HOURS` | `4` | Hours without a write on its ticket before a run reads as stale |
| `PUBLIC_ORIGIN` | `http://localhost:5178` | The board's origin as the browser sees it; sign-in from any other is refused |
| `WARD_OIDC_*` | unset (local accounts only) | "Sign in with Ward"; Ward's local seed writes them |

## 4. Configure the CLI (optional)

Create `~/.config/brief-board/env` to change the defaults:

```
BRIEF_BOARD_URL=http://127.0.0.1:8806
BRIEF_BOARD_PROJECTS_DIR=~/projects
```

The CLI looks for `BRIEF_BOARD_URL` in the environment, then the current repo's `.env`, then that file, then the default.

If the server runs with `BRIEF_BOARD_TOKEN`, add the same value to this file (or the CLI's environment) as `BRIEF_BOARD_TOKEN=<token>`. The CLI reads the token from those two places only, never from a repo's `.env`. Without it, or with a wrong one, every command prints "the board refused the token" and exits 3.

## 5. Fill the board

```bash
brief-board sync
```

Run it again whenever the board looks stale; nothing runs it on a schedule.

## When the board is down

Agents check for it, tell you once, and carry on with the brief without it. `brief-board sync` later puts back what the corpus knows. Every project's CLAUDE.md tells its agents to run `brief-board guide`, which prints the rules.

## Developing

```bash
npm run dev        # API on :8806 and the board at http://localhost:5178/brief-board/, proxying /brief-board-api
npm test
npm run typecheck
npm run lint
```
