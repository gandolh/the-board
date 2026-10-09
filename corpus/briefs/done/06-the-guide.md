# Task 06: The guide

## Context

Every project's CLAUDE.md will say only "run `brief-board guide` before you
start or resume a brief" (brief 08). So the guide is the whole rule set agents
follow. It lives only here, so changing the rules is one edit. See the guide
entry in [glossary.md](../../wiki/glossary.md) and every entry in
[decisions.md](../../wiki/decisions.md). The guide puts those decisions into
words an agent acts on.

## Files you OWN

```
cli/src/guide.md  cli/src/commands/guide.ts  cli/src/guide.test.ts
```

## Files you must NOT touch

`shared/`, `server/`, `web/`, `corpus/`.

## What to do

Write the text `brief-board guide` prints. Keep it under about 80 lines, in
plain imperative sentences. Don't hand-write the move table. Render it at print
time from the table in `shared`, so the guide can't drift from the rules the
server enforces. The guide must cover:

1. **What the board is.** A view of brief progress across projects. The corpus
   is the record. The corpus-flow steps (moving the brief to `done/`, the log
   entry, the wiki) always happen, whether or not the board is up.
2. **Filing a brief.** Run `create` with a two to four sentence summary saying
   what the brief does and why, written for the owner glancing at the board.
3. **Starting or resuming.** If the owner named a ticket, run `show` first and
   read every comment before doing anything. Then run `start`. Starting a
   ticket that's already In Progress records the resume.
4. **Blocking.** Ask the owner first. Most questions get answered in the
   session. Move to Blocked only after the owner agrees to put the work off.
   The block reason says exactly what the owner must do or decide.
5. **Finishing.** Pick the column:
   - If the owner needs to try it, use Ready for test. The test notes say what
     to try and where (URL, command, which account, never a password).
   - If it's finished but needs a deploy, use Ready for deploy. Deploys are an
     owner step, so the deploy steps are the exact commands, using vps-deploy
     for projects that ship to the VPS. A project that never deploys never
     uses this column.
   - Otherwise use Done, with an optional conclusion.
6. **When the owner reports back.** "Tested, works", "failed: X" and
   "deployed" each map to a move. Moves back to In Progress need a comment
   saying what failed or broke.
7. **The board is down.** Tell the owner once, make no more board calls that
   session, and carry on with the brief.
8. **Hard rules.**
   - Never write a path to brief-board into any repo.
   - Never put a secret in a message.
   - Don't run `sync` unless the owner asks.
   - Don't touch another project's tickets unless the owner asks.
9. **The move table**, rendered from `shared`, with required messages marked.

## Acceptance

- A test checks that the printed guide contains every move from `shared`'s
  table and every numbered topic above.
- Read the output once as a fresh agent would. Every instruction should be
  something you can act on without opening the corpus.
- `npm run typecheck && npm run lint && npm test` pass.

## Outcome (2026-10-09)

Done. `cli/src/guide.md` is the text, with a `{{moves}}` marker that
`commands/guide.ts` fills from `shared`'s `MOVES` at print time, one line per
move with its message role and whether it is required. The printed guide is
76 lines. Its nine numbered sections follow the brief's nine topics; the test
checks each heading, every move, and the 80-line ceiling.

Calls made in the text: the move lines use the status ids that `move` takes
(`ready_for_test`), and the deploy example names vps-deploy's
`node cli.ts <project> deploy`. Read once as a fresh agent: every step names
the command to run.
