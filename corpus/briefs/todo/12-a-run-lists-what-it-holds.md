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
