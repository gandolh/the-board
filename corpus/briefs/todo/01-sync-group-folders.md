# Task 01: Sync finds projects inside group folders

## Context

Since 2026-11-01 the projects directory holds group folders (`apps/`,
`games/`, `platform/`, `websites/` and so on), and every repo sits one level
down. `readProjects` in `cli/src/sync/read.ts` only looks at the projects
directory's direct children, so `brief-board sync` finds no project at all.
Briefs 02 to 05 move the board to the VPS. Without this brief, that board
would start empty and stay empty.

The rule copies vps-deploy's `SourceRepo` and Ward's local seed: a project
sits directly under the projects directory or one group folder down, and is
known by its directory name.

The board's database is gone. The old checkout and its `data/` were deleted
on 2026-11-01, and the VPS board (brief 05) starts empty, so the first sync
has no old tickets for the restarted brief numbers to land on. Leave
[the numbering todo](../../todos/sync-after-numbering-restart.md) open until
a real sync shows that.

## Files you OWN

- `cli/src/sync/read.ts`, `cli/src/sync/sync.test.ts`
- `cli/src/commands/sync.ts`, the not-found message only
- `corpus/wiki/sync.md` ("Which projects"), `corpus/wiki/glossary.md` (the
  Project entry), `corpus/wiki/status.md` (the Sync line)

## Files you must NOT touch

`server/`, `shared/`, `web/`. Ticket keys stay `<project>-<NN>`.

## What to do

1. **Walk two levels.** For each child of the projects directory, skipping
   dot-directories and `node_modules`: if it has `corpus/briefs/`, it is a
   project. Otherwise look inside it, and each child there with
   `corpus/briefs/` is a project. Go no deeper.
2. **The name is the directory name**, never `group/name`. The CLI's
   `create` takes the git root's directory name, and both must give the same
   key.
3. **Duplicate names stop the sync.** If two projects share a name, exit
   with a usage error that names both paths, before anything is sent.
4. `--project <name>` finds the project at either depth.
5. **Known misses.** Corpora nested deeper, such as churchix inside
   presentation-sites and the scoala-ramna theme, are not found. Leave them
   out and say so in `sync.md`.
6. **Tests.** Fixtures for a flat project, a grouped project, a group folder
   holding no projects, a duplicate name, and a deeper corpus that stays
   unfound.
7. **Wiki.** The "Which projects" bullet in `sync.md`. The glossary's
   Project becomes a repo directory with a corpus, directly under the
   projects directory or one group folder down. Update the Sync line in
   `status.md`.

## Acceptance

- `npm run typecheck && npm run lint && npm run test && npm run build` pass.
- `brief-board sync --dry-run` against the real projects directory lists the
  grouped projects and sends nothing.
- `bash corpus/lint.sh` passes.
