# Task 21: Sprints

**Depends on:**

- In brief-board: nothing. It is new feature work on the code as it is today.
- The owner's request of 2026-11-10: "For the brief board let's do something similar to start a sprint: clear all the done and move them to something like sprint 1; all others are now in sprint 2."
- The owner's answer of 2026-11-10: a sprint starts from the CLI, on the owner's ask, like `sync`; the web app stays read-only.

**Runs before:** brief 19. **Runs after:** nothing. See Interplay.

**Before you start:** run `brief-board guide` ([corpus/CLAUDE.md](../../CLAUDE.md)).

## Context

The board has no time dimension. Done tickets sit in the Done column for 14 days (`DEFAULT_DONE_DAYS`, `shared/src/api.ts:200`) and then fall onto the Older Done page (`GET /api/done`, `server/src/app.ts:270`), where they pile up for good. Every other ticket stays where it is. The owner wants the Jira and Linear habit: close the finished work into a numbered sprint, start the next one with what is left.

What exists today:

- **The tickets table** is in `server/src/db.ts` (the `MIGRATIONS` array, six entries, so `PRAGMA user_version` is 6). A ticket's key is its primary key. Runs, comments, history, questions and tags hang off `tickets(key)`. There is no sprint column and no sprints table.
- **The statuses** are seven (`shared/src/status.ts:11`): `backlog`, `todo`, `in_progress`, `blocked`, `ready_for_test`, `ready_for_deploy`, `done`. Done has no exit in the move table (`shared/src/moves.ts`), so a Done ticket never moves again.
- **The reads** all look at every ticket: `Store.board` (`server/src/store.ts:640`), `olderDone` (`:667`), `needs` (`:182`), `openRuns` (`:340`), `openQuestions` (`:164`), `projectTickets` (`:422`, used by sync).
- **Sync** (`server/src/sync.ts:64`, `runSync`) reads `projectTickets(project)`, inserts a ticket for a new brief or todo (`insertTicket`, `sync.ts:93`, `:201`), closes a ticket whose brief reached `done/` (`setStatus(..., "done", ...)`, `sync.ts:160-171`, with the open-run warning at `:163`), and deletes a todo's ticket whose todo file is gone (`deleteTicket`, `sync.ts:230`). A Done ticket whose brief is back in `todo/` only earns a warning (`sync.ts:110`).
- **The guard** (`server/src/app.ts:197-258`): a request with the CLI's Bearer token passes and may write; a signed-in browser session may only `GET` and `HEAD` (`SESSION_METHODS`; `validateSession`, `app.ts:228`, answers `read_only_session`). The web app has no write control: [wiki/decisions.md](../../wiki/decisions.md), "The UI is read-only" (2026-10-08). That decision stands unchanged.
- **The CLI's `list`** (`cli/src/commands/read.ts:14`) calls `GET /api/board` and filters by project and status. `brief-board list --all` shows every project.
- **The web app** has pages by path (`web/src/route.ts`: board, `done`, `login`, `account`), a shared `TopBar` (`web/src/TopBar.tsx`) and `DonePage.tsx`.

## Owner decisions

Decisions 1-7 were made on 2026-11-10, by the Jira and Linear convention.

1. **A sprint has a number, a start date and an end date.** Numbers are 1, 2, 3... Exactly one sprint is **active** and has no end date. The others are **closed** and read-only.
2. **Every ticket belongs to one sprint.** The board shows only the active sprint's tickets, so a closed sprint's Done tickets leave the board.
3. **Starting the next sprint closes the active one.** Its Done tickets stay in it, frozen. Every other ticket (Backlog, To Do, In Progress, Blocked, Ready for test, Ready for deploy) moves to the new sprint, which becomes active. A ticket's runs, questions, comments and history belong to the ticket, so they move with it with no work.
4. **The first migration** creates **Sprint 1** (closed on the migration date, holding every ticket that is Done at that moment) and **Sprint 2** (active, started the same date, holding every other ticket). It is idempotent, and a test proves it on a copy of a real-shaped database.
5. **Sync:** new tickets join the active sprint. A brief that reaches `done/` moves its ticket to Done in the active sprint, as today. Sync never changes a ticket in a closed sprint, and never brings one back onto the board.
6. **Who starts a sprint:** the CLI, on the owner's ask, the same rule as `sync`: `brief-board sprint start <N>` (N must be the active number plus one, else 409 `sprint_changed`), which an agent runs only when the owner asks. `brief-board sprint` prints the active sprint, and `brief-board list --sprint <n>` lists a closed one. `list` defaults to the active sprint. The web app stays read-only.
7. **The web app** only reads: the board header names the active sprint and its start date ("Sprint 2 · since 2026-11-10"). A Sprints view lists the closed sprints, newest first, each with its dates and its Done tickets.

Small calls this brief makes (defaults; the owner may change any):

8. **Starting a sprint is a Bearer-token write.** `POST /api/sprints` takes the CLI's token like the other writes; a session gets `read_only_session` as today. The body is JSON `{ "number": N }`, N the active number plus one, else 409 `sprint_changed`: a repeated command starts one sprint, not two. There is no session exception, and "The UI is read-only" is not revisited.
9. **Dates are calendar days, in UTC, from the server's clock** (`YYYY-MM-DD`). The header and the Sprints view show them as stored.
10. **Frozen means no write at all.** A write to a ticket in a closed sprint (move, upsert, comment, start, release, hold, answer) is refused with 409 `sprint_closed` and a message naming the sprint. In practice only Done tickets are there, and Done has no exit, so no honest client hits it.
11. **Reads.** `GET /api/board`, `/api/done`, `/api/needs`, `/api/runs` and `/api/questions` cover the active sprint only. `GET /api/tickets/:key` finds a ticket in any sprint, so an old key in a comment still opens. The board's 14-day Done window and the Older Done page stay, inside the active sprint.
12. **No history row for the sprint move.** `history.via` only allows `move` and `sync` (first migration in `server/src/db.ts`); a ticket's sprint is a column, not an event. The sprint's own dates are the record.
13. **Hidden tickets** count like the rest: a hidden Done ticket goes to Sprint 1.
14. **Sprint 1 on a fresh database** is created closed and empty, as on the owner's, so the numbers match everywhere.

## Files you OWN

- `shared/src/api.ts` and `shared/src/index.ts`: the sprint schemas, `sprint` on the ticket, `sprint` on the board response.
- `server/src/db.ts` (the seventh migration), `server/src/db.test.ts`.
- `server/src/store.ts` (sprint methods, the active-sprint filters), `server/src/sync.ts` (the guard), `server/src/app.ts` (the routes and the one session exception), `server/src/app.test.ts`.
- `cli/src/commands/read.ts`, a new `cli/src/commands/sprint.ts`, `cli/src/main.ts`, `cli/src/client.ts`, `cli/src/guide.md`, `cli/src/cli.test.ts`.
- `web/src/`: `TopBar.tsx`, `Board.tsx`, `route.ts`, `api.ts`, a new `SprintsPage.tsx`, their tests, and the small CSS for them in `web/src/styles.css`.
- Corpus: [wiki/glossary.md](../../wiki/glossary.md) (sprint, active, closed), [wiki/architecture.md](../../wiki/architecture.md), [wiki/board-ui.md](../../wiki/board-ui.md), [wiki/sync.md](../../wiki/sync.md), [wiki/decisions.md](../../wiki/decisions.md), [wiki/status.md](../../wiki/status.md), [log.md](../../log.md). `docs/` pages that describe the board or the CLI's commands.

## Files you must NOT touch

- `server/vendor/` and `web/vendor/`: generated.
- `infrastructure/`: the container and its build do not change.
- The move table (`shared/src/moves.ts`) and the status list. No new status.
- The deploy. The server change and its migration go live only when the owner deploys brief-board (vps-deploy); see Interplay. No `brief-board` command touches the live board during the build, and no one runs `tsc -b` for a check: use `npm run check` and the tests.
- Brief 17-20 files beyond the lines this brief names (Interplay).

## What to do

One commit per step; after each, `npm run check` passes.

1. **Schema and migration** (`server/src/db.ts`, `db.test.ts`).
   - Migration 7: a `sprints` table (`number INTEGER PRIMARY KEY`, `started_on TEXT NOT NULL`, `ended_on TEXT`, `CHECK (ended_on IS NULL OR ended_on >= started_on)`) and a unique partial index so at most one row has `ended_on IS NULL`.
   - Add `tickets.sprint INTEGER NOT NULL REFERENCES sprints(number)`. SQLite's `ALTER TABLE ... ADD COLUMN` needs a default for a NOT NULL column: add it with `DEFAULT 2`, then insert Sprint 1 and Sprint 2 with the migration date (`date('now')`), then `UPDATE tickets SET sprint = 1 WHERE status = 'done'`. The `migrate` loop already runs with foreign keys off and checks them before it commits (`db.ts`, `migrate`).
   - Tests: build a database at version 6 with every shape the real one has (tickets in all seven statuses, a Done one with comments, history, a run with holds and an answered question, a Backlog todo ticket with no number, a hidden Done ticket), open it, and assert: Sprint 1 is closed and holds exactly the Done tickets, Sprint 2 is active and holds the rest, both dated the same day, child rows are intact, `user_version` is 7. Open it again: nothing changes. Open a fresh `:memory:` database: Sprint 1 is empty and closed, Sprint 2 is active.
2. **The store** (`server/src/store.ts`).
   - `activeSprint()`, `sprints()` (newest first, each with its Done count), `sprintTickets(number)`, and `startSprint(expected, today)` in one transaction: refuse unless `expected` is the active number plus one; set `ended_on` on the active sprint; insert the new one; `UPDATE tickets SET sprint = <new> WHERE sprint = <old> AND status <> 'done'`.
   - `insertTicket` puts the new ticket in the active sprint. `board`, `olderDone`, `needs`, `openRuns`, `openQuestions` and sync's `projectTickets` use add `sprint = <active>` where decision 11 says. Every write method refuses a ticket whose sprint is closed (decision 10), through one private check.
   - Tests (through the routes in `server/src/app.test.ts`, or a store test beside `db.test.ts`): starting a sprint moves each non-Done status, leaves Done in the closed sprint, keeps a run, a question and a comment on their ticket, and a second start with a stale `expected` is refused.
3. **Sync** (`server/src/sync.ts`). Sync reads and writes only the active sprint's tickets (`projectTickets` gets the sprint). A brief in `done/` whose ticket is already in a closed sprint is a no-op. A brief that is in `todo/` or `blocked/` again while its ticket sits Done in a closed sprint keeps today's warning and changes nothing (no refresh of title or path either). A todo's ticket is deleted only from the active sprint. Tests: each of those three cases, and a new brief after a sprint start lands in the new sprint.
4. **The API** (`shared/src/api.ts`, `server/src/app.ts`).
   - `GET /api/sprints`: `{ active, closed }`; a sprint is `{ number, startedOn, endedOn | null, doneCount }`; `closed` is newest first.
   - `GET /api/sprints/:number`: the sprint and its tickets, by project then Done time, newest first (the Older Done page's order). Unknown number: 404 `not_found`.
   - `POST /api/sprints`: decision 8, Bearer token, answering `{ sprint }` with 201.
   - `sprint` (number) on the ticket schema, and `sprint: { number, startedOn }` on the board response, so the header needs no second call.
   - A response schema for each, as every route has one today. Tests: Bearer token 201, a session 401 `read_only_session`, wrong `number` 409 `sprint_changed`, no body 400, no credentials 401.
5. **The CLI** (`cli/src/commands/read.ts`, `main.ts`, `client.ts`, `guide.md`).
   - `brief-board sprint`: one line, "Sprint 2, since 2026-11-10, 41 tickets".
   - `brief-board list --sprint <n>`: the sprint's tickets through `GET /api/sprints/:number`, the same line format. Default is the active sprint. A number that does not exist exits 1 with the existing not-found message.
   - `brief-board sprint start <N>`: posts `POST /api/sprints`, prints "Sprint 3 started; 41 tickets moved, 12 stay in sprint 2." A stale N exits 1 with the 409's message.
   - **The guide** (`cli/src/guide.md`, printed by `brief-board guide`) gains the rule next to "Don't run `brief-board sync` unless the owner asks" (line 105): "Don't run `brief-board sprint start` unless the owner asks. It closes the active sprint and moves every ticket that is not Done into the next one, and nothing undoes it." It also says that a Done ticket in a closed sprint is frozen, and that `sprint` and `list --sprint` only read. `cli/src/guide.test.ts` keeps passing, with a line for the new rule.
   - Tests in `cli/src/cli.test.ts` against a real server through `buildApp`, as the others do.
6. **The web app** (`web/src/`).
   - `TopBar` names the active sprint and its start date next to the brand: "Sprint 2 · since 2026-11-10".
   - A Sprints page (`<base>sprints`, a link in the header): the closed sprints, newest first, each as a heading with "2026-10-09 to 2026-11-10" and its Done tickets by project, read-only, on `GET /api/sprints` then `GET /api/sprints/:number` when one opens. An empty sprint says "No Done tickets".
   - Tests: the Sprints page's order and the header text. There is no write control anywhere in the sprint UI.
7. **Walk it.** On a scratch copy of the database (never the live one), run `brief-board sprint start` against a scratch server, then check the board, the Sprints view, `brief-board list --sprint 1` and `brief-board sprint` by hand. Put what the walk showed in the outcome note.
8. **Corpus.** The pages under Files you OWN: the glossary's three terms, the architecture and board-ui pages (the schema, the routes, the header, the Sprints page), sync's new guard, a decisions entry for decisions 1-8 with what was rejected (a "Done older than N days" auto-archive, a sprint per project, a sprint filter on one table instead of a sprints table), status, and a log entry. Run `bash corpus/lint.sh` until it is clean.

## Acceptance

- [ ] The migration test passes: a version-6 database with all seven statuses opens as Sprint 1 (closed, only Done tickets) and Sprint 2 (active, the rest), child rows intact, and a second open changes nothing.
- [ ] `PRAGMA user_version` is 7 after a first open, and `sqlite3 <scratch db> "select number, started_on, ended_on from sprints"` prints two rows, the second with no end date.
- [ ] Starting a sprint on a scratch copy leaves the closed sprint's Done tickets there and moves every other ticket, with its runs, questions and comments (a test names each).
- [ ] `brief-board sprint start <N>` on a scratch server starts the sprint; a stale N exits 1 (409 `sprint_changed`); a session's `POST /api/sprints` answers `read_only_session`. `brief-board guide` prints the rule "don't start a sprint unless the owner asks".
- [ ] Sync after a sprint start: a new brief lands in the active sprint, a brief in `done/` for a closed-sprint ticket changes nothing, and no ticket in a closed sprint is written (a test compares its row before and after).
- [ ] `brief-board sprint` and `brief-board list --sprint 1` work against the scratch server, and `list` with no flag shows only the active sprint.
- [ ] The board's header shows "Sprint N · since YYYY-MM-DD"; the Sprints page lists closed sprints newest first; the web app has no write control.
- [ ] A write to a closed sprint's ticket answers 409 `sprint_closed`.
- [ ] `npm run check` passes, and `bash corpus/lint.sh` ends clean.
- [ ] The live board is untouched: no `brief-board` command ran against it, and the outcome note says the migration waits for the owner's deploy.

## Interplay

- **Brief 19 (the server in the house code structure).** Brief 21 runs **first**: the owner wants it now, and it is a feature on today's flat files, so it needs no new structure. Brief 19 then moves the result, and its move map and feature table gain what this brief adds:
  - the sprint routes become a `sprints` feature (`server/src/features/sprints/`) over the same whole `Store` (decision 2 of brief 19);
  - `POST /api/sprints` is a plain token write like the others, and `sprint_changed` and `sprint_closed` are two new codes for the error plugin;
  - the new `describe`s in `app.test.ts` go to the feature they test;
  - the sprint schemas are already in `shared/`, so brief 19's "no schema changes" still holds for what it adds itself.

  When 19 runs, it re-measures its line numbers: `app.ts`, `store.ts` and `app.test.ts` all grow. If 19 runs first instead, this brief's paths follow its move map and the step order does not change.
- **Briefs 17 and 18 (Base UI, Tailwind).** They touch `web/`, as step 6 does, so never run at the same time. The sprint UI has no controls, so it does not fight 17. If 18 ran first, write the new styles as Tailwind tokens, not into `styles.css`.
- **Brief 20 (the redesign).** It runs after everything. Its "no control that writes to the API" line still holds: the sprint UI is read-only, so the redesign only restyles the header text and the Sprints page.
- **Brief 16 (the harness).** No conflict. The new tests join the existing runs.
- **Deploying.** The server change and its migration go live only when the owner deploys brief-board (vps-deploy), and the migration runs on the live database at the first start. Back up the SQLite file first (the deploy's usual backup, or a copy), because the migration changes every ticket's row. The CLI is rebuilt from main only **after** that deploy: `brief-board sprint` and `list --sprint` need the new server, and the old CLI against the new server still works (it ignores the new fields). No agent builds the CLI or deploys.
- **The first sprint start on the live board** is the owner's call: after the deploy, the owner asks an agent to run `brief-board sprint start 3` (the migration already made Sprint 2 active).
