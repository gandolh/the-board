---
summary: How `brief-board sync` turns every project's corpus/briefs/ and open corpus/todos/ into tickets, as built 2026-10-09 with todos and Backlog 2026-11-03. What the CLI reads (projects to depth three and their board-name, titles, summaries, the heading shapes it strips, which todos are open), what the server does per brief state (create, refresh, close, hide, warn; since 2026-11-06 it leaves an In Progress ticket whose run is fresh and closes one whose run is stale; since 2026-11-07 a brief or todo in a blocked/ folder waits in Backlog with its condition, and a brief back in todo/ leaves it; since 2026-11-10 it writes the active sprint's tickets only and never a closed sprint's) and per todo (create, refresh, remove), what the dry run compares, why the report folds closes and hides into "updated", and why briefs restarting at 01 in 2026-11 needed no fix (closed 2026-11-03).
updated: 2026-11-10
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
  (`## Project context` counts as Context), else the paragraph after the H1
  that isn't a `Status:` or `Blocked by:` line, which is also the fallback
  when Context opens with a sub-heading. Links and
  images become their text. Cut at 600 characters, at a sentence end where
  possible.
- **Todos** (2026-11-03). A `.md` file directly in `corpus/todos/`, or in
  `corpus/todos/blocked/` (2026-11-07); every other subfolder, like
  game-engine's `closed/` archive, is never read. Its status
  is the frontmatter's `status:`, else a `status:` line (`**Status:**` too)
  among the first five lines after the title, else none; only the first word
  counts. Open is anything but `dropped`, `closed`, `promoted` or `done`, and
  only open todos are sent. Title: the frontmatter's `title:`, else the first
  H1, else the slug; summary: the first paragraph, as for a brief, with the
  frontmatter left out. A file name the key can't hold (anything but letters,
  digits, `.`, `_` and `-`) stops the run, naming the file.
- **Blocked** (2026-11-07). `corpus/briefs/blocked/` is a fourth brief
  state, and `corpus/todos/blocked/` holds todos that wait. A file there
  carries its condition: the frontmatter's `blocked-by:`, else a
  `**Blocked by:** <condition>` line among the first five lines after the
  title. It is trimmed, its runs of whitespace made single, and cut at 120
  characters. A file that names none is still sent, as "not given", with a
  warning naming it. One todo slug in both `corpus/todos/` and `corpus/todos/blocked/`
  stops the run, naming both files. The dry run counts a project's blocked
  briefs and todos only where it has some, and ends with a `Blocked:` total,
  so against an estate with no `blocked/` folder it reads as before plus
  "Blocked: 0 brief(s), 0 todo(s)".
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
| `done/` | Backlog, To Do, Blocked, In Progress with no open run | closes it, with a `via: sync` history event and the comment "Closed by sync: the brief is in done/." |
| `done/` | In Progress, its run fresh | refreshes title and path only, with a warning that the run's end move decides (2026-11-06) |
| `done/` | In Progress, its run stale | ends the run as `stale` and closes the ticket; the comment and a warning name the run and when it was last heard (2026-11-06) |
| `done/` | Ready for test, Ready for deploy, Done | refreshes title and path only (the file moved); the corpus can't say whether the owner tested or deployed |
| `done/` | none | nothing; sync doesn't backfill history |
| `superseded/` | exists | hides it; a ticket whose brief has left `superseded/` is shown again |
| `blocked/` | none | creates it in Backlog with its condition (2026-11-07) |
| `blocked/` | To Do, Blocked, Backlog | puts it in Backlog and refreshes condition, title and path; a move adds a `via: sync` history event and the comment "Waiting in Backlog: the brief is in blocked/ (blocked by …)." |
| `blocked/` | In Progress, its run fresh | refreshes condition, title and path, with a warning that the run's end move decides |
| `blocked/` | In Progress, its run stale or released | ends a stale run as `stale` (its end column Backlog) and puts the ticket in Backlog, with the comment |
| `blocked/` | Ready for test, Ready for deploy, Done | refreshes condition, title and path, with a warning |
| `todo/` | Backlog | the brief is back from `blocked/`: moves it to To Do and clears the condition, with the comment "Unblocked by sync: the brief is back in todo/." |
| missing | exists | nothing, with a warning |

**Sprints** (2026-11-10). Sync reads every ticket of a project but acts on
the active sprint's only, and new tickets join it. A ticket in a closed
sprint is Done and frozen, so the table above stops at it:

| Brief in | Ticket in a closed sprint | Sync does |
|---|---|---|
| `done/` | Done | nothing, counted unchanged, even with a new title or path |
| `todo/`, `blocked/` | Done | nothing, with a warning naming the sprint (no title, path or condition refresh) |
| `superseded/` | Done, not hidden | nothing, with the same warning instead of a hide |
| missing | any | nothing, and no warning: closed sprints are history |

Only the active sprint's todo tickets are removed; a todo key found in a
closed sprint (none should be: a todo's ticket sits in Backlog, which a sprint
start moves) is left with a warning rather than inserted twice.

A brief's condition follows its folder: set while it is in `blocked/`,
cleared anywhere else. The Backlog guard already refuses an agent's start,
move and comment on any Backlog ticket, so a blocked brief needed no new
refusal; the message says how the ticket leaves.

Two briefs with one number warn, and the first wins. Sync writes as author
`sync`, and its writes never count as a run's: a run is fresh or stale by the
writes made while it is open ([glossary.md](glossary.md), Run and Stale).
Since 2026-11-06 the guide puts the end move before the brief goes to
`done/`, so a live run never meets a sync with its brief in `done/`; the
fresh-run rule covers an agent that gets the order wrong.

**Todos** are sync's alone. Each open todo has a ticket in Backlog, keyed
`<project>:<slug>` with no number, created the first time sync sees it and
kept to the todo's title, summary and path, and since 2026-11-07 to its
condition: moving between `corpus/todos/` and `corpus/todos/blocked/` keeps its key. Todo
tickets are the ones with no number, never "the ones in Backlog", since a
blocked brief's ticket sits there too. A todo gone from the payload
(promoted, dropped or closed) has its ticket deleted with its history; the
board refuses moves and comments on it, so nothing else goes with it. A
project sent without the `todos` field, by a CLI from before Backlog, keeps
its todo tickets as they are, rather than losing them all. A CLI from before
`blocked/` sends no conditions and never reads a `blocked/` folder: its
blocked briefs warn as missing, and a todo moved into `corpus/todos/blocked/` drops
out of its payload, so its ticket is removed until the new CLI syncs.

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
