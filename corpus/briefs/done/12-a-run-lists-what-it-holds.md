# Task 12: A run lists what it holds

## Context

Promoted on 2026-11-06 from the todo of the same name, at the owner's ask.
Brief 08 gave a ticket its run (who works it, since when, how it ended) and
put the no-build half of this todo into the guide: start a long-lived
process as the runtime's background task, and stop what you started before
the end move. This brief is the build half.

On 2026-11-05 a stopped agent left a Vite server on 5173, which another
agent needed (it worked round it with a relay container), and the session
that stopped it found it only by hunting through `ss`. A copied folder left
in the shared imbatranimOS dev container kept it from starting for the next
agent. The pattern is Hyperlight HyperAgent's "nothing is ambient":
resources are declared, not found later
([research-agent-runs.md](../../wiki/research-agent-runs.md), candidate 2;
[research-agent-runs-elsewhere.md](../../wiki/research-agent-runs-elsewhere.md),
judgement 3). brief-board starts nothing, so an agent declares what it
starts; Claude Code's task list knows a session's background shells but not
a server started with `&`, `nohup` or `docker run -d`.

**Runs after brief 08** (built 2026-11-06, deployed with it if the owner
hasn't deployed 08-11 yet).

## Owner decisions

Settled on 2026-11-06: build it now. The smaller calls, with the default
this brief builds:

1. **The kinds.** Default: `port`, `pid`, `container` and `path`, each
   with a free-text value; nothing is checked against the machine.
2. **A clash.** Default: a `hold` on a value another open run holds warns
   on stderr, naming that run, and still goes ahead (exit 0): holds are a
   record, never a lock.
3. **What happens to holds when a run ends.** Default: the end move and
   `release` print what is still held, and the run keeps them as it ended,
   visible in `show`; they don't carry over to the next run.

## What to do

1. `brief-board hold <ticket> <kind> <value>` and `brief-board drop
   <ticket> <kind> <value>`, on the ticket's open run (no open run: a usage
   error naming `start`). A hold counts as a write on the run (brief 08's
   last-heard time).
2. The server keeps holds beside runs (a table, migrated like brief 08's),
   through the existing token check.
3. The end move and `release` print the run's remaining holds and record
   them on the run; `show` lists an open run's holds and an ended run's
   leftovers; `brief-board runs` gets a column with each open run's holds.
4. The guide: one line in "Starting or resuming" (hold what you start that
   outlives a command; drop it when you stop it), and one in the
   controller's section (after a `release`, the leftovers are what to clean
   up).
5. Tests: hold and drop on an open run, the clash warning, no open run, the
   leftovers on an end move and on `release`, `runs` and `show`.

## Files you OWN

- `server/src/db.ts` (one migration), `server/src/store.ts`,
  `server/src/app.ts` and their tests
- `shared/` types for a hold
- `cli/src/commands/` (a new `holds.ts` or inside `runs.ts`), `cli/src/main.ts`
  (help), `cli/src/guide.md` and its test
- `corpus/wiki/glossary.md` (Hold, if it earns an entry),
  `corpus/wiki/status.md`, `corpus/log.md`

## Files you must NOT touch

- `server/src/sync.ts`: sync doesn't read holds.
- `web/`: holds show in the CLI only for now.

## Acceptance

- The tests above pass, with the typecheck and lint.
- **Owner steps:** from vps-deploy, `node cli.ts brief-board deploy` and
  `node cli.ts brief-board server`; only after that, rebuild the local CLI
  (`npm run build` in this repo), because the new CLI needs the new server.

## Outcome

Built 2026-11-06 in `b4aafc0`, on the branch `brief-12-2026-11-06` (from
main at `5f32574`). Ticket brief-board-12 is in Ready for deploy.

- **The table.** `holds` (migration 5) keyed by run, not by ticket: kind
  (one of the four, a CHECK), value, when it was taken, one row per run,
  kind and value. A `drop` deletes the row. When the run ends, its rows
  stay on it: those are its leftovers, and the next run starts with none.
  That covers the end move, `release` and sync's stale end with no change
  to `sync.ts`. A run that passes to a new author keeps its holds.
- **The routes.** `POST /api/tickets/:key/hold` and `/drop`, body
  `{ kind, value }` (the value in the body, since a path has slashes),
  behind the token check. Both set the run's last-heard time. No open run
  is `no_open_run`, with a message naming `brief-board start`; dropping
  what the run doesn't hold is the new `not_held`, naming what it does
  hold. A todo's ticket is `sync_owned`, as for a comment.
- **The CLI.** `hold` and `drop` in `cli/src/commands/holds.ts`. The kind
  is checked locally, any case; the value is trimmed and otherwise taken as
  given. A clash prints one warning per other open run on stderr, naming
  its ticket, author and when it was last heard, and exits 0. No open run
  and `not_held` exit 1 (a usage mistake, as `answer` does for a closed
  question). The end move and `release` print one line, "the run ended
  still holding port 5173, container vite-dev (kept on the run as
  leftovers)", only when something is held. `show` adds `Holds:` under
  `Run:` for an open run ("nothing" when empty) and "; leftovers: ..." on
  each earlier run that kept some; `runs` has holds as its last column.
- **The contract.** The board's tickets keep the plain run, so `/api/board`
  and `web/` are unchanged. The detail's runs, `GET /api/runs`, the release
  and a new `endedRun` on the move response carry `RunWithHolds`.
- **My calls.** Holding what the run holds already is a no-op ("already
  holds", exit 0). Only open runs clash, as decision 2 says; an ended run's
  leftover on the same port doesn't warn. Values are compared exactly after
  trimming, so `tmp/x` and `./tmp/x` are two paths. `drop` works only on
  the open run: an ended run's leftovers are its record and can't be
  dropped. `--author` is accepted on `hold` and `drop` but not stored; a
  hold belongs to the run.
- **Guide.** Section 3: "Hold what you start that outlives a command, and
  drop it when you stop it", with the command shape. Section 7, under
  `release`: "Release prints what the run still held; stop those, or tell
  the owner." The guide test's cap went from 110 to 115 lines (it is 112).
- **Outside the file list:** `cli/src/format.ts`, `cli/src/client.ts`,
  `cli/src/cli.test.ts`, `docs/architecture.md`, the wiki's
  `architecture.md`.

243 tests (from 229), typecheck (web included) and lint pass; the web build
and a browser walk were skipped, since `web/` is untouched. Owner steps:
[status.md](../../wiki/status.md), "Next (owner)" item 1: one deploy for
briefs 08 to 12, the server first, then the local CLI rebuild.
