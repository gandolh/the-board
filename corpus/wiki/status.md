---
summary: Snapshot as of 2026-11-03, per area. Live on the VPS since 2026-11-03; first sync 2026-11-03 (23 projects, 30 tickets in To Do). The board, CLI, sync and guide built 2026-10-09 and rolled out to every project's CLAUDE.md but vps-deploy's; Base UI under the panel and lanes 2026-10-23. Down since 2026-10-13; briefs 01-05 (2026-11-02) built it for the VPS behind sign-in (sync in group folders, the sub-path, the CLI's token, sign-in, the container and the vps-deploy stack), not deployed, with the owner's steps, which vps-deploy's npm run setup:brief-board runs (2026-11-03); ward-auth 0.7.0 with its rename route off (2026-11-03); the numbering question after the estate restarted brief numbering, closed 2026-11-03; Backlog for open todos (brief 06) and nested corpora naming themselves (brief 07, churchix and scoala-ramna-theme) built 2026-11-03, not deployed; brief 08 (runs: a run on each ticket kept fresh by its writes, release, brief-board runs, sync waiting for a fresh run, the guide's end-move order and its section for a session that runs other agents) built 2026-11-06, not deployed; brief 09 (questions for the owner on the ticket, a badge, brief-board answer and questions, the report lines in the guide) built 2026-11-06, not deployed; brief 10 (each run's duration, worked out from its times, one shared formatter) built 2026-11-06, not deployed; brief 11 (the needs-you list) open; the todo a-run-lists-what-it-holds.
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
- **API server** (2026-10-09; runs and questions 2026-11-06). Fastify + SQLite on
  127.0.0.1:8806, moves enforced by the shared table, serving the built UI.
  Since 2026-11-06 a run on each ticket: opened by a move into In Progress,
  ended by a move out, by `release` or by sync as `stale`, kept fresh by
  every write, stale after `BRIEF_BOARD_STALE_HOURS` (default 4). Questions
  for the owner on each ticket, numbered, open until answered. Not deployed.
- **CLI** (2026-10-09; token 2026-11-02; runs 2026-11-06). Every agent
  command, the address and token lookups, resume, exit 3 when the board is
  down or refuses the token, and `guide`. Since 2026-11-06 `start` opens or
  passes on a run and warns about a fresh one of another author's,
  `release` and `runs` are new, and `show` and `list` show runs; it needs
  the server deployed first. Since 2026-11-06 (brief 09) `--question` on
  `start`, `move` and `comment`, and `answer` and `questions`.
- **Sync** (2026-10-09; group folders 2026-11-02; todos and depth three
  2026-11-03). Reads every project's briefs and open todos, up to three
  folders deep, named by `corpus/board-name` where a corpus has one, and
  corrects the tickets; each open todo has a sync-owned ticket in Backlog
  ([sync.md](sync.md)). Since 2026-11-06 it leaves an In Progress ticket
  whose run is fresh, with a warning, and closes one whose run is stale.
- **Sign-in** (2026-11-02; ward-auth 0.7.0 2026-11-03). The vendored
  ward-auth as the one guard, its rename route off: a local
  account or Sign in with Ward, read-only browser sessions, the CLI's token
  for writes ([sign-in.md](sign-in.md)).
- **Deploy** (2026-11-02). `infrastructure/` builds the `brief-board-api`
  image (checked locally: healthy, 199 MB); vps-deploy's `brief-board` stack
  serves the board at `/brief-board/` and the API at `/brief-board-api` on
  port 8806. Not deployed ([architecture.md](architecture.md), "Running it").
- **Board UI** (2026-10-09, Base UI 2026-10-23, Backlog 2026-11-03, runs
  2026-11-06). Read-only lanes, seven columns with Backlog first, the detail
  panel, polling; an In Progress card shows its run (stale in an orange
  warning tone) or "no run", and the panel lists earlier runs. A card with
  open questions shows a badge counting them, in any column; the panel lists
  the questions, open first. Since brief 10 an In Progress card reads
  "running 40m", a card elsewhere how long its last run took, and a stale
  run at least start to last heard ("≥ 3h 10m"). README images
  retaken 2026-10-31 (they show six columns).
- **Rollout** (2026-10-09). Thirteen repos carry the brief-board section in
  their CLAUDE.md. vps-deploy was skipped because its `corpus/CLAUDE.md` had
  uncommitted work, and on 2026-11-02 it still has no section.

218 tests (2026-11-06, after brief 10); typecheck and lint clean.

## Next (owner)

1. Deploy runs, questions and run durations (briefs 08 to 10), then
   rebuild the local CLI, in that order: the new CLI's `start`, `answer` and `questions` call
   routes only the new server has. From
   vps-deploy: `node cli.ts brief-board deploy` and
   `node cli.ts brief-board server`; then rebuild the CLI as
   `docs/getting-started.md` says (`npm run build` in this repo). The
   migration adds the runs table on first start; tickets already In
   Progress show "no run" until their next start. Then, as a check, a
   `--question` on a test ticket shows its badge on the live board.
2. Deploy the board with Backlog (brief 06), then sync, in that order: a
   board from before Backlog ignores the todos. From vps-deploy:
   `node cli.ts brief-board deploy`; then, from outside a repo,
   `brief-board sync --dry-run` and `brief-board sync`. The migration
   rebuilds the tickets table on first start; the board keeps every ticket,
   comment and history row. The same sync brings churchix and
   scoala-ramna-theme on (brief 07; the CLI already infers their names).
3. For local development only: add brief-board to Ward's local seed
   (`wzd_auth`, `infrastructure/local/seed.mjs`):
   `{ slug: "brief-board", name: "brief-board", repo: "brief-board", envFiles: [".env"], dev: "http://localhost:5178/brief-board/", api: "/brief-board-api" }`
   in `APPS`, and its row in that folder's README table.
4. Optional: the X-Forwarded-For check in `docs/owner-setup.md` step 5.

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

[08, a ticket knows the run that works it](../briefs/done/08-a-ticket-knows-the-run-that-works-it.md),
[09, the hand-back goes on the board](../briefs/done/09-the-hand-back-goes-on-the-board.md)
and [10, a run shows how long it took](../briefs/done/10-a-run-shows-how-long-it-took.md)
are built (2026-11-06), not deployed. Open:
[11, one list of what needs the owner](../briefs/todo/11-one-list-of-what-needs-the-owner.md).

## Todos

- [a-run-lists-what-it-holds](../todos/a-run-lists-what-it-holds.md): its
  no-build guide line went in with brief 08; `hold` and `drop` wait.
