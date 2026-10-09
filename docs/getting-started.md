# Getting started

These are the owner's steps. `npm link` installs a command globally, so no agent runs it.

## Prerequisites

- Node 24 or later
- A projects folder whose repos keep briefs in `corpus/briefs/{todo,done,superseded}/` (defaults to `~/projects`)

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

From this repo:

```bash
npm start
```

It serves the API and the board on <http://127.0.0.1:8806> and keeps its data in `data/brief-board.sqlite` (gitignored). Nothing restarts it.

| Variable | Default | Purpose |
|---|---|---|
| `HOST` | `127.0.0.1` | Address the server listens on |
| `PORT` | `8806` | Port the server listens on |
| `BRIEF_BOARD_DB` | `data/brief-board.sqlite` | SQLite file to use |

## 4. Configure the CLI (optional)

Create `~/.config/brief-board/env` to change the defaults:

```
BRIEF_BOARD_URL=http://127.0.0.1:8806
BRIEF_BOARD_PROJECTS_DIR=~/projects
```

The CLI looks for `BRIEF_BOARD_URL` in the environment, then the current repo's `.env`, then that file, then the default.

## 5. Fill the board

```bash
brief-board sync
```

Run it again whenever the board looks stale; nothing runs it on a schedule.

## When the board is down

Agents check for it, tell you once, and carry on with the brief without it. `brief-board sync` later puts back what the corpus knows. Every project's CLAUDE.md tells its agents to run `brief-board guide`, which prints the rules.

## Developing

```bash
npm run dev        # API on :8806 and the board on Vite's dev server, proxying /api
npm test
npm run typecheck
npm run lint
```
