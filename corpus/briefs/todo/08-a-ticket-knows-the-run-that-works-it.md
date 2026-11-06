# Task 08: A ticket knows the run that works it

## Context

On 2026-11-05 five background agents worked one project each, and the board
lost track twice ([research-agent-runs.md](../../wiki/research-agent-runs.md)
has the evidence and the HyperAgent patterns behind this brief;
[research-agent-runs-elsewhere.md](../../wiki/research-agent-runs-elsewhere.md)
has the survey of other agent trackers, protocols and job systems that
sharpened it):

- An agent moved its brief to `done/` and committed before its last board
  move. A sync the owner asked for then closed the ticket (In Progress to
  Done), and the agent's move to Ready for deploy was refused: Done has no
  move out. Its deploy steps ended up in a comment on a Done card.
- Two agents were stopped mid-run. Their tickets stayed In Progress with
  nothing working them, and no card shows the difference.

A **run** is one agent session working one ticket, from `brief-board start`
to its end move, or to a `release` by whoever stopped the agent. This brief
makes the board record runs: who holds a ticket and since when, when the
board last heard from the run, what sync does while a run is open, and how a
run ends when its agent is stopped. Runs are a record, never a lock: a down
board still never stops work, and nothing on the board hands a ticket to
anyone else.

**How the board knows a run is alive.** Every write on the ticket while its
run is open (start, comment, move) sets the run's last-heard time. A run whose
last write is older than the stale threshold is stale. The board works that
out when it reads and stores nothing, so nothing runs on a timer and sync
stays by hand. There is no heartbeat command: an agent that forgot one would
look dead while it works, and since the board reassigns nothing, a quick
death signal buys nothing. Linear's agent sessions work the same way: a
session's state follows its last activity, there is no separate heartbeat
call, and a session that went stale (30 minutes after the agent's first
response) recovers with its next activity. The survey's judgement 1 has the full argument.

## Owner decisions before building

**Answered 2026-11-06:** the owner took the default for all five: stale
after 4 hours, liveness from the run's own writes (no `beat`), the
revisit note, `release` by whoever stops the agent, and `--author`
asked for by the guide but not required.

1. **Stale after** how long without a write on the ticket. **Decided: 4 hours.**
   With the guide's new order a live run never meets sync with its brief in
   `done/`, so the threshold mostly decides what the card shows. (The first
   draft said 24 hours from the start.)
2. **Liveness from the run's own writes**, as above. **Decided: yes.** The
   alternative is a lease kept by a `brief-board beat` an agent runs between
   steps, with a shorter threshold; it fails the wrong way when an agent
   forgets, since a working run then reads as dead.
3. **A revisit note** on decisions.md's "The corpus wins; the board is a
   view": sync now waits for a fresh run before closing its ticket. **Decided:
   yes**, a dated "Revisited 2026-11-0x" paragraph, since the corpus still wins
   once the run ends or goes stale.
4. **`release`, run by whoever stops the agent.** A stopped agent can't close
   its own run, so the controller session, or the session the owner stops it
   from, runs `brief-board release <ticket> -m "<why, and what it left
   running>"`. The ticket stays In Progress for the owner to decide. **Decided:
   yes.** The alternative, moving to Blocked, needs the owner's agreement first
   by the decision on Blocked.
5. **Names on runs.** `--author` defaults to `$BRIEF_BOARD_AUTHOR`, else
   `agent`, so five runs all read "agent". Default: the guide asks the
   controller to give each agent a name to pass as `--author`, and nothing
   requires it. **Decided: this default.** The alternative: `start` refuses without `--author`.

## Files you OWN

- `cli/src/guide.md` and `cli/src/guide.test.ts`
- `cli/src/commands/moves.ts`, `cli/src/commands/read.ts`, `cli/src/main.ts`
  (help text), and a new `cli/src/commands/runs.ts` or `release.ts` if that
  reads better
- `server/src/db.ts` (one migration), `server/src/store.ts`,
  `server/src/sync.ts`, `server/src/app.ts`, and their tests
- `shared/` types for a ticket and its run
- `web/` the card and the ticket view (the run line), and their tests
- `corpus/wiki/sync.md`, `corpus/wiki/decisions.md` (the revisit note, per
  decision 3), `corpus/wiki/glossary.md` (Run, and Stale for a run),
  `corpus/wiki/status.md`, `corpus/log.md`

## Files you must NOT touch

- Other repos. Their CLAUDE.md sections name the command only and stay as
  they are; the rules change in `guide.md`, which every agent reads.

## What to do

1. **The guide's order.** In "Finishing", the last board move comes before
   the brief moves to `done/` and before the commit that moves it. Say why in
   one line (a sync in between closes the ticket).
2. **A run.** `start` opens a run on the ticket: author, start time,
   last-heard time, the optional message. A ticket has at most one open run.
   `start` on a ticket whose run is open records a resume, as today, and the
   run passes to the new author with a comment saying so. When that open run
   is fresh and its author differs, `start` also warns on stderr, naming it,
   and still goes ahead with exit 0: a run is not a lock.
3. **Last heard.** Every write on the ticket while its run is open (start,
   comment, move) sets the run's last-heard time. Stale is worked out at read
   time from that time and the threshold, which is a server setting with the
   default from decision 1. A write on a stale run makes it fresh again.
4. **How a run ends.** Any move out of In Progress closes it. `brief-board
   release <ticket> -m <why>` closes it without a move (message required):
   the ticket stays In Progress, the history and a comment say the run ended
   unfinished, and the card shows no run. The run keeps how it ended:
   `moved` with the column, `released`, or `stale` when sync closed its
   ticket.
5. **Sync.** A brief in `done/` whose ticket is In Progress with a fresh open
   run: leave the ticket, and add a warning to the sync report naming it
   ("its run is open; the run's end move decides"). A stale run: close the
   ticket as today, end the run as `stale`, and say so in the history and the
   report. Backlog, To Do and Blocked tickets work as before.
6. **On the board.** An In Progress card shows its run: author, when it
   started and when the board last heard from it ("heard 20m ago"). A stale
   run reads "stale run, heard 5h ago" in the warning tone; a ticket without
   one says "no run". `show` prints the open run and how earlier runs ended;
   `list` marks tickets with an open run, and stale ones differently.
7. **`brief-board runs`.** Every open run across projects, stalest first:
   ticket, author, started, last heard, stale or not. It is the controller's
   view of what is being worked, and the answer to "which project is free"
   (the survey found no case for a `next` command). It reads `list --all`'s
   route or one new read route, the builder's call.
8. **The controller's part of the guide.** A short section for a session
   that runs other agents:
   - give each agent a name to pass as `--author` (decision 5);
   - before a sync the owner asks for, run `brief-board runs` and tell the
     owner which runs are open;
   - to stop an agent, first ask it to wind down where the runtime lets you
     message it (stop what it started, release its run, hand back);
     otherwise stop it, then run `release` for it, naming in `-m` what it
     left running (a dev server's port, a container).
   And for every agent, in "Starting or resuming": start a long-lived
   process (a dev server) as the runtime's background task, so `/tasks`
   shows it with its command line, never with `&` or `nohup`, and stop
   what you started before the end move. This is the no-build first step
   of the todo `a-run-lists-what-it-holds`, which stays a todo for its
   `hold` and `drop` commands.
9. **The server.** The run lives in the database beside the ticket (a table
   or columns, the builder's call), migrated like the Backlog migration was.
   `start`, the moves, comments and `release` go through the existing token
   check.

## Acceptance

- Tests: `start` opens a run; a comment sets its last-heard time; a move
  closes it as `moved`; `release` closes it as `released` and leaves In
  Progress; a second `start` passes the run on, and warns when the run is
  fresh and another author's; a run turns stale past the threshold and fresh
  again on a write; sync leaves a ticket with a fresh run and warns, and
  closes one whose run is stale, ending it as `stale`; `runs` lists open runs
  stalest first; the guide test covers the new order and the controller's
  section.
- The card and `show` show the run, fresh or stale; an In Progress ticket
  without one says so.
- `npm run typecheck`, lint and the tests of the changed packages pass.
- Ready for deploy with the owner's commands (vps-deploy's
  `node cli.ts brief-board deploy` and `server`, and `npm link` again only if
  the CLI's entry changed).
