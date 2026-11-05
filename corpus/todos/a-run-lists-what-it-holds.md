---
title: A run lists what it holds
created: 2026-11-06
status: open
tags: [cli, agents]
---

# A run lists what it holds

After brief 08 gives a ticket its run, an agent records what it starts that
outlives a command with `brief-board hold <ticket> <kind> <value>`, where the
kind is `port`, `pid`, `container` or `path`, and takes one off with
`brief-board drop <ticket> <kind> <value>`. The end move and `release` print
what is still held and keep it in the ticket's history, and `brief-board
runs` (from brief 08) shows each run's holds. Whoever stops an agent then
knows what to clean up, and a second agent sees that a port is taken. A
`hold` on a port that another open run holds warns and still goes ahead:
holds are a record, never a lock.

A first step needs no build and can go into the guide with brief 08. Start a
long-lived process, such as a dev server, as the runtime's background task so
that `/tasks` shows it with its command line, never with `&` or `nohup`, and
stop what you started before your end move.

## Why

On 2026-11-05 a stopped agent left a Vite server on 5173, which another agent
needed (it worked round it with a relay container), and the session that
stopped it found it only by hunting through `ss`. A copied folder left in the
shared imbatranimOS dev container kept it from starting for the next agent;
a `container` hold would have named the container as touched, though it
wouldn't have undone the copy. The pattern is Hyperlight HyperAgent's
"nothing is ambient": resources are declared, not found later. See
[research-agent-runs.md](../wiki/research-agent-runs.md), candidate 2.

The survey in
[research-agent-runs-elsewhere.md](../wiki/research-agent-runs-elsewhere.md),
judgement 3, sharpened it. vibe-kanban cleans up after its workspaces because
it made them; brief-board starts nothing, so an agent has to declare what it
starts. Claude Code's own task list knows a session's background shells (its
hooks get them as `background_tasks`), but not a server started with `&`,
`nohup` or `docker run -d`, which is why the guide line comes first.

Run profiles (light, walk, Docker) could hang off the same record later, so a
controller sees how many Docker-heavy runs are open before starting another.
