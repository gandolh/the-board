---
summary: What brief-board is (one Jira-style board, a lane per project, showing where every corpus brief across ~/projects stands), what it adds on top of the corpus, and what it deliberately leaves to the corpus.
updated: 2026-10-08
---

# Overview

brief-board is a single board that shows where the owner's agents are on every
project. Each project under `~/projects` gets a lane. Each lane has six
columns: To Do, In Progress, Blocked, Ready for test, Ready for deploy and
Done. A ticket on the board stands for one corpus brief.

Agents write to it through the `brief-board` CLI. They create a ticket when a
brief gets filed and move it to In Progress when they start. When they finish,
they move it to Done, or to Ready for test or Ready for deploy when a step is
left for the owner. If a brief needs something from the owner that can't
happen in the session, the agent asks first and then moves the ticket to
Blocked with a block reason. The owner reads the board in a browser and never
writes to it. They tell an agent what to move.

## What it adds, and what it leaves alone

The corpus already follows a brief from `todo/` to `done/`. The board adds what
the corpus can't do:
- one view across every project,
- the In Progress and Blocked statuses,
- comments that a later session can read.

The spec stays in the brief. A ticket holds a summary and a path to the brief
file, never a second copy of the spec. See [decisions.md](decisions.md) and
[glossary.md](glossary.md).
