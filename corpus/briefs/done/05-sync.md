# Task 05: Sync

## Context

Sync makes the board match the corpora. It runs only when the owner, or an
agent the owner asks, runs `brief-board sync`. See "Sync runs only by hand" and
"The corpus wins" in [decisions.md](../../wiki/decisions.md). Sync runs in the
CLI on this machine. It reads every project's briefs and sends them to
`POST /api/sync` in one request. The server (brief 03) applies the rules, so
this brief only reads files and builds the payload.

## Files you OWN

```
cli/src/commands/sync.ts  cli/src/sync/**  cli/test/fixtures/**
```

You may add one line to the command registry in `cli/src/` to wire the
command in.

## Files you must NOT touch

`shared/`, `server/`, `web/`, `corpus/`, and every other project's files.
Sync only reads them.

## What to do

1. **Where to look.** `BRIEF_BOARD_PROJECTS_DIR` from
   `~/.config/brief-board/env` or the environment, defaulting to `~/projects`.
   Every child directory with a `corpus/briefs/` is a project, named by its
   directory. A corpus without `briefs/` (game-engine has none) is skipped
   silently. `--project <name>` limits the run to one.
2. **Which files.** `corpus/briefs/{todo,done,superseded}/<digits>-<slug>.md`,
   one level deep. Skip `.gitkeep`, non-markdown files and subdirectories.
   For example, newspapper has a `templates-warm-industrial/` folder of JSON
   inside `superseded/`.
3. **Title.** Before writing the parser, read the first 15 lines of one brief
   from at least four corpora. Today's headings look like this:
   - `# Task 72 — A compass that matches the world` (3D-sandbox and most
     others)
   - `# Brief 99 — Diff tool (Monaco's DiffEditor is already on the disk)`
     (imbatranimOS)
   - `# Task 01: Workspace scaffold` (this corpus)

   Take the first H1 and strip a leading `Task <n>` or `Brief <n>` (or a bare
   `<n>`) followed by an em dash, a hyphen or a colon. With no H1, turn the
   slug into words.
4. **Summary.** Use the first paragraph under `## Context`. If there is no
   Context section, use `## Problem` (imbatranimOS). Failing both, use the
   first paragraph after the H1 that isn't a `Status:` line. Turn markdown
   links into their text, since relative links mean nothing on the board. Cut
   it to about 600 characters at a sentence end.
5. **Payload and report.** Send one request. Print the counts (created,
   updated, closed, hidden) and every warning. `--dry-run` prints the payload
   summary per project and sends nothing.
6. **Down board.** Same behavior as every other command (brief 04): one line,
   exit 3.

## Acceptance

- Fixture corpora in `cli/test/fixtures/` cover:
  - both heading styles, the colon style, and a missing H1,
  - a brief with no Context section,
  - a nested folder and a `.gitkeep` to skip,
  - a corpus without `briefs/`.
- `brief-board sync --dry-run` against the real `~/projects` lists every
  project with a `corpus/briefs/`. On 2026-10-08 only atrium (79) and
  newspapper (105) had briefs in `todo/`. Use that as a sanity check, not a
  test.
- `npm run typecheck && npm run lint && npm test` pass.

## Outcome (2026-10-09)

Done. `cli/src/sync/parse.ts` (title and summary), `cli/src/sync/read.ts`
(projects directory, discovery, one project's briefs), `cli/src/commands/sync.ts`,
and fixture corpora under `cli/test/fixtures/projects/`. Brief 04's test of the
placeholder now tests the real command.

Calls the brief left open:
- **The report** says created, updated and unchanged, plus every warning. The
  contract (brief 02) has no separate `closed` and `hidden` counts: a close or
  a hide counts as `updated`. Splitting them out means adding fields to
  `syncResponseSchema` and the server, which this brief may not touch.
- **Headings.** Besides `Task`, `Brief` and a bare number, newspapper's
  `Wave 0 —` is stripped too. A heading with no number, like public-resource-map's
  `# Design Brief — Public Resource Map`, stays as written.
- **Summaries.** `## Project context` (newspapper) counts as Context. A Context
  section that opens with a sub-heading falls back to the paragraph after the
  H1. Images become their alt text along with links.
- `~` at the start of `BRIEF_BOARD_PROJECTS_DIR` means the home directory.

Verified: 14 sync tests plus 3 command tests against `buildApp`; the full
suite (111), typecheck and lint pass. `sync --dry-run` against `~/projects`
listed 14 projects. In `todo/`: atrium 79, newspapper 105, brief-board 5, 6
and 8, and vps-deploy 1 to 7, filed after 2026-10-08.
