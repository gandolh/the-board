# brief-board

A Jira-style board showing where every corpus brief stands across all the projects in `~/projects`, so the owner can see at a glance what each agent is doing and what is waiting for them.

<p align="center">
  <img src="docs/images/board.webp" width="100%" alt="The board: one lane per project (garden-planner, photo-archive, recipe-box) across six columns from To Do to Done, with one ticket blocked">
</p>

**Status:** Personal tool, built 2026-10-09 and in use. Since 2026-11-02 it is set up to run on the owner's VPS at `/brief-board/` behind sign-in (a local account, or "Sign in with Ward"), and locally for development. Putting it there is in [docs/owner-setup.md](docs/owner-setup.md).

## What it does

- Shows one lane per project and seven columns: Backlog (one ticket per open todo, kept by sync), To Do, In Progress, Blocked, Ready for test, Ready for deploy, Done.
- Lets agents create and move tickets with the `brief-board` command, with a required reason when they block a ticket or hand it to the owner.
- Keeps comments and history on each ticket, so a later session can see what the last one did.
- Rebuilds itself from the projects' corpora with `brief-board sync`, so losing the board loses nothing.

The corpus in each project stays the source of truth: a ticket holds a summary and a path to its brief, never a copy of the spec. The board is read-only in the browser, and the owner tells an agent what to move. It is not a general task tracker.

## Screenshots

| A blocked ticket, with its reason and history |
|---|
| ![Detail panel for recipe-box-03 "Offline mode": status Blocked, the brief path, a summary, the block reason "Needs a decision: cache images too, or text only?" and the move history](docs/images/ticket-detail.webp) |

## How it works

Four npm workspaces. `shared` defines the statuses, the allowed moves and the API contract. `server` is a Fastify API on 127.0.0.1 backed by SQLite; it enforces the moves and serves the built board. `web` is the read-only React board, which polls the API. `cli` is the `brief-board` command that agents use. More in [docs/architecture.md](docs/architecture.md).

```bash
brief-board start 3 -m "Starting with the parser."     # To Do → In Progress
brief-board move 3 blocked -m "Needs a decision: X or Y?"
brief-board list
```

## Run it locally

Requires Node 24 or later.

```bash
npm install
cp .env.example .env               # then fill BRIEF_BOARD_TOKEN, and PUBLIC_ORIGIN for npm start
npm run seed -w @brief-board/server   # your local account; asks for a username and password
npm run build
npm start          # board on http://127.0.0.1:8806/brief-board/, API under /api
```

The board sits behind sign-in: a local account from the seed, or "Sign in with Ward" when Ward's local seed has written the `WARD_OIDC_*` values into `.env`. `npm start` needs `PUBLIC_ORIGIN=http://127.0.0.1:8806` in `.env`; `npm run dev` serves the board at <http://localhost:5178/brief-board/> and needs nothing extra.

The CLI gets in with a shared token. Make one with `openssl rand -base64 32`, put it in `.env` as `BRIEF_BOARD_TOKEN`, and put the same `BRIEF_BOARD_TOKEN=<token>` in `~/.config/brief-board/env` for the CLI. Never put it in another repo's `.env`. Without a token the CLI is shut out.

Then put the CLI on your PATH, fill the board, and point agents at it: [docs/getting-started.md](docs/getting-started.md).

## Docs

- [docs/](docs/README.md): setup, architecture and the images used here
- [docs/owner-setup.md](docs/owner-setup.md): putting the board on the VPS, step by step
- [Project wiki](corpus/index.md): decisions, glossary, status and the briefs that built it
- `brief-board guide` prints the rules agents follow

## License

[MIT](LICENSE)
