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

The repo is the owner's `gandolh/the-board`, cloned in place. npm workspaces
`shared`, `server`, `web` and `cli` on Ward's pins, with Fastify 5.12.5 for the
audit's sake and `shell-quote` overridden under `concurrently`. A clean-tree
install, typecheck, lint, test and build pass; the placeholder server answers
on 127.0.0.1:8806 and the CLI prints its version with plain `node`.

## [2026-10-09] done | Brief 02: shared model and API contract

Statuses, the twelve-row move table with `checkMove`, keys that split on the
last `-<digits>`, and zod schemas for all seven routes are in `shared`. One test
per move row, unlisted moves, and the key cases from the brief. Briefs 03, 04
and 07 can now run against it.
