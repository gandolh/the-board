# Task 03: API server

## Context

The server stores tickets and enforces the move rules. It implements the
contract in `shared/src/api.ts` (brief 02) and nothing beyond it. Agents reach
it only through the CLI (brief 04), and the read-only UI (brief 07) reads from
it.

Read [decisions.md](../../wiki/decisions.md) first, especially the move table,
"the corpus wins", and sync as the one exception to the table. The server
runs on this machine only, on 127.0.0.1, and has no sign-in.

## Files you OWN

```
server/src/**  server/package.json (dependencies only)
```

## Files you must NOT touch

`shared/` (if the contract is wrong, stop and say so rather than working
around it), `cli/`, `web/`, `corpus/`.

## What to do

1. **Storage.** better-sqlite3, at `BRIEF_BOARD_DB`, default
   `data/brief-board.sqlite` under the repo root. Create the directory if it's
   missing. Tables for tickets, tags, comments and history events. Version the
   schema with `PRAGMA user_version` and a list of migrations.
2. **App factory.** Export a `buildApp({ dbPath })` that tests can call with
   `:memory:`. `index.ts` only reads `HOST` (default `127.0.0.1`) and `PORT`
   (default `8806`) and listens. Keep serving `web/dist` at `/`, with
   non-`/api` paths falling back to `index.html`.
3. **Routes**, exactly as the contract defines them:
   - `PUT /api/tickets/:key` creates a ticket in To Do, or updates title,
     summary, briefPath and tags on an existing one without touching its
     status. Writes through this route set `summarySource` to `agent`.
   - `POST /api/tickets/:key/moves` runs `checkMove` from `shared`. A rejected
     move returns 400 with the error body and the allowed moves. A message
     sent with a move is stored as a comment with the row's role, and every
     move adds a history event. 404 for an unknown key.
   - `POST /api/tickets/:key/comments` adds a comment with no role.
   - `GET /api/tickets/:key` returns comments and history oldest first.
   - `GET /api/board` returns lanes alphabetically by project (the UI
     re-sorts them), leaving out hidden tickets and Done tickets whose status
     changed more than `doneDays` ago.
     A project with no visible tickets has no lane. `tag` filters to tickets
     carrying that label.
4. **Sync** (`POST /api/sync`). For each project in the payload, and only
   those:
   - A brief in `todo` with no ticket: create it in To Do with
     `summarySource: sync`.
   - A brief in `todo` with a ticket: update title and briefPath, and update
     the summary only if its source is `sync`. An agent's summary is never
     overwritten.
   - A brief in `done` whose ticket is To Do, In Progress or Blocked: set it
     to Done without the move table. Record a history event with
     `via: sync`, and add the comment "Closed by sync: the brief is in done/."
     with role `conclusion` and author `sync`. Leave tickets in Ready for
     test, Ready for deploy and Done alone, since the corpus can't say
     whether the owner tested or deployed.
   - A brief in `done` with no ticket: nothing. Sync does not backfill
     history.
   - A brief in `superseded` with a ticket: set `hidden`.
   - A ticket that is Done while its brief is in `todo`, or a ticket whose
     brief is missing from its project's payload: change nothing and return a
     warning.
   Run each sync in one transaction.

## Acceptance

- Fastify `inject` tests for:
  - every row of the move table, through the route,
  - the 400 and 404 bodies,
  - a create that runs twice and leaves one ticket,
  - an agent summary that sync doesn't overwrite,
  - each sync rule above,
  - the `doneDays` and `tag` filters.
- `npm run typecheck && npm run lint && npm test` pass.
- `npm run build && npm start` serves `/api/board` on 127.0.0.1:8806 against
  a file under `data/`.

## Outcome (2026-10-09)

Done. `server/src/`: `db.ts` (schema and `user_version` migrations), `store.ts`
(tickets, tags, comments, history, moves, the board query), `sync.ts`, `app.ts`
(`buildApp`) and `index.ts`. zod is now a direct server dependency.

Calls the brief left open:
- **Author** defaults to `agent`; sync writes as `sync`. Creating a ticket
  records a history event from null to To Do (`via: move` for an agent's
  `PUT`, `via: sync` for sync).
- **Tags** are replaced on every `PUT`, deduplicated, and never include the
  project itself.
- **Sync** also refreshes title and path for an existing ticket whose brief is
  in `done/` (the file moved), counts `updated` and `unchanged`, warns on a
  number used by two briefs, and un-hides a ticket whose brief is no longer in
  `superseded/`.
- **Error codes:** `invalid_request`, `invalid_key`, `not_found`,
  `move_not_allowed`, `message_required`, `internal`. A `PUT` answers 201 when
  it created the ticket.
- An unknown path outside `/api` gets the board's `index.html`; under `/api`
  it is a 404 in the contract's error shape.

Verified: 38 `inject` tests (every move row through the route, with and
without its message; 400 and 404 bodies; a double create; every sync rule; the
`doneDays` and `tag` filters; the `index.html` fallback). Typecheck, lint and
the full suite (84) pass. `npm run build && npm start` created
`data/brief-board.sqlite` and served `/api/board` on 127.0.0.1:8806.
