---
summary: Snapshot as of 2026-11-03, per area. Live on the VPS since 2026-11-03; first sync 2026-11-03 (23 projects, 30 tickets in To Do). The board, CLI, sync and guide built 2026-10-09 and rolled out to every project's CLAUDE.md but vps-deploy's; Base UI under the panel and lanes 2026-10-23. Down since 2026-10-13; briefs 01-05 (2026-11-02) built it for the VPS behind sign-in (sync in group folders, the sub-path, the CLI's token, sign-in, the container and the vps-deploy stack), not deployed, with the owner's steps, which vps-deploy's npm run setup:brief-board runs (2026-11-03); ward-auth 0.7.0 with its rename route off (2026-11-03); the numbering question after the estate restarted brief numbering, closed 2026-11-03; Backlog for open todos (brief 06) and nested corpora naming themselves (brief 07, churchix and scoala-ramna-theme) built 2026-11-03, not deployed; brief 08 (a ticket knows the run that works it) open since 2026-11-06, with two todos behind it.
updated: 2026-11-06
---

# Status

_2026-11-03_. **Live on the VPS** at `/brief-board/` behind sign-in. The
owner ran vps-deploy's `npm run setup:brief-board` on 2026-11-03, signed in
and linked Ward; the CLI on the owner's machine reads the live board ("No
tickets" before the first sync). Briefs 01 to 05 (2026-11-02) built it: sync
in group folders, the sub-path, the CLI's token, sign-in, and the container
with vps-deploy's `brief-board` stack. The local board it replaces was down
from 2026-10-13. Brief numbering restarted at 01 on 2026-11-02 (see
[log.md](../log.md)).

## By area

- **Shared model** (2026-10-09). Statuses, the twelve-row move table with
  `checkMove`, keys, the zod contract for every route
  ([decisions.md](decisions.md), [architecture.md](architecture.md)).
- **API server** (2026-10-09). Fastify + SQLite on 127.0.0.1:8806, moves
  enforced by the shared table, serving the built UI.
- **CLI** (2026-10-09; token 2026-11-02). Every agent command, the address
  and token lookups, resume, exit 3 when the board is down or refuses the
  token, and `guide`.
- **Sync** (2026-10-09; group folders 2026-11-02; todos and depth three
  2026-11-03). Reads every project's briefs and open todos, up to three
  folders deep, named by `corpus/board-name` where a corpus has one, and
  corrects the tickets; each open todo has a sync-owned ticket in Backlog
  ([sync.md](sync.md)).
- **Sign-in** (2026-11-02; ward-auth 0.7.0 2026-11-03). The vendored
  ward-auth as the one guard, its rename route off: a local
  account or Sign in with Ward, read-only browser sessions, the CLI's token
  for writes ([sign-in.md](sign-in.md)).
- **Deploy** (2026-11-02). `infrastructure/` builds the `brief-board-api`
  image (checked locally: healthy, 199 MB); vps-deploy's `brief-board` stack
  serves the board at `/brief-board/` and the API at `/brief-board-api` on
  port 8806. Not deployed ([architecture.md](architecture.md), "Running it").
- **Board UI** (2026-10-09, Base UI 2026-10-23, Backlog 2026-11-03).
  Read-only lanes, seven columns with Backlog first, the detail panel,
  polling; README images retaken 2026-10-31 (they show six columns).
- **Rollout** (2026-10-09). Thirteen repos carry the brief-board section in
  their CLAUDE.md. vps-deploy was skipped because its `corpus/CLAUDE.md` had
  uncommitted work, and on 2026-11-02 it still has no section.

170 tests (2026-11-03, after briefs 06 and 07); typecheck, lint and build clean.

## Next (owner)

1. Deploy the board with Backlog (brief 06), then sync, in that order: a
   board from before Backlog ignores the todos. From vps-deploy:
   `node cli.ts brief-board deploy`; then, from outside a repo,
   `brief-board sync --dry-run` and `brief-board sync`. The migration
   rebuilds the tickets table on first start; the board keeps every ticket,
   comment and history row. The same sync brings churchix and
   scoala-ramna-theme on (brief 07; the CLI already infers their names).
2. For local development only: add brief-board to Ward's local seed
   (`wzd_auth`, `infrastructure/local/seed.mjs`):
   `{ slug: "brief-board", name: "brief-board", repo: "brief-board", envFiles: [".env"], dev: "http://localhost:5178/brief-board/", api: "/brief-board-api" }`
   in `APPS`, and its row in that folder's README table.
3. Optional: the X-Forwarded-For check in `docs/owner-setup.md` step 5.

## Open

- The sync report folds closes and hides into "updated"; separate counts need
  contract fields.

## First sync

Run on 2026-11-03, once the estate's todos had become briefs: 23 projects,
78 briefs read, 27 tickets created and 3 that already existed left
unchanged, so 30 tickets in To Do. Done briefs aren't backfilled. churchix
and scoala-ramna-theme reach the board, and Backlog fills, on the next sync
after the deploy (briefs 06 and 07; a dry run finds 25 projects).
The VPS board started empty, so no old ticket shared a number with a new
brief.

## Open briefs

[08, a ticket knows the run that works it](../briefs/todo/08-a-ticket-knows-the-run-that-works-it.md),
written 2026-11-06 from [research-agent-runs.md](research-agent-runs.md) and
sharpened the same day by
[research-agent-runs-elsewhere.md](research-agent-runs-elsewhere.md). It
waits on five owner decisions listed in the brief. The two written
2026-11-03 are done: [06, a Backlog column](../briefs/done/06-a-backlog-column-for-open-todos.md)
and [07, a nested corpus names itself](../briefs/done/07-a-nested-corpus-names-itself.md).

## Todos

- [a-run-lists-what-it-holds](../todos/a-run-lists-what-it-holds.md), after
  brief 08.
- [the-hand-back-goes-on-the-board](../todos/the-hand-back-goes-on-the-board.md),
  questions first; needs no run, so it can go before brief 08.
