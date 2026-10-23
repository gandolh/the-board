---
summary: Snapshot as of 2026-10-09. The repo is the owner's the-board on GitHub and all eight briefs are done; the owner's setup steps are in the README. One line per brief, and the order they run in.
updated: 2026-10-23
---

# Status

## Where things stand

The design was settled in a grill-me session on 2026-10-08. See
[decisions.md](decisions.md) and [architecture.md](architecture.md). The repo
is the owner's GitHub repository the-board (2026-10-09). Brief 01's scaffold builds,
tests and serves a placeholder on 127.0.0.1:8806.

## Briefs

- 01 [Workspace scaffold](../briefs/done/01-workspace-scaffold.md). done 2026-10-09.
  npm workspaces, tooling, placeholder server on 127.0.0.1:8806.
- 02 [Shared model and API contract](../briefs/done/02-shared-model-and-api-contract.md).
  done 2026-10-09. Statuses, the move table, keys, zod schemas for every route.
- 03 [API server](../briefs/done/03-api-server.md). done 2026-10-09. SQLite storage,
  enforced moves, sync rules.
- 04 [The brief-board CLI](../briefs/done/04-cli.md). done 2026-10-09. Every agent
  command, address lookup, resume, exit 3 when the board is down.
- 05 [Sync](../briefs/done/05-sync.md). done 2026-10-09. Reads every corpus and builds
  the sync payload.
- 06 [The guide](../briefs/done/06-the-guide.md). done 2026-10-09. The rules
  `brief-board guide` prints.
- 07 [Read-only board UI](../briefs/done/07-read-only-board-ui.md). done 2026-10-09.
  Lanes, six columns, detail panel, polling.
- 08 [Roll out to every project](../briefs/done/08-rollout-to-projects.md).
  done 2026-10-09. The section went into 14 repos; vps-deploy was skipped
  because its CLAUDE.md has uncommitted work. Owner setup is in the README.
- 09 [Base UI for the panel and the lanes](../briefs/todo/09-base-ui-widgets.md).
  todo, filed 2026-10-23.

## Order

1. 01
2. 02
3. 03, 04 and 07 in parallel (all three build on 02's contract)
4. 05 and 06 (both need the CLI)
5. 08
6. 09
