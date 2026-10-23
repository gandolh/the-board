---
summary: Locked calls for brief-board, each with date, rejected alternative and reason. One ticket per brief keyed <project>-<NN> with no hand-made tickets; Blocked only by agreement with the owner; which moves are allowed and which need a message; six columns with Ready for test and Ready for deploy as the owner's; the corpus wins over the board; one CLI on PATH that other repos name without a path; a read-only UI; one project tag per ticket decides its lane; sync only by hand; a down board never stops work; Base UI for the UI's widgets. Read before proposing to change any of these.
updated: 2026-10-23
---

# Decisions

Each entry passed three tests: hard to reverse, surprising without context, and
a real trade-off. Changing one needs an explicit revisit and a `log.md` entry.

## One ticket per brief, and no hand-made tickets
_2026-10-08_. Every ticket stands for exactly one corpus brief. Its key is
`<project>-<NN>`, where project is the repo directory under `~/projects` and NN
is the brief number, for example `sports-app-12`. Creating a ticket whose key
already exists updates it, so an agent that calls twice makes no duplicate. A
sync command reads `corpus/briefs/todo/` in every project and creates missing
tickets. Rejected: Jira-style tickets created by hand in the UI with their own
numbering. Those would make the board a second backlog that drifts from the
corpus. To get a ticket, file a todo or a brief.

## Blocked happens by agreement, so nothing notifies the owner
_2026-10-08_. An agent asks the owner before it moves a ticket to Blocked. Most
questions get answered inside the session, and Blocked is for work the two of
them agree to put off to another session. The owner is present when a ticket
blocks, so the board sends no notification. Later, the owner starts a fresh
session that names the ticket and says what they did, and that agent finishes
the work. Rejected: agents blocking on their own whenever they hit a question,
with a Discord ping through just-a-bot to tell the owner. That fills the
Blocked column with questions the session could have settled.

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
for deploy, Done. Ready for test holds work the owner has to try. Ready for
deploy holds finished work that isn't deployed yet, because deploys are an
owner step. Rejected: four columns with owner follow-ups written into a Done
ticket's conclusion, where they get lost once the card is in Done.

## The corpus wins; the board is a view
_2026-10-08_. When a ticket and its brief disagree, the brief is right and the
ticket gets corrected. The board shows what is happening across projects. It
never decides it. Rejected: making the board the record of status, which would
put two sources of truth side by side.

## One CLI, and other repos name it without a path
_2026-10-08_. The only client is a CLI that lives in this repo. Every project
uses it, and a project's CLAUDE.md refers to brief-board by name only. No
corpus outside this repo holds a path to it. Rejected: a script copied into
each repo, which means 14 copies to keep in step. Also rejected: an MCP server,
which has to be registered in every repo. A change to how agents talk to the
board is one edit here. The CLI goes on PATH through `npm link`, and the board
address lives in a user-level config file that a repo's `.env` can override
with a URL. No file in another repo holds a path to brief-board. Each
project's CLAUDE.md gets a short section that names the `brief-board` command,
and `brief-board guide` prints the rules, so the rules live only here.

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

## A down board never stops work
_2026-10-08_. The board is not a hard dependency the way Ward is for the apps.
Nothing keeps the server running; the owner starts it. When the CLI can't reach
it, the agent tells the owner once and carries on with the brief without the
board. Moves made while it is down are lost, and sync recovers what the corpus
knows. Rejected: an always-on container with a restart policy, and agents
waiting or failing until the board comes back.

## Base UI for the UI's widgets, styled by our own CSS
_2026-10-23_. The detail panel is a Base UI `Dialog` and the lanes are Base UI
`Collapsible`s. They keep `styles.css` and key off the attributes Base UI sets
(`data-panel-open`). The owner asked for this on 2026-10-23, after a survey
showed most of their other apps already on Base UI. Rejected: keeping the
hand-built panel, which never gave focus back to the card; and a styled kit
such as shadcn, which would bring Tailwind into a board that has none. Native
controls that are already accessible, such as the tag filter's `<select>`,
stay native.
