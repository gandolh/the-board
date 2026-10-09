# Task 02: Shared model and API contract

## Context

Briefs 03 (server), 04 (CLI) and 07 (UI) run in parallel after this one. They
can only do that if the statuses, the move rules, the key format and every
route's request and response shape live in one place. That place is
`shared`. Get it right here, and the other three only import it.

The rules come from [decisions.md](../../wiki/decisions.md): the move table,
one ticket per brief, one project tag per ticket, and sync as the one thing
that bypasses the move table. The words come from
[glossary.md](../../wiki/glossary.md). Use them for type and field names.

## Files you OWN

```
shared/src/index.ts  shared/src/status.ts  shared/src/moves.ts
shared/src/key.ts  shared/src/api.ts  shared/src/*.test.ts
```

## Files you must NOT touch

`server/`, `cli/`, `web/`, `corpus/`.

## What to do

1. **Statuses** (`status.ts`). Ids `todo`, `in_progress`, `blocked`,
   `ready_for_test`, `ready_for_deploy`, `done`, in that column order, with
   their labels (To Do, In Progress, Blocked, Ready for test, Ready for
   deploy, Done).
2. **Moves** (`moves.ts`). The table from decisions.md as data. Each row has
   `from`, `to`, `message: "optional" | "required"`, and a message role:
   `conclusion`, `block_reason`, `test_notes`, `deploy_steps`,
   `confirmation`, or `comment`. Export `checkMove(from, to, message)`. It
   returns ok, or an error with code `move_not_allowed` or `message_required`
   plus the rows allowed from `from`, so a client can print them. No
   same-status moves. Resuming an In Progress ticket is a CLI concern
   (brief 04), not a move.
3. **Keys** (`key.ts`). A key is `<project>-<number>`. Project names contain
   hyphens and capitals (`public-resource-map`, `imbatranimOS`), and brief
   numbers run past 99 (`imbatranimOS-137`). Parse by splitting on the last
   `-<digits>`. Keep the project string exactly as written, store the number
   as an integer, accept padded and unpadded input (`sports-app-01` and
   `sports-app-1` are the same ticket), and format with at least two digits so
   keys match brief filenames.
4. **API contract** (`api.ts`). zod schemas for the request and response of
   every route, and the shapes they share:
   - Ticket: key, project, number, title, summary, `summarySource`
     (`agent` or `sync`), `briefPath` (relative to the project's repo root),
     `tags` (labels, without the project), status, `hidden`, createdAt,
     updatedAt, statusChangedAt.
   - Comment: id, author, body, role (a message role or none), the move it
     came with if any, createdAt.
   - History event: from, to, author, `via` (`move` or `sync`), at.
   - Routes:
     - `GET /api/health`
     - `GET /api/board`, with optional `tag` and `doneDays` (default 14). It
       returns lanes, one per project, each with its visible tickets.
     - `GET /api/tickets/:key`, returning the ticket, its comments and its
       history.
     - `PUT /api/tickets/:key`, which creates the ticket or updates it. The body
       has title, summary, briefPath and tags. The response says whether it
       created the ticket.
     - `POST /api/tickets/:key/moves`, with `to`, an optional `message` and an
       optional `author`.
     - `POST /api/tickets/:key/comments`, with `body` and an optional
       `author`.
     - `POST /api/sync`, which takes a list of projects, each with its briefs
       (number, title, summary, briefPath, and state `todo`, `done` or
       `superseded`). It returns counts and warnings.
   - Error body: `{ code, message, allowed? }`.

## Acceptance

- One test per row of the move table, accepted with its required message and
  rejected without it.
- A test for a sample of moves the table doesn't list, which get
  `move_not_allowed`.
- Key tests for hyphenated projects, capitals, padded and unpadded numbers, and
  three-digit numbers.
- `npm run typecheck && npm test` pass.
