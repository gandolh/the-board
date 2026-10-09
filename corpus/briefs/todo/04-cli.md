# Task 04: The brief-board CLI

## Context

The CLI is the only way agents touch the board, and every project uses it.
See "One CLI, and other repos name it without a path" in
[decisions.md](../../wiki/decisions.md), and
[architecture.md](../../wiki/architecture.md) for how it finds the board.
Agents call it from inside some other project's repo, so it has to work out
the project and the board address with no setup in that repo.

A down board must never stop an agent's work ("A down board never stops work"
in decisions.md). The CLI's job is to say so clearly and get out of the way.

## Files you OWN

```
cli/src/**  cli/package.json (dependencies only)
```

`cli/src/commands/sync.ts` and `cli/src/sync/**` belong to brief 05.
`cli/src/guide.md` belongs to brief 06. Create both as placeholders here
(`sync` prints "not implemented yet", and `guide` prints a one-line
placeholder) so the command list is complete.

## Files you must NOT touch

`shared/`, `server/`, `web/`, `corpus/`.

## What to do

1. **Arguments** with `node:util` `parseArgs`. No CLI framework.
2. **Commands.** `<ticket>` is a full key (`sports-app-12`) or a bare number,
   which means the current project.
   - `create <number> --title <t> --summary <s> [--tag <label>]... [--brief <path>]`.
     Without `--brief`, find `corpus/briefs/{todo,done,superseded}/<NN>-*.md`
     in the current repo and use its path relative to the repo root.
   - `start <ticket> [-m <message>]`. To Do moves to In Progress. Blocked
     moves to In Progress and needs `-m`, as the table says. **A ticket
     already In Progress is a resume, not an error.** Add a comment
     ("Resumed in a new session.", or the `-m` text) and exit 0.
   - `move <ticket> <status> [-m <message>]`.
   - `comment <ticket> -m <message>`.
   - `show <ticket>` prints, as plain text for agents to read:
     - key, title, status, tags and brief path,
     - the summary,
     - comments oldest first, each labelled with its role,
     - the history.
   - `list [--status <s>] [--all]`. The current project's tickets, or every
     project's with `--all`.
   - `sync` and `guide`, as placeholders (see above).
   - `--author <name>` on every write. The default comes from
     `BRIEF_BOARD_AUTHOR`, and failing that it is `agent`.
3. **Check before calling.** For `start` and `move`, fetch the ticket, run
   `checkMove` from `shared` locally, and on failure print the moves allowed
   from the current status with their required messages. Agents should learn
   the rules from the CLI's output, not from a 400.
4. **Project.** The basename of `git rev-parse --show-toplevel`. Outside a git
   repo, require `--project`.
5. **Board address**, in this order:
   1. `BRIEF_BOARD_URL` in the environment,
   2. `BRIEF_BOARD_URL` in the current repo's `.env` (read only that one
      variable),
   3. `BRIEF_BOARD_URL` in `~/.config/brief-board/env`,
   4. `http://127.0.0.1:8806`.

   No auth yet.
6. **Exit codes and the down board.** If a connection is refused or times out
   after 2 seconds, print exactly one line to stderr: "brief-board: the board
   isn't reachable at <url>. Tell the owner and carry on without it." Then
   exit 3. An API rejection prints the reason and exits 2. A usage error exits
   1. Success exits 0.
7. **No paths.** Nothing the CLI prints may suggest writing a path to
   brief-board into another repo.

## Acceptance

- Tests run every command against a real server from brief 03's `buildApp`,
  listening on a random port. They cover:
  - a resume on an In Progress ticket,
  - the local message check,
  - the four address sources in order,
  - exit 3 with the one-line message when nothing is listening.
- `node cli/dist/index.js list --all` works from inside another repo under
  `~/projects`.
- Do not run `npm link`. It is a global install and an owner step (brief 08).
- `npm run typecheck && npm run lint && npm test` pass.
