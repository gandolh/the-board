---
title: The hand-back goes on the board
created: 2026-11-06
status: open
tags: [cli, web, agents]
---

# The hand-back goes on the board

Questions first. An agent records each question for the owner with
`--question "<question>"` (repeatable) on a move or a comment. A question
belongs to the ticket, not to a run, so it outlives the end move, and the
card shows a badge with the number of open ones in any column. An agent
closes one with `brief-board answer <ticket> <n> -m "<the owner's answer>"`.
`brief-board questions` lists every open question across projects, the one
place the owner reads them. The badge is derived and never a status: the
ticket stays where its moves put it, and Blocked stays for work the owner
agrees to put off.

Then the report. The full report lives in the repo, in the brief's outcome
note, and the end move's message carries the short form in fixed lines:
commits, checks run, checks skipped, owner steps. That part needs no build;
the guide can ask for those lines now.

Questions don't need brief 08's run, so they can be built before it or
without it.

## Owner decision before a brief

A badge or a column. Default: the derived badge. A column for "needs the
owner's answer", like A2A's input-required or Linear's `awaitingInput`, means
revisiting "Six columns, two of them the owner's" and the move table in
[decisions.md](../wiki/decisions.md). A background agent couldn't sit in that
column anyway: it can't wait for an answer mid-run, it ends its turn.

## Why

On 2026-11-05 every agent's report came back as chat and was relayed by
hand; some reached the board as a comment, most didn't. Five reports each
ended with "decisions for you", and nothing collects them. Hyperlight
HyperAgent writes output over 20 KB to a file and returns its path; FSoft's
HyperAgent has its planner read results from the queue rather than from each
worker. See [research-agent-runs.md](../wiki/research-agent-runs.md),
candidate 3.

The survey in
[research-agent-runs-elsewhere.md](../wiki/research-agent-runs-elsewhere.md),
judgement 2, sharpened it. Every protocol and runtime that waits for a human
gives the wait a state, never a terminal one, and Linear derives
`awaitingInput` from the last activity instead of setting it. On this board
the questions came at the hand-back, after the work, so they belong to the
ticket. A2A puts results in artifacts rather than messages, and Copilot's
hand-back is its PR, which is why the full report stays in the repo.
