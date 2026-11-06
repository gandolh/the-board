# Task 09: The hand-back goes on the board

## Context

Promoted from the todo of the same name on 2026-11-06, when the owner chose
the **derived badge** over a new column and asked for the brief now.

On 2026-11-05 every agent's report came back as chat and was relayed by
hand; some reached the board as a comment, most didn't. Five reports each
ended with "decisions for you", and nothing collected them
([research-agent-runs.md](../../wiki/research-agent-runs.md), candidate 3;
[research-agent-runs-elsewhere.md](../../wiki/research-agent-runs-elsewhere.md),
judgement 2). Every protocol that waits for a human gives the wait a state,
never a terminal one, and Linear derives `awaitingInput` from the last
activity instead of setting it. On this board the questions come at the
hand-back, after the work, so they belong to the **ticket**, not to a run:
they outlive the end move. This brief doesn't need brief 08's runs and can
be built before or after it.

## Owner decisions

**Answered 2026-11-06:** a badge, not a column. A column for "needs the
owner's answer" would revisit "Six columns, two of them the owner's" and the
move table in [decisions.md](../../wiki/decisions.md), and a background
agent can't wait in it anyway: it ends its turn. The badge is derived and is
never a status. The ticket stays where its moves put it, and Blocked stays
for work the owner agrees to put off.

## What to do

1. **Asking.** `--question "<question>"`, repeatable, on `move`, `comment`
   and `start`. Each question is stored on the ticket with its author, its
   time, and a number that is stable for that ticket (1, 2, 3...). The
   move or comment it rides on is recorded as before.
2. **Answering.** `brief-board answer <ticket> <n> -m "<the owner's
   answer>"` closes question `n` with the answer, its author and time; the
   history and a comment say so. Answering a closed question or an unknown
   number is a usage error (exit 1) that names the open ones.
3. **Reading.** `brief-board questions` lists every open question across
   projects, oldest first: ticket, number, the question, who asked, when.
   `--project <name>` narrows it. `show` prints a ticket's questions, open
   and answered.
4. **On the board.** A card with open questions shows a badge with their
   number, in any column, Done included. The ticket view lists them, open
   first, each answered one with its answer. The UI stays read-only.
5. **The report, in the guide.** "Finishing" asks the end move's message
   for four fixed lines, `Commits:`, `Checks run:`, `Checks skipped:`,
   `Owner steps:`, with the full report kept in the brief's outcome note in
   the repo, and each question for the owner as a `--question`, not as
   prose in the message.
6. **The server.** A questions table beside comments, migrated like the
   Backlog migration was; the routes go through the existing token check.
   Sync never touches questions, and a ticket hidden by a superseded brief
   keeps them.

## Files you OWN

- `cli/src/guide.md` and `cli/src/guide.test.ts`
- `cli/src/commands/moves.ts`, `cli/src/commands/read.ts`, `cli/src/main.ts`
  (help text), and a new `cli/src/commands/questions.ts` if that reads
  better
- `server/src/db.ts` (one migration), `server/src/store.ts`,
  `server/src/app.ts`, and their tests
- `shared/` types for a question
- `web/` the card's badge and the ticket view's list, and their tests
- `corpus/wiki/glossary.md` (Question, if it earns an entry),
  `corpus/wiki/status.md`, `corpus/log.md`

## Files you must NOT touch

- Other repos. Their CLAUDE.md sections name the command only; the rules
  change in `guide.md`.
- `server/src/sync.ts`, beyond a test that sync leaves questions alone.

## Acceptance

- Tests: a move with two `--question` stores both, numbered; `answer`
  closes one, refuses a closed or unknown number with exit 1 and names the
  open ones; `questions` lists open ones across projects, oldest first, and
  `--project` narrows it; the badge counts open questions in every column;
  sync leaves them alone; the guide test covers the four report lines and
  `--question`.
- `npm test` and the typecheck pass.
- **Owner steps:** `node cli.ts brief-board deploy` and `node cli.ts
  brief-board server` from vps-deploy; rebuild the local CLI (the repo's
  README says how); a `--question` on a test ticket shows its badge on the
  live board.
