# Task 08: A ticket knows the run that works it

## Context

On 2026-11-05 five background agents worked one project each, and the board
lost track twice ([research-agent-runs.md](../../wiki/research-agent-runs.md)
has the evidence and the HyperAgent patterns behind this brief):

- An agent moved its brief to `done/` and committed before its last board
  move. A sync the owner asked for then closed the ticket (In Progress to
  Done), and the agent's move to Ready for deploy was refused: Done has no
  move out. Its deploy steps ended up in a comment on a Done card.
- Two agents were stopped mid-run. Their tickets stayed In Progress with
  nothing working them, and no card shows the difference.

A **run** is one agent session working one ticket, from `brief-board start`
to its end move. This brief makes the board record runs: who holds a ticket
and since when, what sync does while a run is open, and how a run ends when
the agent stops without finishing. Runs are a record, never a lock: a down
board still never stops work.

## Owner decisions before building

1. **Stale after** how long an open run stops counting. Default: 24 hours.
2. **A revisit note** on decisions.md's "The corpus wins; the board is a
   view": sync now waits for an open run before closing its ticket. Default:
   yes, a dated "Revisited 2026-11-0x" paragraph, since the corpus still wins
   once the run ends.
3. **`release` or not**: a stopped agent's run closes with `brief-board release
   <ticket> -m <why>` (the ticket stays In Progress for the owner to decide).
   Default: yes. The alternative is moving to Blocked, which by the decision
   on Blocked needs the owner's agreement first.

## Files you OWN

- `cli/src/guide.md` and `cli/src/guide.test.ts`
- `cli/src/commands/moves.ts`, `cli/src/main.ts` (help text), a new
  `cli/src/commands/release.ts` if that reads better
- `server/src/db.ts` (one migration), `server/src/store.ts`,
  `server/src/sync.ts`, `server/src/app.ts`, and their tests
- `shared/` types for a ticket and its run
- `web/` the card and the ticket view (a run marker), and their tests
- `corpus/wiki/sync.md`, `corpus/wiki/decisions.md` (the revisit note, per
  decision 2), `corpus/wiki/glossary.md` (Run), `corpus/wiki/status.md`,
  `corpus/log.md`

## Files you must NOT touch

- Other repos. Their CLAUDE.md sections name the command only and stay as
  they are; the rules change in `guide.md`, which every agent reads.

## What to do

1. **The guide's order.** In "Finishing", the last board move comes before
   the brief moves to `done/` and before the commit that moves it. Say why in
   one line (a sync in between closes the ticket).
2. **A run.** `start` opens a run on the ticket: author, start time, the
   optional message. A ticket has at most one open run. `start` on a ticket
   whose run is open records a resume, as today, and the run passes to the new
   author with a comment saying so.
3. **How a run ends.** Any move out of In Progress closes it. `brief-board
   release <ticket> -m <why>` closes it without a move (message required): the
   ticket stays In Progress, the history and a comment say the run ended
   unfinished, and the card shows no run.
4. **Sync.** A brief in `done/` whose ticket is In Progress with an open run
   younger than the stale threshold: leave the ticket, and add a warning to
   the sync report naming it ("its run is open; the run's end move decides").
   Older than the threshold: close as today, and the history says the run was
   stale. Backlog, To Do and Blocked tickets work as before.
5. **On the board.** An In Progress card shows its run (author, how long
   ago) or "no run". `show` prints the run; `list` marks tickets with an open
   run.
6. **The server.** The run lives in the database beside the ticket (a table
   or columns, the builder's call), migrated like the Backlog migration was.
   `start`, the moves and `release` go through the existing token check.

## Acceptance

- Tests: `start` opens a run, a move closes it, `release` closes it and
  leaves In Progress, a second `start` passes the run on; sync leaves a ticket
  with a fresh open run and warns, and closes one whose run is stale; the
  guide test covers the new order.
- The card and `show` show the run; an In Progress ticket without one says so.
- `npm run typecheck`, lint and the tests of the changed packages pass.
- Ready for deploy with the owner's commands (vps-deploy's
  `node cli.ts brief-board deploy` and `server`, and `npm link` again only if
  the CLI's entry changed).
