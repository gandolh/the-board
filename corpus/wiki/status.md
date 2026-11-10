---
summary: Snapshot as of 2026-11-03, per area. Live on the VPS since 2026-11-03; first sync 2026-11-03 (23 projects, 30 tickets in To Do). The board, CLI, sync and guide built 2026-10-09 and rolled out to every project's CLAUDE.md but vps-deploy's; Base UI under the panel and lanes 2026-10-23. Down since 2026-10-13; briefs 01-05 (2026-11-02) built it for the VPS behind sign-in (sync in group folders, the sub-path, the CLI's token, sign-in, the container and the vps-deploy stack), not deployed, with the owner's steps, which vps-deploy's npm run setup:brief-board runs (2026-11-03); ward-auth 0.7.0 with its rename route off (2026-11-03); the numbering question after the estate restarted brief numbering, closed 2026-11-03; Backlog for open todos (brief 06) and nested corpora naming themselves (brief 07, churchix and scoala-ramna-theme) built 2026-11-03, not deployed; brief 08 (runs: a run on each ticket kept fresh by its writes, release, brief-board runs, sync waiting for a fresh run, the guide's end-move order and its section for a session that runs other agents) built 2026-11-06, not deployed; brief 09 (questions for the owner on the ticket, a badge, brief-board answer and questions, the report lines in the guide) built 2026-11-06, not deployed; brief 10 (each run's duration, worked out from its times, one shared formatter) built 2026-11-06, not deployed; brief 11 (one derived list of what needs the owner: brief-board needs and a strip above the lanes) built 2026-11-06, not deployed; brief 12 (a run lists what it holds: brief-board hold and drop, the leftovers printed when a run ends, holds in show and runs) built 2026-11-06, not deployed; brief 13 (@fastify/static 10.1.10, the glob advisory gone) built 2026-11-07, not deployed; brief 14 (blocked/ folders: a blocked brief's or todo's ticket waits in Backlog with its condition, brief-board blocked, a badge) built 2026-11-07; briefs 08-14 deployed (the owner confirmed 2026-11-09); brief 15 (a cell past five cards scrolls inside, GET /api/done and an Older Done page for Done past 14 days) built 2026-11-09, not deployed; npm audit's new zod (high) and fast-uri findings open; scripts/seed-demo.ts sends no token; the estate's conventions (house style, Base UI rules, Tailwind, the server structure) filed as briefs 16-19 on 2026-11-10, none built; brief 21 (sprints: every ticket in one, Sprint 1 closed with the Done tickets and Sprint 2 active by migration 7, brief-board sprint and sprint start, list --sprint, a frozen closed sprint, the header's sprint and a Sprints page) built 2026-11-10, not deployed, the migration waiting for the owner's deploy.
updated: 2026-11-10
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
- **API server** (2026-10-09; runs and questions 2026-11-06; older Done 2026-11-09). Fastify + SQLite on
  127.0.0.1:8806, moves enforced by the shared table, serving the built UI.
  Since 2026-11-06 a run on each ticket: opened by a move into In Progress,
  ended by a move out, by `release` or by sync as `stale`, kept fresh by
  every write, stale after `BRIEF_BOARD_STALE_HOURS` (default 4). Questions
  for the owner on each ticket, numbered, open until answered. Since brief
  12 a run's holds, kept on the run when it ends as its leftovers.
  Deployed with briefs 08-14 (confirmed 2026-11-09). Since brief 15,
  `GET /api/done`: Done tickets older than `olderThanDays` (default 14), the
  ones the board no longer shows; not deployed. Since brief 21
  (2026-11-10, not deployed) sprints: migration 7 puts every ticket in one
  (Sprint 1 closed with the Done tickets, Sprint 2 active), the reads cover
  the active sprint, `GET`/`POST /api/sprints` and `GET /api/sprints/:number`,
  and a write on a closed sprint's ticket is 409 `sprint_closed`.
- **CLI** (2026-10-09; token 2026-11-02; runs 2026-11-06). Every agent
  command, the address and token lookups, resume, exit 3 when the board is
  down or refuses the token, and `guide`. Since 2026-11-06 `start` opens or
  passes on a run and warns about a fresh one of another author's,
  `release` and `runs` are new, and `show` and `list` show runs; it needs
  the server deployed first. Since 2026-11-06 (brief 09) `--question` on
  `start`, `move` and `comment`, and `answer` and `questions`; since brief
  11, `needs`; since brief 12, `hold` and `drop`, the leftovers printed by
  the end move and `release`, and holds in `show` and `runs`; since brief
  14, `blocked`, grouped by condition, and `Blocked by:` in `show` and
  `list`; since brief 21, `sprint`, `sprint start <N>` (only on the owner's
  ask, the guide says) and `list --sprint <n>`, which need the new server.
- **Sync** (2026-10-09; group folders 2026-11-02; todos and depth three
  2026-11-03). Reads every project's briefs and open todos, up to three
  folders deep, named by `corpus/board-name` where a corpus has one, and
  corrects the tickets; each open todo has a sync-owned ticket in Backlog
  ([sync.md](sync.md)). Since 2026-11-06 it leaves an In Progress ticket
  whose run is fresh, with a warning, and closes one whose run is stale.
  Since 2026-11-07 (brief 14) it reads `corpus/briefs/blocked/` and
  `corpus/todos/blocked/`: their tickets wait in Backlog with their condition, off
  the needs list, and a brief back in `todo/` goes to To Do. Deployed
  (confirmed 2026-11-09). Since brief 21 it writes the active sprint's
  tickets only and never a closed sprint's ([sync.md](sync.md)).
- **Sign-in** (2026-11-02; ward-auth 0.7.0 2026-11-03). The vendored
  ward-auth as the one guard, its rename route off: a local
  account or Sign in with Ward, read-only browser sessions, the CLI's token
  for writes ([sign-in.md](sign-in.md)).
- **Deploy** (2026-11-02). `infrastructure/` builds the `brief-board-api`
  image (checked locally: healthy, 199 MB); vps-deploy's `brief-board` stack
  serves the board at `/brief-board/` and the API at `/brief-board-api` on
  port 8806, live since 2026-11-03 ([architecture.md](architecture.md),
  "Running it").
- **Board UI** (2026-10-09, Base UI 2026-10-23, Backlog 2026-11-03, runs
  2026-11-06). Read-only lanes, seven columns with Backlog first, the detail
  panel, polling; an In Progress card shows its run (stale in an orange
  warning tone) or "no run", and the panel lists earlier runs. A card with
  open questions shows a badge counting them, in any column; the panel lists
  the questions, open first. Since brief 10 an In Progress card reads
  "running 40m", a card elsewhere how long its last run took, and a stale
  run at least start to last heard ("≥ 3h 10m"). Since brief 11 a strip
  above the lanes counts what needs the owner ("3 questions · 1 blocked ·
  2 to test") and narrows the board to one kind at a click; it hides when
  nothing waits. Since brief 14 a blocked card shows "Blocked by: …" in
  Backlog's colour, after the other Backlog cards, and the panel shows the
  condition in full. Since brief 15 (2026-11-09, not deployed) a cell past
  five cards stops at about five cards' height and scrolls inside, and an
  Older Done page, linked from the header, lists Done tickets older than 14
  days by project ([board-ui.md](board-ui.md)). Since brief 21 (not
  deployed) the board is the active sprint's, the header names it
  ("Sprint 2 · since 2026-11-10"), and a Sprints page lists the closed ones
  with their Done tickets. README images retaken 2026-10-31 (they show six
  columns).
- **Rollout** (2026-10-09). Thirteen repos carry the brief-board section in
  their CLAUDE.md. vps-deploy was skipped because its `corpus/CLAUDE.md` had
  uncommitted work, and on 2026-11-02 it still has no section.

311 tests (2026-11-10, after brief 21); typecheck, lint and the build clean.

## Next (owner)

1. Deploy brief 21 (sprints), which ships brief 15 with it. Its migration
   rewrites every ticket's row on the live database at the first start, so:
   re-run `brief-board questions` (an open question on a Done ticket is
   frozen in Sprint 1; none on 2026-11-10); from vps-deploy,
   `node cli.ts brief-board deploy` (build and upload, nothing restarts);
   back up the SQLite file before the `server` phase, which restarts the
   process and runs the migration: on the box
   `docker stop $(docker ps -qf name=brief-board-api)` and
   `sudo cp -a /srv/brief-board-api/data /srv/brief-board-api/data.before-sprints`,
   or the deploy's usual backup; then `node cli.ts brief-board server`.
   The local CLI was rebuilt from main during the build (2026-11-10): its
   old commands work against the old server, and `sprint` and
   `list --sprint` answer "no route" until the deploy; rebuild it
   (`npm run build` here) if main moved on. After the deploy, check
   `brief-board sprint` says "Sprint 2, since <the deploy day>" and
   `brief-board list --sprint 1 --all` lists the Done tickets. Starting
   Sprint 3 is the owner's call: ask an agent for `brief-board sprint start 3`.
2. Deploy brief 15 (long cells scroll, Older Done): from vps-deploy,
   `node cli.ts brief-board deploy` and then `node cli.ts brief-board server`.
   No migration, and the CLI doesn't change. Then the imbatranimOS lane's
   Done cell scrolls, and Older Done says "Nothing older than 14 days yet."
   until 2026-11-17. Briefs 08-14 are deployed (the owner confirmed on
   2026-11-09), and the local CLI was rebuilt from main with brief 15's
   build. Still unconfirmed from the 08-14 deploy: a `--question` on a test
   ticket shows its badge on the live board (`brief-board needs` listing the
   Ready for deploy tickets was seen working on 2026-11-09).
3. Backlog (brief 06) and nested corpora (brief 07) are deployed: the owner
   deployed the board on 2026-11-04 and synced it since (last on 2026-11-05).
4. For local development only: add brief-board to Ward's local seed
   (`wzd_auth`, `infrastructure/local/seed.mjs`):
   `{ slug: "brief-board", name: "brief-board", repo: "brief-board", envFiles: [".env"], dev: "http://localhost:5178/brief-board/", api: "/brief-board-api" }`
   in `APPS`, and its row in that folder's README table.
5. Optional: the X-Forwarded-For check in `docs/owner-setup.md` step 5.

## Open

- The sync report folds closes and hides into "updated"; separate counts need
  contract fields.
- `scripts/seed-demo.ts` sends no `Authorization` header, so since the
  CLI's token (2026-11-02) the board refuses it with a 401. Found while
  walking brief 15 on 2026-11-09; that walk used a scratch seed instead.
- `npm audit` (2026-11-07) still lists `zod` below 4.6.6 (high,
  GHSA-mrhx-c7xc-m3w5; direct in `shared` and `server`), `fast-uri` under
  Fastify (moderate) and `minimatch` through eslint (moderate, dev only).
  No todo yet; see brief 13's outcome.

## First sync

Run on 2026-11-03, once the estate's todos had become briefs: 23 projects,
78 briefs read, 27 tickets created and 3 that already existed left
unchanged, so 30 tickets in To Do. Done briefs aren't backfilled. churchix
and scoala-ramna-theme reach the board, and Backlog fills, on the next sync
after the deploy (briefs 06 and 07; a dry run finds 25 projects).
The VPS board started empty, so no old ticket shared a number with a new
brief.

## Open briefs

[21, sprints](../briefs/done/21-sprints.md) is built (2026-11-10), not
deployed; it ran before 19, whose move map gains a `sprints` feature.
Filed 2026-11-10 from the owner's calls of 2026-11-09, in run order, none built:
[16, the house style and the quality harness](../briefs/todo/16-the-house-style-and-the-quality-harness.md),
[17, Base UI by the conventions](../briefs/todo/17-base-ui-by-the-conventions.md),
[18, the web app to Tailwind](../briefs/todo/18-the-web-app-to-tailwind.md) and
[19, the server in the code structure](../briefs/todo/19-the-server-in-the-code-structure.md).
No bump brief: `@base-ui/react` is pinned at 1.9.0 and the lockfile resolves it.
The rest of this list is built: [08, a ticket knows the run that works it](../briefs/done/08-a-ticket-knows-the-run-that-works-it.md),
[09, the hand-back goes on the board](../briefs/done/09-the-hand-back-goes-on-the-board.md),
[10, a run shows how long it took](../briefs/done/10-a-run-shows-how-long-it-took.md)
and [11, one list of what needs the owner](../briefs/done/11-one-list-of-what-needs-the-owner.md)
are built (2026-11-06), merged into main the same day.
[12, a run lists what it holds](../briefs/done/12-a-run-lists-what-it-holds.md)
is built (2026-11-06).
[13, @fastify/static moves to 10.1.9](../briefs/done/13-fastify-static-moves-to-10-1-9.md)
is built (2026-11-07, at 10.1.10).
[14, a blocked brief or todo waits in Backlog](../briefs/done/14-a-blocked-brief-or-todo-waits-in-backlog.md)
is built (2026-11-07); 08 to 14 are deployed (confirmed 2026-11-09).
[15, a long cell scrolls and older Done gets a page](../briefs/done/15-a-long-cell-scrolls-and-older-done-gets-a-page.md)
is built (2026-11-09), not deployed.

## Todos

None. The last one became brief 12 (`hold` and `drop`), built 2026-11-06;
its no-build guide line went in with brief 08.
