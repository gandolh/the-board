---
summary: Locked calls for brief-board's board model, each with date, rejected alternative and reason. One ticket per brief keyed <project>-<NN> with no hand-made tickets (revisited 2026-11-03: open todos get sync-owned tickets in a Backlog column; 2026-11-07: so do briefs in blocked/); Blocked only by agreement with the owner, apart from a blocked/ folder's Blocked by; which moves are allowed and which need a message; six columns with Ready for test and Ready for deploy as the owner's; the corpus wins over the board (revisited 2026-11-06: sync waits for a fresh run); a read-only UI; one project tag per ticket decides its lane; sync only by hand; a corpus nested deeper names itself, as churchix and scoala-ramna-theme do (2026-11-03); sprints, one active, the CLI starting the next on the owner's ask (2026-11-10); tags the one write a closed sprint's ticket or a Backlog ticket takes (2026-11-12); nothing on the board scrolls sideways, lanes stack below 1100 px (2026-11-13). The CLI, the token, the VPS, Base UI and the house style are in decisions-engineering.md. Read before proposing to change any of these.
updated: 2026-11-13
---

# Decisions

Each entry passed three tests: hard to reverse, surprising without context, and
a real trade-off. Changing one needs an explicit revisit and a `log.md` entry.

The calls about the CLI, the token, the deploy, the UI's widgets and the code's
format and checks are in [decisions-engineering.md](decisions-engineering.md).

## One ticket per brief, and no hand-made tickets
_2026-10-08_. Every ticket stands for exactly one corpus brief. Its key is
`<project>-<NN>`, where project is the repo directory under `~/projects` and NN
is the brief number, for example `sports-app-12`. Creating a ticket whose key
already exists updates it, so an agent that calls twice makes no duplicate. A
sync command reads `corpus/briefs/todo/` in every project and creates missing
tickets. Rejected: Jira-style tickets created by hand in the UI with their own
numbering. Those would make the board a second backlog that drifts from the
corpus. To get a ticket, file a todo or a brief.

**Revisited 2026-11-03**, in a grill with the owner: open todos get tickets
too. Sync also reads each project's `corpus/todos/` and gives every open todo
(not dropped, not closed) a ticket in a new first column, Backlog, keyed by
project and slug in a form no brief key can take. Only sync makes, moves or
removes those tickets; promoting a todo removes its file, so the next sync
takes its ticket off and the brief's ticket appears in To Do. What stays: no
ticket made by hand, and the corpus is the only source. Rejected: a count of
todos per lane, which is lighter but hides what they are.

**Revisited 2026-11-07** (brief 14): Backlog also holds the ticket of a brief
in `corpus/briefs/blocked/`, with its condition, so no agent can start it;
sync moves it to To Do when the brief is back in `todo/`. Rejected: To Do
with a badge and a refusing `start` (a new refusal, on a card where agents
look for work), sync setting the Blocked status (it changes what Blocked means
and fills the needs list), an eighth column (a status, move rows, a lane).

**Revisited 2026-11-12** (brief 23), the owner's answer: an agent may tag and
untag a Backlog ticket. Tags only group tickets, and sync never sets or clears
one, so they can't fight. Every other write stays sync's (400 `sync_owned`). A
promoted todo's ticket still goes with its tags: nothing links it to the
brief's. Rejected: Backlog refusing tags too, which left the todos ungrouped.

## Blocked happens by agreement, so nothing notifies the owner
_2026-10-08_. An agent asks the owner before it moves a ticket to Blocked. Most
questions get answered inside the session, and Blocked is for work the two of
them agree to put off to another session. The owner is present when a ticket
blocks, so the board sends no notification. Later, the owner starts a fresh
session that names the ticket and says what they did, and that agent finishes
the work. Rejected: agents blocking on their own whenever they hit a question,
with a Discord ping through just-a-bot to tell the owner. That fills the
Blocked column with questions the session could have settled.
This stands (2026-11-07): work that waits on something outside it which is no
step for the owner (a stronger machine, a date) goes to a `blocked/` folder
instead, waits in Backlog and stays off the needs list ([glossary.md](glossary.md), Blocked by).

## Which moves are allowed, and which need a message
_2026-10-08_. The happy path is To Do, In Progress, Done, and needs no message.
An agent may add one for future work or other agents. A message is required
whenever work goes to the owner, and whenever it comes back from the owner to an
agent. To Do cannot go straight to Blocked; a ticket blocks only after work has
started. Every allowed move:

| From | To | Message |
|---|---|---|
| To Do | In Progress | optional |
| In Progress | Blocked | block reason, required |
| In Progress | Ready for test | test notes, required |
| In Progress | Ready for deploy | deploy steps, required |
| In Progress | Done | conclusion, optional |
| Blocked | In Progress | comment, required |
| Blocked | Done | confirmation, required |
| Ready for test | In Progress | comment saying what failed, required |
| Ready for test | Ready for deploy | optional |
| Ready for test | Done | optional |
| Ready for deploy | In Progress | comment saying what broke, required |
| Ready for deploy | Done | optional |

The API rejects any other move, and any of these without its required message.
Sync is the one exception: it corrects a ticket to match its brief without
going through this table. Rejected: requiring a message on every move, which
turns into noise on the happy path.

## Six columns, two of them the owner's
_2026-10-08_. The columns are To Do, In Progress, Blocked, Ready for test, Ready
for deploy, Done. (Backlog comes first since 2026-11-03; see "One ticket per
brief".) Ready for test holds work the owner has to try. Ready for
deploy holds finished work that isn't deployed yet, because deploys are an
owner step. Rejected: four columns with owner follow-ups written into a Done
ticket's conclusion, where they get lost once the card is in Done.

## The corpus wins; the board is a view
_2026-10-08_. When a ticket and its brief disagree, the brief is right and the
ticket gets corrected. The board shows what is happening across projects. It
never decides it. Rejected: making the board the record of status, which would
put two sources of truth side by side.

**Revisited 2026-11-06**, with runs (brief 08): sync now waits for a fresh
run. A brief in `done/` whose ticket is In Progress with an open run heard
from within the stale threshold (4 hours by default) keeps its ticket, and
the sync report warns that the run's end move decides. A stale run ends as
`stale` and the ticket closes as before. What stays: the corpus wins once
the run ends or goes stale, and a run is a record, never a lock. Rejected:
closing regardless, which on 2026-11-05 refused an agent's end move and left
its deploy steps on a Done card.

## The UI is read-only
_2026-10-08_. The browser only shows the board. Every write, including the
moves out of Ready for test and Ready for deploy, comes from an agent through
the CLI. The owner tells an agent "tested, works" or "deployed" and the agent
makes the move. Rejected: buttons on the card for the owner's moves. They would
need sign-in once the board is on the VPS, and the owner already works through
sessions.

## One project tag per ticket decides its lane
_2026-10-08_. A ticket carries tags. Exactly one is its project tag, which
decides the lane and is the first half of the key, and it never changes. Other
tags are labels shown on the card that the board can filter on. Rejected:
building a lane for every tag, so that a ticket with three tags appears in three
lanes and the same work is counted three times.

## Sync runs only by hand
_2026-10-08_. `brief-board sync` runs when the owner, or an agent the owner
asks, runs it. Nothing runs it on a schedule or before other commands. The
board can go stale between syncs, and the owner accepted that: the corpus is
the record, and the board is a view of it. Rejected: syncing the current
project before every CLI command, and a timer in the server that reads
`~/projects`. Don't add automatic sync without revisiting this entry.

## A corpus nested deeper names itself
_2026-11-03_, in a grill with the owner. Sync also looks one folder deeper
(a repo in a folder in a group), and a corpus whose folder name is not its board name
says its name in one line that both sync and the CLI read. churchix (a corpus
inside the presentation-sites repo) is `churchix`, not `presentation-sites`,
so its tickets never share keys with that repo's; the scoala-ramna theme (a
repo in a folder named `theme`) is `scoala-ramna-theme`. Rejected: leaving
both off the board, which keeps their briefs invisible there.

## Sprints, and only the CLI starts one
_2026-11-10_, the owner's call, as Jira and Linear work. Every ticket is in one
numbered sprint; the board shows the one active sprint, and a closed sprint's
Done tickets are frozen (409 `sprint_closed`), but for their tags (below). `brief-board sprint start <N>`, a
token write run only on the owner's ask like sync, closes it and moves the rest
into N, the active number plus one (else 409 `sprint_changed`); the UI only
reads. A deploy or a migration never starts a sprint (the owner, 2026-11-12): the
one that did was the sprints migration itself, which closed Sprint 1 and opened
Sprint 2 on 2026-11-11, once. A later migration that touches sprints only reshapes
rows. Rejected: auto-archiving Done after N days (work moves by age, not by a
call); a sprint per project (no board-wide number); a column, no table (no dates).

**Revisited 2026-11-12** (brief 23), the owner: a tag change is the one write a
closed sprint's ticket takes, because "tags are pretty cool to understand how
they were grouped by features", and the old work is most of the board. It
changes no column of the ticket, only its tags and their events. Rejected:
freezing tags too (brief 22's first build), which left Sprint 1 ungrouped.

## Nothing on the board scrolls sideways
_2026-11-13_, the owner's approval of the redesign "The queue and the lanes" (brief 20), changing a line of
[board-ui.md](board-ui.md): "Below 1100 px each lane scrolls sideways on its own and shows its own column names." From
1100 px one sticky status row is the column header for every lane, aligned with the wells. Below 1100 px a lane
stacks its non-empty statuses as headings with their cards, in a grid of 300 px columns, and the empty statuses fold
into one line ("Backlog, Blocked: empty"). The phone's widths: the tabs become a bottom bar under 720 px. What stays: a
cell past five cards still stops at 600 px and scrolls vertically, from 1100 px. Rejected: sideways scrolling lanes (a
sideways scroll is easy to miss on a phone, and each lane then repeats the column names); a status row that stays on a
narrow screen (it can't stay aligned with seven columns that are no longer there). The history line above is kept as
it was written.
