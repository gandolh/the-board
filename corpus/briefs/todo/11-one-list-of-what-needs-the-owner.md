# Task 11: One list of what needs the owner

## Context

From the hyperagent.com research of 2026-11-06
([research-hyperagent-platform.md](../../wiki/research-hyperagent-platform.md),
candidate 2): Hyperagent's Command Center opens on "Needs Attention", one
place for everything waiting on a person. The owner picked the same for
this board that day. Today the owner's work is spread out: tickets in Ready
for test and Ready for deploy sit in their columns across every project's
lane, Blocked tickets carry what the owner must decide, and after briefs 08
and 09 open questions show as card badges and stale runs as a warning on
their card. Nothing gathers them.

**Runs after briefs 08 and 09.** If either isn't built, stop and say so.

The list is derived, like 09's badge: never a status, never a column, so
"Six columns, two of them the owner's" and "The UI is read-only"
([decisions.md](../../wiki/decisions.md)) both stand.

## Owner decisions

Settled on 2026-11-06: a derived list, read-only. The two smaller calls,
answered the same day:

1. **What's on it.** **Decided**, in this order: open questions (09), Blocked
   tickets with their blocking message, stale runs (08), Ready for test,
   Ready for deploy. Each line names the ticket, why it's there and since
   when.
2. **Where it shows on the board.** **Decided:** a strip above the lanes, one
   line per kind with a count ("3 questions · 1 blocked · 2 to test · 7 to
   deploy"), each opening the matching tickets. Nothing when all are zero.

## What to do

1. One read route that returns the list, built from the tickets, questions
   and runs the server already has; nothing new is stored.
2. `brief-board needs` prints it grouped by kind, oldest first in each,
   with `--project <name>` to narrow it. Exit 0 whether or not anything is
   waiting.
3. The strip on the board (decision 2), polled like the board itself.
4. The guide: a line in the controller's section (brief 08) that `needs`
   is the first thing to show the owner at a hand-back.

## Files you OWN

- `server/src/app.ts`, `server/src/store.ts` and their tests (the route)
- `shared/` (the list's type)
- `cli/src/commands/read.ts` or a new `cli/src/commands/needs.ts`,
  `cli/src/main.ts` (help), `cli/src/guide.md` and its test
- `web/` the strip and its test
- `corpus/wiki/status.md`, `corpus/log.md`

## Files you must NOT touch

- `server/src/db.ts`: no migration.
- `server/src/sync.ts`: sync doesn't read or change the list.

## Acceptance

- Tests: each kind appears with the right ticket and reason; a ticket that
  is both Blocked and has an open question shows under each; `--project`
  narrows; the strip hides at all zeros and counts each kind otherwise.
- `npm test` and the typecheck pass.
- **Owner steps:** `node cli.ts brief-board deploy` and `node cli.ts
  brief-board server` from vps-deploy; rebuild the local CLI
  (`docs/getting-started.md`); `brief-board needs` lists today's Ready for
  deploy tickets.
