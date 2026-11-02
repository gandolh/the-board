---
title: Sync after the estate restarted brief numbering at 01
created: 2026-11-02
status: open
tags: [later]
---

# Sync after the estate restarted brief numbering at 01

From 2026-11-01 every repo under the projects directory deleted its old briefs
and restarted numbering at 01. Tickets are keyed `<project>-<NN>`, so the
first sync after that matches each new brief to an old ticket with the same
number:

- an old Done ticket: the new brief in `todo/` gets a warning and no card;
- an old ticket in any other status: the new brief takes it over, title, path
  and history;
- every old ticket whose brief is gone warns on every run.

How sync reads and applies briefs: [wiki/sync.md](../wiki/sync.md).

## Options

- A per-project reset: a command (or a sync flag) that hides, or deletes, a
  project's tickets before the first sync of the new series.
- Key tickets by brief path or slug instead of number. Touches the key format
  in `shared`, the CLI's `create` and every decision that names
  `<project>-<NN>` ([wiki/decisions.md](../wiki/decisions.md)), so it needs a
  revisit.
- A series or generation on the project, bumped when its numbering restarts.

The board has been down since 2026-10-13, so nothing is wrong on it yet.
Settle this before the next sync.
