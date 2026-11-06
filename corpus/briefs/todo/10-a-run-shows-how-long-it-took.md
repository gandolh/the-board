# Task 10: A run shows how long it took

## Context

From the hyperagent.com research of 2026-11-06
([research-hyperagent-platform.md](../../wiki/research-hyperagent-platform.md),
candidate 1): Hyperagent shows every run's time and cost, and the owner
picked the same for this board that day. Runs on a ticket come from brief
08, which records each run's start and how it ended (`moved`, `released`,
`stale`) but shows no duration. The token half needs no build: brief 09's
report lines gain `Tokens:`, filled by the controller when its runtime
reports an agent's usage. This brief is the duration, derived from times
the board already keeps, with no new input from agents.

**Runs after brief 08.** If 08 isn't built, stop and say so.

## Owner decisions

Settled on 2026-11-06: duration only on the board, tokens as a report line
(brief 09). The smaller call, answered the same day:

1. **What a stale run's duration is.** **Decided:** from its start to the last
   time the board heard from it, marked as at least that long ("≥ 3h 10m"),
   since nobody knows when it really stopped.

## What to do

1. The run's duration, worked out at read time: end minus start for a
   closed run, now minus start for an open one, last-heard minus start for
   a stale one (decision 1). Nothing new is stored.
2. On the board: a closed run on the card and in the ticket view reads
   "took 1h 20m", an open one "running 40m". The ticket view lists earlier
   runs with theirs.
3. In the CLI: `show` prints each run's duration; `brief-board runs` gets a
   column for it.
4. One shared formatter for durations (`45m`, `1h 20m`, `2d 3h`) used by
   the web and the CLI, in `shared/`.

## Files you OWN

- `shared/` (the formatter and its test)
- `server/src/store.ts` or `app.ts`, only if the duration is computed there
- `cli/src/commands/read.ts` (`show`, `runs`) and its tests
- `web/` the card and the ticket view, and their tests
- `corpus/wiki/status.md`, `corpus/log.md`

## Files you must NOT touch

- `server/src/db.ts`: no migration; the times are already stored.
- `cli/src/guide.md`: brief 09 owns the `Tokens:` line.

## Acceptance

- Tests: the formatter's boundaries (59m, 1h, 24h, 2d); a closed, an open
  and a stale run each show the right duration in `show`, `runs` and the
  card.
- `npm test` and the typecheck pass.
- **Owner steps:** `node cli.ts brief-board deploy` from vps-deploy; rebuild
  the local CLI (`docs/getting-started.md`).
