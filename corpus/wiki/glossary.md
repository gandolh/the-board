---
summary: The board's vocabulary. Ticket vs brief, project, lane, project tag and tag, sync, the guide, the six statuses (To Do, In Progress, Blocked, Ready for test, Ready for deploy, Done), and the messages a move can carry (conclusion, block reason, confirmation, test notes, deploy steps), each with the words they replace.
updated: 2026-10-08
---

# Glossary

## Work items

**Brief**:
A numbered work spec in a project's `corpus/briefs/`. The brief holds the spec,
and the board never does.
_Avoid_: task, spec (for the file itself)

**Ticket**:
The board's record of one brief, keyed `<project>-<NN>`. It holds a summary,
a status and comments, and points at the brief file.
_Avoid_: issue, card (except for the drawing of a ticket in the UI), story, task

**Project**:
A repo directory under `~/projects` that has a corpus. Its directory name is
the first half of every ticket key.
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
Reading `corpus/briefs/todo/` in every project and creating the tickets
that don't exist yet.
_Avoid_: import, scan

## Statuses

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
