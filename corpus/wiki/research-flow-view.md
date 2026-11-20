---
summary: Research of 2026-11-20 - would a statechart-like flow view (the statuses drawn as a diagram, with counts and times on each arrow) make the board easier to watch? Measured on the live board (394 tickets, 1,268 history events, 213 runs, 2026-11-03 to 2026-11-20) - 95% of moves follow four arrows, a run takes a median 15 min, In Progress time understates it, and the wait is the owner's deploy rollout. Verdict - no diagram; two small additions if the owner wants them (ages in the web Needs strip, a sprint summary line with run time, deploy wait and tickets closed by sync).
updated: 2026-11-20
---

# A flow view for the board, researched 2026-11-20

The owner asked whether something like pstack's `statechart` skill (a model drawn as a state
diagram, with the shortest path to each broken rule) would give the board better
observability. A statechart of the move table adds nothing: `MOVES` in `shared/src/moves.ts` is
12 rows, the server enforces it on every move, and there is no concurrency for a model checker
to find. So the question became whether a diagram of the real flow, drawn from the board's own
history, would show something the board doesn't already.

## What the board records and shows today

- **Records:** `history`, one row per status change (from, to, author, `move` or `sync`, time);
  `tag_events`; runs with their start, last heard and end; holds; questions.
- **Shows:** each card says how long the ticket has sat in its column. The detail panel lists
  a ticket's history, runs and comments. `brief-board needs` lists what waits on the owner with
  its age; the web Needs strip shows the reason but not the age, though the API sends it
  (`since`). Stale runs are flagged. The Sprints page lists closed sprints with their Done
  counts.
- **Missing:** anything across tickets: which arrows the moves take, and how long each status
  holds a ticket.

## What the history says

Read on 2026-11-20 through the CLI, read only: `list --all --sprint` for sprints 1 to 3, then
`show` for each of the 394 tickets. 1,268 events, 2026-11-03 to 2026-11-20.

| Arrow | Moves | By sync |
|---|---|---|
| created → To Do | 367 | 211 |
| To Do → In Progress | 313 | 0 |
| In Progress → Ready for deploy | 217 | 0 |
| Ready for deploy → Done | 217 | 0 |
| In Progress → Done | 86 | 1 |
| created → Backlog | 27 | 27 |
| To Do → Done (not in the table) | 15 | 15 |
| In Progress → Ready for test | 7 | 0 |
| Ready for test → Done | 6 | 0 |
| In Progress → Blocked | 4 | 0 |
| Blocked → Done | 2 | 2 |
| Blocked → In Progress | 2 | 0 |
| Backlog → Done, Backlog → To Do (not in the table) | 2, 1 | 3 |
| Ready for test → Ready for deploy | 1 | 0 |
| Ready for deploy → In Progress | 1 | 0 |

- **One path:** 95% of the 874 moves (creates left out) follow four arrows: To Do → In
  Progress → Ready for deploy → Done, or In Progress → Done.
- **Time in a status** before the next event, median and 90th percentile: To Do 4.8 h and
  67 h; In Progress 12 min and 1.1 h; Ready for deploy 59 h and 201 h (the longest 13.5 days);
  Ready for test 74 h and 119 h (7 tickets).
- **In Progress is not the build time.** The 213 recorded runs (runs exist since 2026-11-06)
  took a median 15 min and 67 min at the 90th percentile, but 18% of In Progress stints are
  under two minutes and 107 tickets went In Progress with no run at all: some moves were
  recorded after the work. A build-time figure has to come from runs.
- **Start to Done:** median 20 h, 90th percentile 197 h, over 311 tickets.
- **Done comes in batches:** 144 of the 328 Done moves landed on 2026-11-19, the rollout day.
- **Rework is rare:** one ticket went back from Ready for deploy to In Progress; two Blocked
  tickets were unblocked.
- **Off-table moves are all sync's,** which the table allows. 17 tickets went from To Do or
  Backlog straight to Done because their brief reached `done/` with no move on the board. 13 of
  them are imbatranimOS's, all closed by one sync on 2026-11-04, the board's second day; four
  more since. One In Progress ticket was closed by sync, the case
  [research-agent-runs.md](research-agent-runs.md) describes.

## Verdict

- **A statechart or flow diagram: not worth it.** The picture is one line with a few thin side
  arrows. What it would add, the waiting, the cards already show one by one, and a diagram of a
  12-row table the server enforces checks nothing.
- **The one strong signal is the wait in Ready for deploy,** and it is the owner's rollout
  rhythm, not a fault: work waits for a batch deploy, then a day closes 144 tickets.
- **Worth it, and small, if the owner wants them:**
  1. The web Needs strip shows each item's age, as `brief-board needs` already does. The API
     already sends it, so this is a web-only change.
  2. A sprint summary line on the Sprints page and in `brief-board sprint`: tickets Done,
     median run time (from runs, not from In Progress, see above), median wait in Ready for
     deploy, and tickets closed by sync with no move. Two read-only queries, over `history` and
     the runs. The last number is how the board learns of work done outside it; it has been
     rare since the board's second day, so it is one figure in the line, not a view.

## If it is built

The figures above are the check: recompute them from `brief-board show` for the same window,
and the summary must match. The line goes in the existing Sprints heading and the CLI's
`sprint` output; no new page. Nothing is filed as a todo; the owner picks.
