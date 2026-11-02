---
summary: How `brief-board sync` turns every project's corpus/briefs/ into tickets, as built 2026-10-09. What the CLI reads (projects directory, titles, summaries, the heading shapes it strips), what the server does per brief state (create, refresh, close, hide, warn), why the report folds closes and hides into "updated", and the open problem that briefs restarting at 01 in 2026-11 land on old tickets.
updated: 2026-11-02
---

# Sync

The decision that sync runs only by hand, and why the corpus wins, is in
[decisions.md](decisions.md). The code wins where this page and it disagree.

## The CLI half

`cli/src/sync/read.ts` and `cli/src/sync/parse.ts`, run from
`cli/src/commands/sync.ts`.

- **Which projects.** Every directory under the projects directory that has a
  `corpus/briefs/`, by directory name. The directory is
  `BRIEF_BOARD_PROJECTS_DIR` from the environment or
  `~/.config/brief-board/env` (a leading `~` is the home directory), else
  `~/projects`. `--project <name>` narrows it to one; `--dry-run` prints the
  counts per project and the open briefs by number, and sends nothing.
- **Title.** The first H1, without a leading `Task 72 —`, `Brief 99 —`,
  `Task 01:`, a bare `12 -` or newspapper's `Wave 0 —`. A heading with no
  number (`# Design Brief — Public Resource Map`) stays as written. With no
  H1, the slug in words.
- **Summary.** The first paragraph under `## Context`, else `## Problem`
  (`## Project context` counts as Context), else the paragraph after the H1,
  which is also the fallback when Context opens with a sub-heading. Links and
  images become their text. Cut at 600 characters, at a sentence end where
  possible.
- Everything goes to the server in **one request**, so sync works the same
  once the board moves off this machine.

## The server half

`server/src/sync.ts`, one transaction per run, touching only the projects in
the payload. Sync is the one writer that skips the move table.

| Brief in | Ticket | Sync does |
|---|---|---|
| `todo/` | none | creates it in To Do, `summarySource: sync` |
| `todo/` | exists | refreshes title and path; the summary only if sync wrote it, so an agent's summary stays |
| `todo/` | Done | nothing, with a warning: the board can't tell which side is wrong |
| `done/` | To Do, In Progress, Blocked | closes it, with a `via: sync` history event and the comment "Closed by sync: the brief is in done/." |
| `done/` | Ready for test, Ready for deploy, Done | refreshes title and path only (the file moved); the corpus can't say whether the owner tested or deployed |
| `done/` | none | nothing; sync doesn't backfill history |
| `superseded/` | exists | hides it; a ticket whose brief has left `superseded/` is shown again |
| missing | exists | nothing, with a warning |

Two briefs with one number warn, and the first wins. Sync writes as author
`sync`.

The report says created, updated and unchanged, plus every warning. A close
or a hide counts as "updated": the contract's `syncResponseSchema` has no
separate fields, and adding them means changing `shared` and the server
together.

## Open: briefs restarting at 01

On 2026-11-01 the estate's repos began deleting their briefs and restarting
numbering at 01 ([log.md](../log.md)). Keys are `<project>-<NN>`, so a new
brief 01 maps to the old ticket 01. If that ticket is Done, sync leaves it
with a warning and the new brief never gets a card. If it is in any other
status, sync rewrites its title and path, so the new brief takes over the old
ticket's history. Every old ticket whose brief was deleted warns on each run.
The board has been down since 2026-10-13. The fix is a todo:
[todos/sync-after-numbering-restart.md](../todos/sync-after-numbering-restart.md).
