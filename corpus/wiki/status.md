---
summary: Snapshot as of 2026-11-02, per area. The board, CLI, sync and guide built 2026-10-09 and rolled out to every project's CLAUDE.md but vps-deploy's; Base UI under the panel and lanes 2026-10-23. Down since 2026-10-13, waiting on the owner's setup; briefs 01-05 (2026-11-02) move it to the VPS behind sign-in, 01-02 built; the open sync problem after the estate restarted brief numbering; the todos.
updated: 2026-11-02
---

# Status

_2026-11-02_. Everything is on `main` in the owner's GitHub repository
the-board. The board has been down since 2026-10-13. Brief numbering
restarted at 01 on 2026-11-02 (see [log.md](../log.md)). Briefs 01 to 05,
written 2026-11-02, move the board to the VPS at `/brief-board/` behind
sign-in; 01 (sync in group folders) and 02 (the sub-path) are built, 03 to
05 are not.

## By area

- **Shared model** (2026-10-09). Statuses, the twelve-row move table with
  `checkMove`, keys, the zod contract for every route
  ([decisions.md](decisions.md), [architecture.md](architecture.md)).
- **API server** (2026-10-09). Fastify + SQLite on 127.0.0.1:8806, moves
  enforced by the shared table, serving the built UI.
- **CLI** (2026-10-09). Every agent command, the address lookup, resume, exit
  3 when the board is down, and `guide` (76 lines).
- **Sync** (2026-10-09; group folders 2026-11-02). Reads every project's
  briefs, flat or one group folder down, and corrects the
  tickets ([sync.md](sync.md)).
- **Board UI** (2026-10-09, Base UI 2026-10-23). Read-only lanes, six
  columns, the detail panel, polling; README images retaken 2026-10-31.
- **Rollout** (2026-10-09). Thirteen repos carry the brief-board section in
  their CLAUDE.md. vps-deploy was skipped because its `corpus/CLAUDE.md` had
  uncommitted work, and on 2026-11-02 it still has no section.

114 tests; typecheck, lint and build clean.

## Next (owner)

1. The README's owner setup: build, `npm link` in `cli/`, `npm start`, the
   optional `~/.config/brief-board/env`, then `brief-board sync`. Until
   `npm link` runs, agents following their CLAUDE.md find no `brief-board`
   command.
2. Before that first sync, settle how sync treats the restarted brief
   numbers ([todos/sync-after-numbering-restart.md](../todos/sync-after-numbering-restart.md)).

## Open

- Sync matches briefs to tickets by number, and every repo restarted its
  numbering at 01 in 2026-11: new briefs land on old tickets
  ([sync.md](sync.md)).
- The sync report folds closes and hides into "updated"; separate counts need
  contract fields.

## Todos

- [Sync after the estate restarted brief numbering at 01](../todos/sync-after-numbering-restart.md) (`later`)
