---
summary: How `brief-board sync` turns every project's corpus/briefs/ and open corpus/todos/ into tickets, as built 2026-10-09 with todos and Backlog 2026-11-03. What the CLI reads (projects to depth three and their board-name, titles, summaries, the heading shapes it strips, which todos are open), what the server does per brief state (create, refresh, close, hide, warn) and per todo (create, refresh, remove), what the dry run compares, why the report folds closes and hides into "updated", and why briefs restarting at 01 in 2026-11 needed no fix (closed 2026-11-03).
updated: 2026-11-03
---

# Sync

The decision that sync runs only by hand, and why the corpus wins, is in
[decisions.md](decisions.md). The code wins where this page and it disagree.

## The CLI half

`cli/src/sync/read.ts` and `cli/src/sync/parse.ts`, run from
`cli/src/commands/sync.ts`.

- **Which projects.** Every directory with a `corpus/briefs/` one, two or
  three levels under the projects directory: a flat repo, one in a group
  folder (since 2026-11-02; the estate moved its repos into `apps/`,
  `platform/` and the other groups on 2026-11-01), and since 2026-11-03 a
  corpus inside a grouped repo (churchix in presentation-sites) or a repo in
  a plain folder in a group (the scoala-ramna theme). Discovery looks into
  every directory down to depth three, projects as well as plain folders,
  and nothing at depth four; dot-directories and `node_modules` are skipped.
  A project is named by its `corpus/board-name` (the first line, trimmed;
  one a key can't hold stops the run, naming the file), else by its own
  directory, never by its group and name joined, so its keys match the ones
  the CLI infers. Two projects with one name stop the run with a usage error
  naming both paths, before anything is sent. vps-deploy's `SourceRepo` and
  Ward's local seed still stop at one group folder. The projects directory is
  `BRIEF_BOARD_PROJECTS_DIR` from the environment or
  `~/.config/brief-board/env` (a leading `~` is the home directory), else
  `~/projects`. `--project <name>` narrows it to one, at either depth; `--dry-run` prints the
  counts per project, the open briefs by number and the open todos, and
  writes nothing: it reads the board to list the todo tickets a real run
  would create and remove, and without a board it says it could not compare.
- **Title.** The first H1, without a leading `Task 72 —`, `Brief 99 —`,
  `Task 01:`, a bare `12 -` or newspapper's `Wave 0 —`. A heading with no
  number (`# Design Brief — Public Resource Map`) stays as written. With no
  H1, the slug in words.
- **Summary.** The first paragraph under `## Context`, else `## Problem`
  (`## Project context` counts as Context), else the paragraph after the H1,
  which is also the fallback when Context opens with a sub-heading. Links and
  images become their text. Cut at 600 characters, at a sentence end where
  possible.
- **Todos** (2026-11-03). A `.md` file directly in `corpus/todos/`;
  subfolders, like game-engine's `closed/` archive, are never read. Its status
  is the frontmatter's `status:`, else a `status:` line (`**Status:**` too)
  among the first five lines after the title, else none; only the first word
  counts. Open is anything but `dropped`, `closed`, `promoted` or `done`, and
  only open todos are sent. Title: the frontmatter's `title:`, else the first
  H1, else the slug; summary: the first paragraph, as for a brief, with the
  frontmatter left out. A file name the key can't hold (anything but letters,
  digits, `.`, `_` and `-`) stops the run, naming the file.
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

**Todos** are sync's alone. Each open todo has a ticket in Backlog, keyed
`<project>:<slug>` with no number, created the first time sync sees it and
kept to the todo's title, summary and path. A todo gone from the payload
(promoted, dropped or closed) has its ticket deleted with its history; the
board refuses moves and comments on it, so nothing else goes with it. A
project sent without the `todos` field, by a CLI from before Backlog, keeps
its todo tickets as they are, rather than losing them all.

The report says created, updated and unchanged for brief tickets, the same
plus removed for todo tickets (`todos` in the response), and every warning.
A CLI that gets no `todos` back says the board ignored them: a board from
before Backlog drops the field silently. A close
or a hide counts as "updated": the contract's `syncResponseSchema` has no
separate fields, and adding them means changing `shared` and the server
together.

## Closed: briefs restarting at 01

On 2026-11-01 the estate's repos began deleting their briefs and restarting
numbering at 01 ([log.md](../log.md)). Keys are `<project>-<NN>`, so a new
brief 01 maps to the old ticket 01. If that ticket is Done, sync leaves it
with a warning and the new brief never gets a card. If it is in any other
status, sync rewrites its title and path, so the new brief takes over the old
ticket's history. Every old ticket whose brief was deleted warns on each run.
The VPS board started empty on 2026-11-03, so the first sync meets no old
ticket, and since 2026-11-03 brief numbers never restart (corpus-flow's
rule), so the numbering todo was closed rather than built.
