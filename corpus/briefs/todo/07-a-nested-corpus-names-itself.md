# Task 07: A nested corpus names itself

## Context

Decided with the owner on 2026-11-03 ([decisions.md](../../wiki/decisions.md),
"A corpus nested deeper names itself"; [glossary.md](../../wiki/glossary.md),
Project): sync also looks one folder deeper (a repo in a folder in a group),
and a corpus whose folder name isn't its board name declares that name in
one line that both sync and the CLI read. Rejected: leaving both off the
board.

Two corpora need it today, both at depth three under the projects directory
(group folder, folder, corpus):

- churchix: a corpus one folder inside the presentation-sites repo, which is
  itself a project. It is `churchix` and must never file under
  `presentation-sites`.
- the scoala-ramna theme: a repo in a folder named `theme`, inside a plain
  folder. It is `scoala-ramna-theme`, not `theme`.

Each already holds its name in **`corpus/board-name`**: one line, the name
alone (written 2026-11-03). That file is the format.

`findProjects` in `cli/src/sync/read.ts` looks at the projects directory's
children and one group folder down, and stops at the first project it finds
(`continue`), so it would never descend into presentation-sites. The CLI's
`projectOf` (`cli/src/context.ts`) names the project after the git root's
directory, which from inside churchix is `presentation-sites` and from the
theme is `theme`. The fixture `cli/test/fixtures/grouped/apps/zeta/sites/eta/`
is four levels down and must stay unread.

## Files you OWN

- `cli/src/sync/read.ts` (project discovery and naming)
- `cli/src/context.ts` (`projectOf` and how it finds the corpus)
- `cli/src/commands/create.ts` and the other commands that infer the project
- `cli/src/sync/sync.test.ts`, `cli/src/cli.test.ts`, new fixtures under
  `cli/test/fixtures/grouped/`
- `cli/src/guide.md`
- `corpus/wiki/sync.md`, `corpus/wiki/status.md`, `docs/architecture.md`

## Files you must NOT touch

- The two corpora's `board-name` files.
- Brief 06's todo reading, beyond keeping it working for nested projects.

## What to do

1. **Depth.** A project is a directory with a `corpus/briefs/` at depth
   one, two or three under the projects directory, and discovery descends
   into a project's own children as well as into plain folders. No dot
   directories, no `node_modules`, nothing at depth four.
2. **Name.** A project whose `corpus/board-name` exists takes its first
   line, trimmed, as its name; it must be a valid project name for a key,
   or sync stops with an error naming the file. Without the file, the name
   is the directory name, as today. Two projects with one name still stop
   the run.
3. **The CLI.** Commands that infer the project look for the nearest
   `corpus/` from the working directory up to the git root, and read its
   `board-name`; without one, the git root's directory name, as today.
   `--project` still wins.
4. **Guide.** Say that a corpus whose folder name isn't its board name puts
   its name in `corpus/board-name`.
5. Update `corpus/wiki/sync.md`, `docs/architecture.md` and `status.md`.

## Acceptance

- Sync tests over fixtures: a project inside a project at depth three is
  found under its `board-name`, and its parent keeps its own name; a repo in
  a plain folder at depth three is found under its `board-name`; the
  depth-four `eta` fixture is still ignored; an invalid `board-name` stops
  the run.
- CLI tests: from a directory inside a nested corpus, the inferred project
  is its `board-name`; from a plain repo it is the git root's name; and
  `--project` overrides both.
- `brief-board sync --dry-run` on this machine lists `churchix` and
  `scoala-ramna-theme`, and `presentation-sites` still under its own name
  (read-only; the real sync is the owner's).
- Typecheck, lint, build and the repo's tests pass.
