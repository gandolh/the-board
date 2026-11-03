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
[Brief 06](briefs/todo/06-a-backlog-column-for-open-todos.md) builds the Backlog column and
[brief 07](briefs/todo/07-a-nested-corpus-names-itself.md) the deeper sync and the name. The todo
`sync-after-numbering-restart` is closed, not built: the VPS board started empty, so the first
sync meets no old ticket, and corpus-flow now says brief numbers never restart. It is deleted;
[sync.md](wiki/sync.md) and [status.md](wiki/status.md) say so.

## [2026-11-03] sync | The first sync

`brief-board sync --dry-run`, then `brief-board sync`, from this machine against the VPS board:
23 projects, 78 briefs, 27 created, 0 updated, 3 unchanged (imbatranimOS-22, lantern-01 and
ro-housing-01 already existed). `brief-board list --all` shows 30 tickets, all To Do.
[status.md](wiki/status.md) drops the step from the owner's list.
