# brief-board corpus index

Start here. Triage on the summary lines and open at most 2-3 pages.

- [CLAUDE.md](CLAUDE.md) - the rules for this corpus
- [routing.md](routing.md) - which skill runs the work, which layer answers which question
- [log.md](log.md) - chronological record of meaningful changes

## Wiki

<!-- BEGIN CATALOG -->

- [wiki/architecture.md](wiki/architecture.md) - How brief-board is put together, as built 2026-10-09, with the 2026-11-02 sub-path, token and sign-in. npm workspaces with a Fastify + SQLite API, a read-only Vite + React board, and the brief-board CLI that agents use; how the CLI finds the board without any repo holding a path; keys, the CLI's exit codes, the server's error codes, how the board UI polls and lays out, build gotchas, and what each project's CLAUDE.md says. The owner starts the server by hand on 127.0.0.1:8806.
- [wiki/decisions.md](wiki/decisions.md) - Locked calls for brief-board, each with date, rejected alternative and reason. One ticket per brief keyed <project>-<NN> with no hand-made tickets; Blocked only by agreement with the owner; which moves are allowed and which need a message; six columns with Ready for test and Ready for deploy as the owner's; the corpus wins over the board; one CLI on PATH that other repos name without a path; a read-only UI; one project tag per ticket decides its lane; sync only by hand; a down board never stops work; Base UI for the UI's widgets; the CLI authenticates with one shared token, and the board sits on the VPS behind sign-in (2026-11-02). Read before proposing to change any of these.
- [wiki/glossary.md](wiki/glossary.md) - The board's vocabulary. Ticket vs brief, project, lane, project tag and tag, sync, the guide, the six statuses (To Do, In Progress, Blocked, Ready for test, Ready for deploy, Done), and the messages a move can carry (conclusion, block reason, confirmation, test notes, deploy steps), each with the words they replace.
- [wiki/open-questions.md](wiki/open-questions.md) - Genuinely unresolved design questions. Empty as of 2026-10-08, after the grill-me session settled the design.
- [wiki/overview.md](wiki/overview.md) - What brief-board is (one Jira-style board, a lane per project, showing where every corpus brief across ~/projects stands), what it adds on top of the corpus, and what it deliberately leaves to the corpus.
- [wiki/sign-in.md](wiki/sign-in.md) - How the board decides who gets in, as built 2026-11-02. The vendored ward-auth 0.3.1 plugin as the one guard; a local account from the seed or Sign in with Ward; the CLI's bearer token; read-only browser sessions (read_only_session); the 401 rewritten into the API's error shape; the settings in config.ts and .env; the login and account pages; and how the local Ward check went.
- [wiki/status.md](wiki/status.md) - Snapshot as of 2026-11-02, per area. The board, CLI, sync and guide built 2026-10-09 and rolled out to every project's CLAUDE.md but vps-deploy's; Base UI under the panel and lanes 2026-10-23. Down since 2026-10-13, waiting on the owner's setup; briefs 01-05 (2026-11-02) move it to the VPS behind sign-in, 01-04 built; the open sync problem after the estate restarted brief numbering; the todos.
- [wiki/sync.md](wiki/sync.md) - How `brief-board sync` turns every project's corpus/briefs/ into tickets, as built 2026-10-09. What the CLI reads (projects directory, titles, summaries, the heading shapes it strips), what the server does per brief state (create, refresh, close, hide, warn), why the report folds closes and hides into "updated", and the open problem that briefs restarting at 01 in 2026-11 land on old tickets.

<!-- END CATALOG -->

## Work

- The per-area snapshot and the todo list live in
  [wiki/status.md](wiki/status.md). Specs are in [briefs/](briefs/) and run in
  number order (restarted at 01 on 2026-11-02); captured ideas are in
  [todos/](todos/).
