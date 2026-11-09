# Log

## [2026-10-08] decision | Corpus bootstrapped, first design round settled

Created the directory and corpus during a grill-me session. Settled: one
ticket per brief keyed `<project>-<NN>` with no hand-made tickets, Blocked
only by agreement with the owner and no notifications, and the messages
required on In Progress to Blocked and Blocked to Done. See
[wiki/decisions.md](wiki/decisions.md). The rest is in
[wiki/open-questions.md](wiki/open-questions.md).

## [2026-10-08] decision | Second design round: name, local first, one CLI

The name is brief-board. The board runs locally first and moves to the VPS
later, so its address is configuration, not code. The only client is a CLI in
this repo, and other repos name brief-board in their CLAUDE.md without a path.
Lanes will come from tags, with the project as a tag. Details are in
[wiki/open-questions.md](wiki/open-questions.md).

## [2026-10-08] decision | Third design round: six columns, corpus wins

Added Ready for test and Ready for deploy before Done, for work the owner has
to try or deploy. To Do can't go straight to Blocked. Blocked to In Progress
needs a comment. The corpus stays the source of truth and the board is a view
of it. See [wiki/decisions.md](wiki/decisions.md).

## [2026-10-08] decision | Fourth design round: read-only UI, tags, CLI on PATH

The UI stays read-only, and the owner asks an agent to make their moves. Each
ticket has one project tag that decides its lane. Other tags are labels. The
CLI goes on PATH with `npm link` and reads the board address from a user-level
file, so no repo holds a path to brief-board. Each project's CLAUDE.md points
at `brief-board guide`. Wrote [wiki/architecture.md](wiki/architecture.md).

## [2026-10-08] decision | Sync only by hand

The owner chose to run `brief-board sync` by hand and accepted that the board
can go stale between runs. Rejected syncing before every CLI command and a
server timer. See [wiki/decisions.md](wiki/decisions.md).

## [2026-10-08] decision | Design settled: move table, board is optional

The owner corrected the server plan: the board may be down, the agent says so
and carries on, and the owner starts it. No container for now. The full move
table and its required messages are locked in
[wiki/decisions.md](wiki/decisions.md). Nothing is left in
[wiki/open-questions.md](wiki/open-questions.md).

## [2026-10-08] todo | Briefs 01 to 08 filed

Filed the eight briefs that build the board: scaffold, shared model and API
contract, API server, CLI, sync, the guide, read-only UI, and the rollout to
every project's CLAUDE.md. Order and one-line states are in
[wiki/status.md](wiki/status.md). Brief 01 waits for the owner to create the
git repo.

## [2026-10-09] done | Brief 01: workspace scaffold

The repo is the owner's `<owner>/the-board`, cloned in place. npm workspaces
`shared`, `server`, `web` and `cli` on Ward's pins, with Fastify 5.12.5 for the
audit's sake and `shell-quote` overridden under `concurrently`. A clean-tree
install, typecheck, lint, test and build pass; the placeholder server answers
on 127.0.0.1:8806 and the CLI prints its version with plain `node`.

## [2026-10-09] done | Brief 02: shared model and API contract

Statuses, the twelve-row move table with `checkMove`, keys that split on the
last `-<digits>`, and zod schemas for all seven routes are in `shared`. One test
per move row, unlisted moves, and the key cases from the brief. Briefs 03, 04
and 07 can now run against it.

## [2026-10-09] done | Brief 03: API server

Fastify + better-sqlite3 on 127.0.0.1:8806 with the seven contract routes,
moves enforced by the shared table, and sync as the one writer that corrects
status without it. 38 inject tests; the board served from a file under
`data/`.

## [2026-10-09] done | Brief 04: the brief-board CLI

`create`, `start` (a resume when already In Progress), `move`, `comment`,
`show` and `list`, with the move checked locally first so agents learn the
table from the CLI. Address from env, repo `.env`, user config, default; exit 3
with one line when the board is down. Ran from atrium's repo against a scratch
board.

## [2026-10-09] done | Brief 07: read-only board UI

A Jira-style board: sticky column headers, a lane per project (open lanes
first, Done-only lanes collapsed), cards with their time in the column, and a
read-only detail panel with markdown, role-labelled comments and history. Polls
every 10 s, pauses when hidden, and keeps the last data behind a banner when the
API is down. Light and dark follow the system; at 390 px only lanes scroll
sideways. `scripts/seed-demo.ts` fills a scratch board.

## [2026-10-09] done | Brief 05: sync

`brief-board sync` reads every project's `corpus/briefs/` under the projects
directory, takes titles from the H1 and summaries from Context or Problem, and
sends one request. `--dry-run` against `~/projects` saw 14 projects. Close and
hide counts fold into "updated", because the contract carries no separate
fields for them.

## [2026-10-09] done | Brief 06: the guide

`brief-board guide` prints the rules in 76 lines: what the board is, filing,
starting and resuming, blocking only by agreement, picking the finishing
column, mapping the owner's reports to moves, the down board, the hard rules,
and the move table rendered from `shared`.

## [2026-10-09] done | Brief 08: roll out to every project

Thirteen repos got the brief-board section in their CLAUDE.md, each in its own
one-file commit; brief-board's own is in this commit. vps-deploy was skipped
because its `corpus/CLAUDE.md` has uncommitted work. The README's owner setup
covers build, `npm link`, start, config and sync. The board is complete, and
waits on the owner's setup.

## [2026-10-23] todo | Brief 09 filed: Base UI for the panel and the lanes

The owner asked for Base UI in the apps that still hand-build their widgets.
Brief 09 moves the detail panel to a
non-modal Base UI `Dialog` and the lanes to `Collapsible`; the tag filter
stays a native select. brief-board is down (since 2026-10-13), so this is
recorded here only.

## [2026-10-23] done | Brief 09: Base UI for the panel and the lanes

The detail panel is a non-modal Base UI `Dialog` and the lanes are
`Collapsible`s (`9012a73`). Focus now returns to the card when the panel
closes. The decision is in [decisions.md](wiki/decisions.md); details are in
brief 09. brief-board is down (since
2026-10-13), so it isn't on the board.

## [2026-10-31] maintenance | README images retaken after brief 09's Base UI move

A README refresh pass with the readme-docs standard. Brief 09 (2026-10-23) put Base UI under the detail panel and the lanes, after the images were taken on 2026-10-09, so `board.webp` and `ticket-detail.webp` were taken again on a throwaway board (port 8807, a temporary database, three made-up projects synced and moved with the CLI) as `docs/images/shots.md` describes. The README is current. Checked: `npm install`, `npm run build` and `npm start`.

## [2026-11-02] maintenance | Briefs reset

Part of an estate-wide reset. The nine briefs in `briefs/done/` are folded
into the wiki and deleted; brief numbering restarts at 01. The old briefs read
like the grilling that fed the first corpus. The last commit that held them is
`acd7f39`: read one with `git show acd7f39:corpus/briefs/done/05-sync.md`.
Brief numbers in the entries above refer to that set.

New page: [sync.md](wiki/sync.md), the sync rules per brief state.
[architecture.md](wiki/architecture.md) gained keys, the CLI's exit codes, the
server's error codes, the board UI's behaviour and the build gotchas.
[status.md](wiki/status.md) is a per-area snapshot instead of a brief list.
New todo: sync after the numbering restart (closed 2026-11-03),
since sync keys tickets by number and every repo now restarts at 01. Code
comments no longer cite brief numbers.

## [2026-11-02] plan | Briefs 01-05: the board moves to the VPS

The owner asked for the board on the VPS. They chose a sub-path on the main
domain (`/brief-board/`, the API at `/brief-board-api`) over a host of its
own, and sign-in like the other apps: "Sign in with Ward", plus a local
account in the board's SQLite for when Ward is down. Five briefs, run in
order: 01 sync finds projects in group folders (since 2026-11-01 it finds
none), 02 the sub-path, 03 the CLI's bearer token, 04 sign-in, 05 the
container, the vps-deploy stack on port 8806 and the owner's docs. The
decisions are recorded as the briefs build them; 05 revisits "A down board
never stops work". None is built.

## [2026-11-02] build | Brief 01 — Sync finds projects in group folders

[Brief 01](briefs/done/01-sync-group-folders.md), `5c66c61`. Sync looks one
group folder down for projects and names them by their own directory; two
projects with one name stop the run. A dry run against the real projects
directory found 21 projects. Deeper corpora (churchix, the scoala-ramna
theme) stay unfound, as [sync.md](wiki/sync.md) says.

## [2026-11-02] build | Brief 02 — The board at /brief-board/

[Brief 02](briefs/done/02-sub-path.md), `534c8d5`. The board builds for
`/brief-board/` and calls the API at `/brief-board-api`; the server strips
that prefix when reached directly, serves the board under `/brief-board/` and
redirects `/` there. [architecture.md](wiki/architecture.md) has the paths.

## [2026-11-02] build | Brief 03 — The CLI's token

[Brief 03](briefs/done/03-cli-token.md), `98395b1`. With `BRIEF_BOARD_TOKEN`
set, the API wants `Authorization: Bearer <token>` everywhere but health; the
CLI reads it from its environment or the user config and exits 3 when the
board refuses it. New decision: "The CLI authenticates with one shared token"
([decisions.md](wiki/decisions.md)).

## [2026-11-02] build | Brief 04 — Sign-in

[Brief 04](briefs/done/04-sign-in.md), `8922605`. The board sits behind the
vendored ward-auth 0.3.1 guard: a local account from the seed, or Sign in
with Ward; browser sessions only read, and the CLI's token still writes.
ward-auth's source is at 0.7.0; the brief's 0.3.1 was kept. New page:
[sign-in.md](wiki/sign-in.md). New decision: "On the VPS at /brief-board,
behind sign-in like the other apps". The wzd_auth seed entry is an owner step,
since this run could only read that repo.

## [2026-11-02] build | Brief 05 — The container and the VPS stack

[Brief 05](briefs/done/05-vps-deploy.md). `infrastructure/` builds the
`brief-board-api` image, checked locally; vps-deploy's `brief-board` stack
(`9589eab` there) serves the board at `/brief-board/` and the API on loopback
8806, with `BRIEF_BOARD_TOKEN` a required secret beside the Ward client key.
`docs/owner-setup.md` has the owner's steps. Not deployed.

**Revisit:** "A down board never stops work" in
[decisions.md](wiki/decisions.md). The always-on container with a restart
policy, rejected on 2026-10-08, is now what runs; agents still carry on when
the board is down, and sync recovers the moves.

## [2026-11-03] update | ward-auth 0.7.0, and a setup script in vps-deploy

The owner asked to take Ward's library to its latest version and for a script
to configure the board. Both vendored copies (`server/vendor/ward`,
`web/vendor/ward`) moved from 0.3.1 to 0.7.0 with wzd_auth's `npm run vendor`.
The upgrade notes ask for nothing but one call: 0.4.0's `POST /auth/username`
is on by default and sits outside the `/api` read-only rule, so a browser
session could rename itself. `wardAuth` gets `allowRename: false`, with a test
that the route is gone. 0.6.0's migration runs on open; 0.7.0's `returnTo`
already comes from the login page. Typecheck, lint, 140 tests and the build
pass. vps-deploy's `npm run setup:brief-board` now runs the owner's steps
(that repo's log has it); [docs/owner-setup.md](../docs/owner-setup.md) points
at it and keeps each step by hand. Not deployed.

## [2026-11-03] deploy | Live on the VPS

The owner ran vps-deploy's `npm run setup:brief-board`, signed in and linked
Ward. The CLI reads the live board ("No tickets"). `brief-board sync
--dry-run` found 21 projects and three open briefs (imbatranimOS 22, lantern
01, ro-housing 01); done briefs are not backfilled. The board started empty,
so the restarted numbers meet no old tickets on the first sync.

## [2026-11-03] decision | A Backlog column and self-naming corpora; briefs 06-07; the numbering todo closed

From an estate-wide grill with the owner about every open todo. Two calls, recorded in
[decisions.md](wiki/decisions.md) and [glossary.md](wiki/glossary.md): open todos get sync-owned
tickets in a new first column, Backlog (a revisit of "One ticket per brief"), and a corpus nested
one folder deeper names itself, as churchix and scoala-ramna-theme now do in `corpus/board-name`.
[Brief 06](briefs/done/06-a-backlog-column-for-open-todos.md) builds the Backlog column and
[brief 07](briefs/done/07-a-nested-corpus-names-itself.md) the deeper sync and the name. The todo
`sync-after-numbering-restart` is closed, not built: the VPS board started empty, so the first
sync meets no old ticket, and corpus-flow now says brief numbers never restart. It is deleted;
[sync.md](wiki/sync.md) and [status.md](wiki/status.md) say so.

## [2026-11-03] sync | The first sync

`brief-board sync --dry-run`, then `brief-board sync`, from this machine against the VPS board:
23 projects, 78 briefs, 27 created, 0 updated, 3 unchanged (imbatranimOS-22, lantern-01 and
ro-housing-01 already existed). `brief-board list --all` shows 30 tickets, all To Do.
[status.md](wiki/status.md) drops the step from the owner's list.

## [2026-11-03] done | Brief 06, a Backlog column for open todos

[Brief 06](briefs/done/06-a-backlog-column-for-open-todos.md), `93a2f10`. Sync reads each
project's open todos (top level of `corpus/todos/`) and keeps a sync-owned ticket per todo in
Backlog, the new first column, keyed `<project>:<slug>` with no number. Moves, comments and
upserts on one are refused (`sync_owned`) with a pointer to promoting the todo. The schema
migration rebuilds `tickets` with foreign keys off, since the drop would otherwise cascade into
comments and history. A dry run against the live board found imbatranimOS's five open todos.
163 tests; not deployed. The board has to be deployed before the next sync, or it drops the
todos ([status.md](wiki/status.md)).

## [2026-11-03] done | Brief 07, a nested corpus names itself

[Brief 07](briefs/done/07-a-nested-corpus-names-itself.md), `4082bac`. Sync finds projects up to
three folders deep, looking into projects as well as plain folders, and names one by its
`corpus/board-name` when it has one; a name a key can't hold stops the run. Commands that infer
the project read the nearest corpus's `board-name`, and `create` finds the brief in that corpus.
A dry run finds 25 projects, churchix and scoala-ramna-theme among them, and presentation-sites
under its own name. 170 tests; the sync that files them is the owner's, after the deploy.

## [2026-11-06] research | Agent runs on the board, from HyperAgent

The owner asked whether HyperAgent has anything for the board's style or for
managing agents. [research-agent-runs.md](wiki/research-agent-runs.md) holds
the evidence from the five-agent run of 2026-11-05 (sync closed a ticket
mid-run, stopped agents left tickets In Progress and a dev server running,
the hand-backs lived in chat), the four HyperAgents and the pattern each
offers, and the ranking. Brief 08 (a ticket knows the run that works it) is
the first step; two todos, `a-run-lists-what-it-holds` and
`the-hand-back-goes-on-the-board`, wait on it. "Run" is in the glossary as
proposed.


## [2026-11-06] research | Agent runs elsewhere; brief 08 and both todos sharpened

The owner asked to dig deeper than HyperAgent.
[research-agent-runs-elsewhere.md](wiki/research-agent-runs-elsewhere.md)
reads beads, Linear's agent sessions, GitHub's Copilot cloud agent,
vibe-kanban, A2A and MCP tasks, SQS, Temporal and Kubernetes Leases, and
Claude Code, OpenHands, SWE-agent, Taskmaster and LangGraph, and judges five
questions against [decisions.md](wiki/decisions.md). Brief 08 now keeps a run
alive by its own board writes, with no heartbeat command and stale after 4
hours by default; it records how a run ended, adds `brief-board runs` and a
guide section for the session that runs agents, and lists five owner
decisions. The todo `the-hand-back-goes-on-the-board` puts questions on the
ticket as a derived badge, with `brief-board questions`, and can go before 08;
`a-run-lists-what-it-holds` has the smallest `hold` and a guide line that
needs no build. No `next` command and no new todo.
[status.md](wiki/status.md) lists brief 08 and the two todos. Ticket
brief-board-08's summary updated.

## [2026-11-06] decision | Brief 08's five calls; the hand-back becomes brief 09

The owner took brief 08's default on all five: a run is stale after 4
hours without a write, liveness comes from the run's own writes (no
`beat`), the revisit note on "The corpus wins; the board is a view",
`release` by whoever stops an agent, and `--author` asked for, not
required. The todo `the-hand-back-goes-on-the-board` was promoted to brief
09 with the derived badge (not a seventh column) and `brief-board
questions`; it needs no run. The todo `a-run-lists-what-it-holds` stays a
todo for `hold` and `drop`; its no-build guide line (long-lived processes
as background tasks, stopped before the end move) joins brief 08's step 8.

## [2026-11-06] research | Hyperagent, the platform the owner meant

The owner said the HyperAgent they meant is hyperagent.com, the hosted agent
platform from the Airtable team (now Hyperagent, Inc.), seen in ThePrimeagen's
promos. [research-hyperagent-platform.md](wiki/research-hyperagent-platform.md)
has what it is, its fleet patterns against briefs 08 and 09, and three ranked
candidates: run duration and tokens on the board, one needs-you list, and a
Discord nudge from just-a-bot. ThePrimeagen's segments could not be found. No
brief or todo written; [research-agent-runs.md](wiki/research-agent-runs.md)
points to the new page.

## [2026-11-06] decision | Briefs 10 and 11 from the hyperagent.com research

The owner picked two of the three candidates: brief 10, a run shows how
long it took (derived from brief 08's times, nothing stored), with a
`Tokens:` report line added to brief 09's guide step; and brief 11, one
derived list of what needs the owner (open questions, Blocked, stale runs,
Ready for test and deploy) as `brief-board needs` and a strip on the board.
The Discord nudge from just-a-bot wasn't picked.

## [2026-11-06] decision | Briefs 10 and 11 decided

A stale run's duration reads as at least start to last heard; the needs-you
list holds open questions, Blocked tickets, stale runs, Ready for test and
Ready for deploy, shown as a strip of counts above the lanes, hidden at all
zeros. All as written.

## [2026-11-06] done | Brief 08, a ticket knows the run that works it

[Brief 08](briefs/done/08-a-ticket-knows-the-run-that-works-it.md),
`44a1222` on the branch `briefs-2026-11-06`. A ticket now records its runs:
any move into In Progress opens one, any move out ends it, every write keeps
it fresh, and after 4 hours with none it reads as stale. `start` passes an
open run to a new author and warns when it was fresh; `release` and `runs`
are new; sync leaves a ticket whose run is fresh and closes one whose run
is stale. The guide puts the end move before the brief goes to `done/` and
has a section for a session that runs other agents.
[decisions.md](wiki/decisions.md) has the revisit note on "The corpus wins";
[glossary.md](wiki/glossary.md) has Run and Stale; [sync.md](wiki/sync.md)
and [status.md](wiki/status.md) are updated. 199 tests. Not deployed: the
server goes first, then the local CLI rebuild.

## [2026-11-06] done | Brief 09, the hand-back goes on the board

[Brief 09](briefs/done/09-the-hand-back-goes-on-the-board.md), `f5d0712`
on the branch `briefs-2026-11-06`. Agents ask the owner with `--question`
on a move, comment or start; each question is numbered on its ticket, the
card counts the open ones in a badge in any column, `brief-board answer`
closes one with the owner's answer, and `brief-board questions` lists the
open ones across projects. The guide asks the end move for four report
lines and questions as `--question`; the controller adds `Tokens:` as a
comment when its runtime reports usage. [glossary.md](wiki/glossary.md)
has Question. 213 tests. Not deployed; it goes with brief 08's deploy.

## [2026-11-06] done | Brief 10, a run shows how long it took

[Brief 10](briefs/done/10-a-run-shows-how-long-it-took.md), `cd173e8` on
the branch `briefs-2026-11-06`. A run's duration is worked out from the
times the board keeps, nothing stored: "running 40m" on an In Progress
card, "took 1h 20m" for a run that ended, and at least start to last heard
for a stale one ("ran ≥ 3h 10m"). One formatter in `shared` serves the
board and the CLI's `show` and `runs`. 218 tests. Not deployed; it goes
with briefs 08 and 09.

## [2026-11-06] done | Brief 11, one list of what needs the owner

[Brief 11](briefs/done/11-one-list-of-what-needs-the-owner.md), `88ffb13`
on the branch `briefs-2026-11-06`. One derived list of what waits on the
owner: open questions, Blocked tickets, stale runs, Ready for test and
Ready for deploy, oldest first in each, from a new read route. `brief-board
needs` prints it; a strip above the lanes counts each kind and narrows the
board to one at a click, and hides when nothing waits. The guide tells a
session that runs agents to show `needs` first at a hand-back. Briefs 08 to
11 are all built on that branch, 229 tests, and go out in one deploy: the
server first, then the local CLI rebuild.

## [2026-11-06] todo | Brief 12: a run lists what it holds

Promoted from the todo at the owner's ask: `hold` and `drop` on a run's
ports, pids, containers and paths, a warning (never a lock) on a clash, and
the leftovers printed and kept when the run ends or is released. Built after
brief 08, deployed with it if 08-11 aren't live yet.

## [2026-11-06] done | Brief 12, a run lists what it holds

[Brief 12](briefs/done/12-a-run-lists-what-it-holds.md), `b4aafc0` on the
branch `brief-12-2026-11-06`. `brief-board hold <ticket>
port|pid|container|path <value>` and `drop` record what a run started that
outlives a command, in a `holds` table keyed by run. A hold on what another
open run holds warns and goes ahead. The end move and `release` print what
the run still held, and the ended run keeps it as its leftovers; `show` and
`runs` list holds. Two guide lines: hold what outlives a command and drop it
when you stop it, and a release's holds are what to clean up.
[glossary.md](wiki/glossary.md) has Hold and Leftover. 243 tests. Not
deployed; it goes out with briefs 08 to 11, the server first, then the local
CLI rebuild.

## [2026-11-06] todo | Brief 13: @fastify/static to 10.1.9, not before 2026-11-18

Filed with Wicket's brief 09 for the same bump, at the owner's ask: the fix
came out on 2026-11-04 and waits until 2026-11-18, and the build waits for
the deploy of briefs 08-12, since a typecheck here rebuilds the CLI every
agent uses.

## [2026-11-07] done | Brief 13, @fastify/static at 10.1.10

[Brief 13](briefs/done/13-fastify-static-moves-to-10-1-9.md), `aa9e921`, built at the
owner's ask on 2026-11-07, before its 2026-11-18 date. `@fastify/static`
10.1.10 (the current 10.1.x) pinned in `server/package.json`; `glob` 14.0.4
in the lockfile, and GHSA-3g3m-2fjr-6pw4 no longer in `npm audit`. The
audit's other findings are new since 2026-11-06 and were left: `zod`
(high, direct), `fast-uri` (moderate, under Fastify), `minimatch` (moderate,
dev only, through eslint). 243 tests, typecheck and lint pass; the built
server serves the page. Deploys with briefs 08-12.

## [2026-11-07] done | Brief 14, a blocked brief or todo waits in Backlog

[Brief 14](briefs/done/14-a-blocked-brief-or-todo-waits-in-backlog.md),
`bacab80`, after a grill where the owner took every default: Backlog with a
badge, `brief-board blocked`, off the needs list, the folder named
`blocked/` with Blocked and Blocked by kept apart. Two calls settled there:
an agent whose brief waits mid-run moves the file and releases its run, and
sync treats an In Progress ticket with no open run like a stale one. Sync
reads `briefs/blocked/` and `todos/blocked/`; a ticket keeps its condition
in a new `blocked_by` column (migration 6). Outside the file list: the
Backlog refusal in `app.ts` and its CLI twin, and the stale-run wording in
`web/src/runs.ts`. [sync.md](wiki/sync.md), [glossary.md](wiki/glossary.md)
(Blocked by), [decisions.md](wiki/decisions.md) (one ticket per brief
revisited; Blocked by agreement stands) and [status.md](wiki/status.md)
follow. 270 tests. Not deployed; it goes out with briefs 08-13.

## [2026-11-09] todo | Brief 15: a long cell scrolls and older Done gets a page

[Brief 15](briefs/done/15-a-long-cell-scrolls-and-older-done-gets-a-page.md),
written at the owner's ask: the Done column grows too tall. The 14-day Done
window already exists (`DEFAULT_DONE_DAYS`), but the board went live on
2026-11-03, so all 108 Done cards were inside it (imbatranimOS 32). The brief
caps every cell at about five cards with a scroll and adds an "Older Done" page
behind `GET /api/done`. Its four calls are the writer's defaults; the owner
can change them before the build. It waits for the deploy of briefs 08-14.

## [2026-11-09] done | Brief 15, a long cell scrolls and older Done gets a page

[Brief 15](briefs/done/15-a-long-cell-scrolls-and-older-done-gets-a-page.md),
`d061f22`, built on main once the owner confirmed briefs 08-14 were
deployed; the four owner decisions stood as written. A cell holding more
than five cards gets `.cell-long`, which stops it at 600px (about five Done
cards) and scrolls it inside; one of five or fewer is unchanged. `GET
/api/done` (`tag`, `olderThanDays`) lists Done tickets past the board's
cutoff (strictly before it, where the board keeps at-or-after), by project,
newest first, and the Older Done page at `<base>done` shows them with the
board's detail panel and tag filter, which carries between the two pages.
The header moved to `web/src/TopBar.tsx`, shared by both pages. The Board
UI section of [architecture.md](wiki/architecture.md) went to its own page,
[board-ui.md](wiki/board-ui.md), past the 200-line cap.
[status.md](wiki/status.md) follows and now records 08-14 as deployed.
Found: `scripts/seed-demo.ts` sends no token and gets a 401 (in status.md,
Open). 283 tests. Not deployed.
