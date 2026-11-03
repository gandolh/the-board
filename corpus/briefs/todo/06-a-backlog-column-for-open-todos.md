# Task 06: A Backlog column for open todos

## Context

Decided with the owner on 2026-11-03 ([decisions.md](../../wiki/decisions.md),
"One ticket per brief", revisited; [glossary.md](../../wiki/glossary.md),
Todo and Backlog): sync also reads each project's open `corpus/todos/` and
gives every open todo a sync-owned ticket in a new first column, Backlog
(API status `backlog`). Only sync makes, moves or removes those tickets.
Promoting a todo removes its file, so the next sync takes its ticket off and
the brief's ticket appears in To Do. Rejected: a count of todos per lane.

What is on disk today (2026-11-03), which "open" has to handle:

- most todos have YAML frontmatter with `status: open`; three say
  `status: dropped` and stay in their folders;
- one corpus writes `status:` as a plain line under the title, with no
  frontmatter, and one todo has no status at all;
- one corpus keeps an archive in `corpus/todos/closed/`.

Brief keys are `<project>-<NN>` (`shared/src/key.ts`), and a project name may
hold hyphens and end in digits, so a todo key joined with a hyphen could
parse as a brief key (`…-step-2`). The todo key needs a separator outside
the brief key's alphabet.

## Files you OWN

- `shared/src/status.ts`, `shared/src/key.ts`, `shared/src/moves.ts`,
  `shared/src/api.ts` (the sync contract), and their tests
- `cli/src/sync/read.ts`, `cli/src/sync/parse.ts`, `cli/src/commands/sync.ts`,
  `cli/src/sync/sync.test.ts` and new fixtures under `cli/test/fixtures/`
- `cli/src/guide.md` and `cli/src/guide.test.ts`
- `server/src/db.ts` (a migration), `server/src/store.ts`,
  `server/src/sync.ts`, `server/src/app.ts`, and their tests
- `web/src/Board.tsx`, `web/src/Card.tsx`, `web/src/DetailPanel.tsx`,
  `web/src/labels.ts`
- `docs/architecture.md`, `corpus/wiki/sync.md`, `corpus/wiki/status.md`

## Files you must NOT touch

- `corpus/wiki/decisions.md` and `glossary.md`: the calls are made.
- Any other project's corpus.
- Brief 07's files where they overlap (`read.ts`'s project discovery):
  this brief adds reading todos to a project, not where projects are found.

## What to do

1. **Status.** `backlog` becomes the first of `STATUSES`, labelled
   "Backlog". `moves.ts` allows no move into or out of it.
2. **Key.** A todo ticket's key is `<project>:<slug>` (the todo's file name
   without `.md`). No brief key can contain `:`, and `parseKey` keeps
   rejecting it; add the todo key's own parse and format, and let the
   ticket routes accept either form. Check that `:` in the path reaches
   `/api/tickets/:key` intact.
3. **Reading todos.** A todo is a `.md` file directly in `corpus/todos/`
   (subfolders are never read). Its status is the frontmatter's `status:`,
   or, with no frontmatter, a `status:` line among the first lines after the
   title; none means open. Open is anything but `dropped`, `closed`,
   `promoted` or `done`. Title: the frontmatter `title:`, else the first
   `# ` heading, else the slug. Summary: the first paragraph, as for briefs.
   The sync request carries each project's open todos (slug, title, summary,
   path).
4. **Server.** A migration adds `backlog` to the status check and lets a
   todo ticket exist without a number. Sync creates a Backlog ticket for
   each open todo it hasn't seen, updates title, summary and path, and
   deletes the todo tickets of a project in the request whose todo is gone.
   The report counts todo tickets created, updated and removed apart from
   brief tickets. Moves and comments on a Backlog ticket are refused with a
   message that says to promote the todo instead: the ticket goes when it
   is promoted, and its comments would go with it.
5. **Board.** Backlog is the first column. Its cards show the slug where a
   brief's card shows the number, and the detail panel shows the todo's
   path and summary with no move controls.
6. **CLI and guide.** `brief-board sync --dry-run` lists the todo tickets it
   would create and remove. The guide says Backlog belongs to sync: agents
   never move or comment on a Backlog ticket; promoting the todo to a brief
   is how work leaves it.
7. Update `corpus/wiki/sync.md`, `docs/architecture.md` and `status.md`.

## Acceptance

- Shared tests: `<project>:<slug>` round-trips, a slug ending in digits
  never parses as a brief key, and no move enters or leaves Backlog.
- CLI tests over fixtures: frontmatter `open` and `dropped`, a plain
  `status:` line, no status, a file in `todos/closed/` (ignored), and a
  project with no `todos/`.
- Server tests: a todo gets a Backlog ticket; a changed title updates it;
  deleting the todo and adding a brief in one sync removes the Backlog
  ticket and creates the brief's in To Do; a move or comment on a Backlog
  ticket is refused; the migration upgrades an existing database.
- The board shows Backlog first, with a card per todo (a component test or
  a short walk on the local board).
- Typecheck, lint, build and the repo's tests pass. Running sync against the
  live board and deploying are the owner's steps.
