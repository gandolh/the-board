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
   `Owner steps:`, and a fifth, `Tokens:`, which the controller fills when
   its runtime reports the agent's usage and leaves out otherwise (added
   2026-11-06 from the hyperagent.com research, candidate 1), with the full report kept in the brief's outcome note in
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
  sync leaves them alone; the guide test covers the report lines and
  `--question`.
- `npm test` and the typecheck pass.
- **Owner steps:** `node cli.ts brief-board deploy` and `node cli.ts
  brief-board server` from vps-deploy; rebuild the local CLI (the repo's
  README says how); a `--question` on a test ticket shows its badge on the
  live board.

## Outcome

Built 2026-11-06 in `f5d0712`, on the branch `briefs-2026-11-06`, after
brief 08. Ticket brief-board-09 is in Ready for deploy.

- **Asking.** `--question`, repeatable, on `start`, `move` and `comment`;
  the CLI prints the numbers it asked ("asked questions 1, 2"). Questions
  go in a `questions` table (migration 4), numbered per ticket from the
  last one, in the same transaction as the move, comment or start; a
  refused move asks nothing. `comment` still needs `-m`: the question rides
  on the comment, as the brief says.
- **Answering.** `brief-board answer <ticket> <n> -m "<answer>"` posts to
  `/api/tickets/:key/questions/:n/answer`, closes the question with the
  answer, its author and time, and adds a comment ("Answered question 2:
  <question>" and the answer). The CLI checks locally that the question is
  open, so a closed or unknown number exits 1 naming the open ones; the
  server's `question_not_open` maps to the same exit if the question closes
  in between.
- **Reading.** `brief-board questions [--project <name>]` reads a new
  `GET /api/questions`, oldest first. `show` prints the questions, open
  first, each answered one with its answer.
- **On the board.** A ticket carries `openQuestions`; the card shows "2
  questions" in an accent badge in any column, Done included, and the panel
  lists the questions, open first.
- **The report.** The guide's "Finishing" asks the end move's message for
  `Commits:`, `Checks run:`, `Checks skipped:` and `Owner steps:`, the full
  report in the brief's outcome note, and each question as `--question`;
  "When the owner reports back" says how to record an answer.
- **My reading of `Tokens:`.** The agent can't know its own usage and the
  controller can't edit the agent's end move, so the controller's section
  tells it to add `Tokens: <count>` as a comment on the ticket when its
  runtime reports the usage, and to leave it out otherwise.
- **"The history and a comment say so"**, as in brief 08: an answer is not a
  status change, so the comment and the question's own record carry it.
- **Sync** is untouched; a test shows a ticket closed by sync and one hidden
  by a superseded brief both keep their open questions, and a hidden
  ticket's questions still show in `brief-board questions`.
- The guide is 109 lines; its test's cap went to 110.
- **Outside the file list:** `docs/architecture.md`, the wiki's
  `architecture.md`, `web/src/Card.tsx`, `web/src/styles.css`.

213 tests (from 199), typecheck and lint pass; the web build and a browser
walk were skipped. Owner steps: [status.md](../../wiki/status.md), "Next
(owner)" item 1, the same deploy as brief 08's.
