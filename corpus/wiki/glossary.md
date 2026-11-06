---
summary: The board's vocabulary. Ticket vs brief vs todo, project, lane, project tag and tag, sync, the guide, a run and a stale run, a hold and a leftover, a question, the statuses (Backlog, To Do, In Progress, Blocked, Ready for test, Ready for deploy, Done), and the messages a move can carry (conclusion, block reason, confirmation, test notes, deploy steps), each with the words they replace.
updated: 2026-11-06
---

# Glossary

## Work items

**Brief**:
A numbered work spec in a project's `corpus/briefs/`. The brief holds the spec,
and the board never does.
_Avoid_: task, spec (for the file itself)

**Todo**:
A captured idea in a project's `corpus/todos/`, prose, not yet a spec. Open
until it is promoted to a brief, dropped or closed.
_Avoid_: backlog item, idea (for the file); "to do" (that is the status)

**Ticket**:
The board's record of one brief, keyed `<project>-<NN>`, or of one open todo,
keyed by project and slug. It holds a summary, a status and comments, and
points at the brief or todo file.
_Avoid_: issue, card (except for the drawing of a ticket in the UI), story, task

**Project**:
A repo directory with a corpus (a `corpus/briefs/`), directly under the
projects directory, one group folder down (`apps/`, `platform/`), or one more
down. Its name is the first half of every ticket key: its own directory name,
never group/name, unless the corpus names itself (churchix,
scoala-ramna-theme).
_Avoid_: repo, workspace

**Lane**:
The row on the board that holds the tickets of one project tag.
_Avoid_: swimlane, board (there is one board)

**Project tag**:
The one tag on a ticket that names its project. It decides the lane and never
changes.
_Avoid_: category, component

**Tag**:
Any other label on a ticket, shown on the card and usable as a filter. Tags
never make lanes.
_Avoid_: label, category

**Guide**:
The rules agents follow when they use the board, printed by `brief-board
guide`. Every project's CLAUDE.md points at it instead of copying it.
_Avoid_: instructions, playbook

**Sync**:
Reading every project's `corpus/briefs/` and open `corpus/todos/`, and
correcting the tickets to match.
_Avoid_: import, scan

**Run**:
One agent session working one ticket, from `brief-board start` to its end
move, or to a `release` by whoever stopped the agent. A record on the
ticket, never a lock; it ends `moved`, `released` or `stale`.
_Avoid_: claim, lease, job

**Hold**:
A port, pid, container or path that a run declares it started, recorded
with `brief-board hold` and taken off with `drop`. Free text the board
checks against nothing; a record, never a lock.
_Avoid_: lock, lease, reservation, claim

**Leftover**:
A hold still on a run when the run ended. It stays on that run, printed by
the end move or `release` and listed by `show`; the next run starts with
none.
_Avoid_: orphan, dangling resource

**Question**:
Something only the owner can decide, asked on a ticket with `--question`
and numbered per ticket. It stays open, counted in the card's badge in any
column, until someone records the owner's answer with `brief-board answer`.
_Avoid_: blocker, decision for you, open point

**Stale** (of a run):
An open run with no write on its ticket for longer than the board's
threshold (4 hours by default), worked out when the board is read. The next
write makes it fresh again.
_Avoid_: dead, expired, abandoned

## Statuses

**Backlog**:
The first column: one ticket per open todo. Only sync puts tickets there and
takes them off; no agent moves one. In the API: `backlog`.
_Avoid_: icebox, ideas

**To Do**, **In Progress**:
Ready to start, being worked by an agent. In the API: `todo`, `in_progress`.

**Blocked**:
A ticket set aside until the owner does something outside the session. An
agent sets it only after the owner agrees. In the API: `blocked`.
_Avoid_: on hold, deferred, waiting

**Ready for test**:
Work the agent has finished that the owner needs to try. In the API:
`ready_for_test`.
_Avoid_: in review, QA, testing

**Ready for deploy**:
Finished work that isn't deployed yet. In the API: `ready_for_deploy`.
_Avoid_: staged, pending deploy, shipped

**Done**:
Finished, with nothing left for the owner to test or deploy. In the API:
`done`.
_Avoid_: closed, resolved, complete

## Messages on a transition

**Conclusion**:
An optional message on a move to Done. It says what shipped and anything left
for later.
_Avoid_: outcome note (that is the text added to a done brief)

**Block reason**:
The message an agent must give when it moves a ticket to Blocked. It says what
the owner needs to do or decide.
_Avoid_: blocked comment, blocker

**Test notes**:
The message an agent must give when it moves a ticket to Ready for test. It
says what to try and where.
_Avoid_: QA notes, test plan (that is a corpus test-plans file)

**Deploy steps**:
The message an agent must give when it moves a ticket from In Progress to Ready
for deploy. It lists the exact commands the owner runs.
_Avoid_: deploy notes, release notes

**Confirmation**:
The message an agent must give when it moves a ticket from Blocked to Done. It
says what the owner did and how the agent checked it.
_Avoid_: unblock note, resolution
