# Task 14: A blocked brief or todo waits in Backlog

## Context

On 2026-11-06 the owner asked for a separate category for briefs and todos
that can't go ahead until something outside the work happens. The case that
prompted it was four vps-deploy todos that wait on hardware: SonarQube and
Bitwarden wait for a stronger machine, and Sonarr and qBittorrent wait for a
home machine that holds the media library. This repo's brief 13 waits on a
date ("Not before 2026-11-18"), written as a bold line under the title. The
owner asked for a separate folder in the corpus, and for the board to show a
page or a badge.

Today the board can't tell these apart. A waiting todo is one more Backlog
card, and a waiting brief sits in To Do, where an agent may pick it up. The
Blocked status doesn't fit: it means "set aside, by agreement, until the
owner does something outside the session", it can only be set after work
has started, and brief 11 counts every Blocked ticket on the needs list
([decisions.md](../../wiki/decisions.md), "Blocked happens by agreement").
A todo waiting for a home machine isn't something the owner needs to do
this week.

**The corpus convention.** It's shared with the my-personal-skills brief that
teaches corpus-flow the same thing, and both briefs must keep it the same:

- A brief that waits lives in `corpus/briefs/blocked/<NN>-<slug>.md`. It
  keeps its number, and numbering counts all four folders (`todo/`,
  `blocked/`, `done/`, `superseded/`). Right under its H1 is a line
  `**Blocked by:** <condition>`.
- A todo that waits lives in `corpus/todos/blocked/<slug>.md`, with a
  `blocked-by: <condition>` key in its frontmatter.
- The condition is one short line that someone can check, worded so items
  waiting on the same thing match: "a stronger machine", "the home media
  machine", "2026-11-18".
- To unblock, the file goes back with `git mv` (to `briefs/todo/`, or to
  `todos/`) and its line is removed. The owner says when, or an agent checks
  a date.

**Build it on main after the owner has deployed the server for briefs 08-12
and rebuilt the local CLI**, as for brief 13. `npm run typecheck` rebuilds
`cli/dist`, which the global `brief-board` command runs.

## Owner decisions

The owner asked for this on 2026-11-06: a folder, and a page or a badge.
Each call below gives the default this brief builds:

1. **Where a blocked brief's ticket sits.** Default: Backlog, with a badge.
   Backlog is already sync's own column. The move table allows no move out
   of it, and the server refuses moves and writes on any Backlog ticket as
   `sync_owned` (`server/src/app.ts`). So no agent can start the brief and
   nothing new has to refuse anything, and the ticket keeps its earlier
   history. When the brief goes back to `todo/`, sync moves its ticket to
   To Do. Rejected:
   - To Do with a badge, plus a `start` that refuses. That's a new refusal,
     and the card still sits where agents look for work.
   - Sync setting the Blocked status. That changes what Blocked means, and
     every waiting item would land on the needs list.
   - An eighth column. That means a new status in `shared/`, rows in the
     move table, a lane in the UI and a revisit in decisions.md.
2. **Page or badge.** Default: a badge on the card reading "Blocked by: a
   stronger machine" (cut short on the card, in full in the detail panel),
   with blocked cards sorted after the other Backlog cards. Plus
   `brief-board blocked`, which lists every blocked brief and todo grouped
   by condition. A page in the web UI waits until the owner asks for one.
3. **The needs list.** Default: blocked items stay off it (brief 11's
   `needs` and the strip). They wait on a condition, not on the owner this
   session, and `brief-board blocked` is where to find them.
4. **The words.** Default: the folder is `blocked/` (the owner's word), and
   the glossary keeps two terms apart. **Blocked** is the status. **Blocked
   by** is the condition a file in a `blocked/` folder waits on. The
   alternative is another folder name, if the owner finds "blocked" in two
   places confusing.

**Settled at the grill, 2026-11-07.** The owner took every default above.
Two calls the brief left open: an agent whose brief waits mid-run moves the
file, then releases its run (`brief-board release <ticket> -m "Blocked by:
…"`), and sync treats an In Progress ticket with no open run like one with a
stale run, so the next sync puts it in Backlog. The build goes ahead now, in
a cloud session, and ships with briefs 08 to 13.

## What to do

1. **CLI, sync** (`cli/src/sync/read.ts`, `parse.ts`):
   - Read `briefs/blocked/` as a fourth brief state.
   - Read `todos/blocked/`. It's the one subfolder of `todos/` that sync
     reads; `closed/` and the rest stay unread.
   - Parse the condition from the frontmatter's `blocked-by:`, else from a
     `**Blocked by:**` line among the first five lines after the title, the
     same way `status:` is found.
   - A file in `blocked/` with no condition still goes in, with the
     condition "not given" and a warning naming the file.
   - Trim the condition and cut it at 120 characters.
   - The same todo slug in `todos/` and `todos/blocked/` stops the run
     before anything is sent, naming both files.
   - `--dry-run` counts blocked briefs and todos per project.
2. **Contract** (`shared/src/api.ts`):
   - A brief in the sync payload can be in state `blocked` and carries
     `blockedBy`. A todo carries `blockedBy`, null when it isn't blocked.
   - A ticket carries `blockedBy: string | null`.
   - A project sent without these fields (a CLI from before this brief)
     keeps today's behaviour. Its blocked briefs aren't sent, so they warn
     as missing.
3. **Server** (`server/src/sync.ts`, a migration in `db.ts`, `store.ts`). New
   rows in the sync table:

   | Brief in | Ticket | Sync does |
   |---|---|---|
   | `blocked/` | none | creates it in Backlog with its condition |
   | `blocked/` | To Do, Backlog, Blocked | puts it in Backlog, refreshes the condition, title and path; a move from To Do or Blocked adds a `via: sync` history event and the comment "Waiting in Backlog: the brief is in blocked/ (blocked by …)" |
   | `blocked/` | In Progress, its run fresh | refreshes the condition, title and path; warns that the run's end move decides |
   | `blocked/` | In Progress, its run stale | ends the run as `stale` and puts it in Backlog, with the comment |
   | `blocked/` | Ready for test, Ready for deploy, Done | refreshes the condition, title and path, with a warning |
   | `todo/` | Backlog | moves it to To Do and clears the condition, with the comment "Unblocked by sync: the brief is back in todo/" |
   | `done/` | Backlog | closes it, as for To Do |
   | `superseded/` | Backlog | hides it, as for any state |

   A todo ticket keeps its `<project>:<slug>` key when its file moves
   between `todos/` and `todos/blocked/`. Sync refreshes its condition and
   never deletes and recreates it.

   Backlog no longer means "a todo's ticket", and a brief's ticket can now
   sit there:
   - Todo removal must keep picking tickets by having no number, never by
     the Backlog status. `syncTodos` gets `ticket.number === null` in
     `server/src/sync.ts` today, so a blocked brief's ticket is never
     deleted as a gone todo. A test pins this.
   - `store.ts`, where a new ticket is made, picks the status from the
     number alone: Backlog with no number, To Do with one. A brief created
     already blocked needs Backlog.
4. **Board UI:**
   - `web/src/Card.tsx`: the badge, styled like the question badge.
   - `web/src/Board.tsx`: blocked cards after the others in Backlog.
   - `DetailPanel.tsx`: the condition in full. Its note for a Backlog
     ticket ("Sync keeps this ticket to its todo. It leaves Backlog when the
     todo is promoted to a brief.") is only right for a todo. A blocked
     brief gets its own note: it leaves Backlog when its brief goes back to
     `todo/`.
5. **CLI commands:**
   - `brief-board blocked [--project <name>]`: the groups by condition
     (compared trimmed, ignoring case), each listing its tickets.
   - `show` adds a `Blocked by:` line, and `list` marks blocked tickets.
6. **The guide** (`cli/src/guide.md`):
   - A Backlog ticket is never yours to start.
   - When the owner agrees work waits on an outside condition that isn't a
     step for them, `git mv` the brief to `briefs/blocked/` and add the
     line. When they agree to a step they'll take before the next session,
     use the Blocked status as today.
   - When the condition is met, move the file back and remove the line.
7. **Tests:**
   - Parsing (frontmatter key, bold line, missing, the 120-character cut).
   - Reading both folders, the slug clash, every new row in the sync
     table, a todo moving between folders keeping its key, a payload from
     an older CLI.
   - The badge and the sorting in `Board.test.tsx`.
   - `blocked` grouping.
   - The guide test's line cap, if it grows.

## Files you OWN

- `shared/src/api.ts`, its tests
- `server/src/sync.ts`, `server/src/db.ts` (one migration),
  `server/src/store.ts` and their tests
- `cli/src/sync/` (all three files), `cli/src/commands/` (a new
  `blocked.ts`, and `read.ts` for `show` and `list`), `cli/src/main.ts`
  (help), `cli/src/format.ts`, `cli/src/guide.md` and its test
- `web/src/Card.tsx`, `Board.tsx`, `DetailPanel.tsx`, `styles.css`,
  `Board.test.tsx`
- `corpus/wiki/sync.md` (the table, the todo folders),
  `corpus/wiki/glossary.md` (Blocked by; Backlog now holds blocked briefs
  too), `corpus/wiki/decisions.md` (revisit "One ticket per brief": Backlog
  holds open todos and blocked briefs; "Blocked happens by agreement"
  stands, with a line on how it differs), `corpus/wiki/status.md`,
  `corpus/log.md`

## Files you must NOT touch

- `shared/src/status.ts` and `shared/src/moves.ts`: no new status, no new
  move.
- `shared/src/needs.ts` and `web/src/NeedsStrip.tsx`: blocked items stay
  off the needs list (decision 3).
- Other repos' corpora. The my-personal-skills brief teaches corpus-flow the
  folders, and each repo moves its own files.

## Acceptance

- The tests above pass, with the typecheck and lint, and the web build.
- A dry-run sync against the estate counts no blocked items and changes
  nothing until some repo has a `blocked/` folder.
- **Owner steps:** from vps-deploy, `node cli.ts brief-board deploy` and
  `node cli.ts brief-board server`. Only after that, rebuild the local CLI
  (`npm run build` in this repo), because the new CLI sends a payload the
  old server rejects. Then a sync, when the owner asks for one.

## Outcome (2026-11-07)

Built as the brief says, in `bacab80`, with the two calls from the grill.

- **Contract.** `BRIEF_STATES` gains `blocked`; `blockedBy` is optional on
  a sync brief and todo (an older CLI's payload parses as before) and a
  nullable field on every ticket. `BLOCKED_BY_NOT_GIVEN` is "not given".
- **Server.** Migration 6 rebuilds `tickets` with `blocked_by` and the
  check `number IS NOT NULL OR status = 'backlog'`. Every row of the sync
  table is built, plus "In Progress with no open run" (a released run) treated
  as stale. A stale run sync ends on the way to Backlog records Backlog as
  its end column, so it reads "stale; sync put the ticket in Backlog" on the
  board and in `show`. `insertTicket` picks Backlog for a number with a
  condition.
- **CLI.** Both folders read, the condition parsed and cut at 120, "not
  given" with a warning naming the file, the slug clash (checked against
  every file, open or not), and the dry run's blocked counts, shown per
  project only where there are some, plus a `Blocked:` total. `brief-board
  blocked [--project]` groups by condition (trimmed, spaces collapsed, case
  ignored) under the first spelling met. `show` adds `Blocked by:`, `list`
  ends a blocked line with "(blocked by …)". A summary skips a `Blocked by:`
  line as it skips `Status:`. The guide is 121 lines (cap raised to 125).
- **Web.** The badge in `--backlog`'s colour, never `--blocked`'s red, cut
  with an ellipsis and whole in its title; blocked cards last in their cell;
  the panel's "Blocked by" row and the blocked brief's own note.

**Outside the file list:** `server/src/app.ts` (the Backlog refusal said
every Backlog ticket was a todo's), the CLI's twin of that message in
`cli/src/format.ts` (owned) which the end-to-end test caught, `web/src/runs.ts`
(the stale-run wording), and the doc comments in `shared/src/api.ts` on run
endings.

**Found.** A CLI from before this brief syncing a repo with a todo in
`todos/blocked/` drops it from its payload, so the todo's ticket is removed
until the new CLI syncs (recorded in sync.md); the deploy order already
avoids it.

Commits: bacab80
Checks run: `npm test` (270 tests, from 243; 12 of the 13 new server sync tests fail against the old sync.ts, the 13th pins todo removal by number as the brief asks); `npm run typecheck` (web included); `npm run lint`; `npm run build`; a dry run against five real corpora (game-engine, ImbatranimOS, my-personal-skills, newspapper, the-board) counts "Blocked: 0 brief(s), 0 todo(s)" with every project line as before; the built server with a seeded account and a sample vps-deploy estate (a blocked brief, two blocked todos, one plain todo): `sync`, `blocked`, `show`, a refused `start`, and in Chromium the badges, the order in Backlog and the detail panel.
Checks skipped: none.
Owner steps: with briefs 08-13, from vps-deploy `node cli.ts brief-board deploy` and `node cli.ts brief-board server`; only then rebuild the local CLI (`npm run build` here); then a sync when you ask for one.
