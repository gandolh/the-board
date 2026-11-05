---
title: The hand-back goes on the board
created: 2026-11-06
status: open
tags: [cli, web, agents]
---

# The hand-back goes on the board

An agent's end move carries one structured report: commits, checks run,
checks skipped, owner steps and questions. Each open question shows on the
card until the owner answers it (an agent records the answer), without the
ticket going to Blocked. A long report stays in the repo, in the brief's
outcome note; the board keeps the short form and the path.

## Why

On 2026-11-05 every agent's report came back as chat and was relayed by
hand; some reached the board as a comment, most didn't. Five reports each
ended with "decisions for you", and nothing collects them. Hyperlight
HyperAgent writes output over 20 KB to a file and returns its path; FSoft's
HyperAgent has its planner read results from the queue rather than from each
worker. See [research-agent-runs.md](../wiki/research-agent-runs.md),
candidate 3. Needs brief 08's run first.
