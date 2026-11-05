---
title: A run lists what it holds
created: 2026-11-06
status: open
tags: [cli, agents]
---

# A run lists what it holds

After brief 08 gives a ticket its run: an agent records what it starts that
outlives a command (a port, a dev server's PID, a container, a scratch
folder) with something like `brief-board hold <ticket> port 5173`. The end
move, `release` and a new `brief-board runs` list them, so whoever stops an
agent knows what to clean up, and a second agent sees that a port is taken.

## Why

On 2026-11-05 a stopped agent left a Vite server on 5173, which another agent
needed (it worked round it with a relay container), and the session that
stopped it found it only by hunting through `ss`. A copied folder left in the
shared imbatranimOS dev container kept it from starting for the next agent.
The pattern is Hyperlight HyperAgent's "nothing is ambient": resources are
declared, not found later. See
[research-agent-runs.md](../wiki/research-agent-runs.md), candidate 2.

Run profiles (light, walk, Docker) could hang off the same record, so a
controller sees how many Docker-heavy runs are open before starting another.
