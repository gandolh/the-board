# brief-board corpus index

Start here. Triage on the summary lines and open at most 2-3 pages.

- [CLAUDE.md](CLAUDE.md) - the rules for this corpus
- [routing.md](routing.md) - which skill runs the work, which layer answers which question
- [log.md](log.md) - chronological record of meaningful changes

## Wiki

<!-- BEGIN CATALOG -->

- [wiki/architecture.md](wiki/architecture.md) - How brief-board is put together. npm workspaces with a Fastify + SQLite API, a read-only Vite + React board, and the brief-board CLI that agents use; how the CLI finds the board without any repo holding a path; what each project's CLAUDE.md says. Sync runs by hand from the CLI. The owner starts the server by hand on 127.0.0.1:8806.
- [wiki/decisions.md](wiki/decisions.md) - Locked calls for brief-board, each with date, rejected alternative and reason. One ticket per brief keyed <project>-<NN> with no hand-made tickets; Blocked only by agreement with the owner; which moves are allowed and which need a message; six columns with Ready for test and Ready for deploy as the owner's; the corpus wins over the board; one CLI on PATH that other repos name without a path; a read-only UI; one project tag per ticket decides its lane; sync only by hand; a down board never stops work. Read before proposing to change any of these.
- [wiki/glossary.md](wiki/glossary.md) - The board's vocabulary. Ticket vs brief, project, lane, project tag and tag, sync, the guide, the six statuses (To Do, In Progress, Blocked, Ready for test, Ready for deploy, Done), and the messages a move can carry (conclusion, block reason, confirmation, test notes, deploy steps), each with the words they replace.
- [wiki/open-questions.md](wiki/open-questions.md) - Genuinely unresolved design questions. Empty as of 2026-10-08, after the grill-me session settled the design.
- [wiki/overview.md](wiki/overview.md) - What brief-board is (one Jira-style board, a lane per project, showing where every corpus brief across ~/projects stands), what it adds on top of the corpus, and what it deliberately leaves to the corpus.
- [wiki/status.md](wiki/status.md) - Snapshot as of 2026-10-09. The repo is the owner's the-board on GitHub and briefs 01-03 are done; 04 to 08 are in todo/. One line per brief, and the order they run in.

<!-- END CATALOG -->

## Work

- Brief states live one per line in [wiki/status.md](wiki/status.md).
  Specs are in [briefs/](briefs/), captured ideas in [todos/](todos/).
