---
summary: Second research of 2026-11-06, past HyperAgent. How agent trackers (beads, Linear's agent sessions, GitHub's Copilot cloud agent, vibe-kanban), protocols (A2A tasks, MCP tasks), job systems (SQS visibility timeout, Temporal heartbeats, Kubernetes Leases) and agent runtimes (Claude Code subagents and hooks, OpenHands, SWE-agent, Taskmaster, LangGraph) handle a worker that holds a task, dies, needs a human or hands back, with links. The judgements against the board's decisions are a run kept alive by its own board writes with no heartbeat command, questions as a derived badge on the ticket rather than a status, the smallest record of what a run holds, no `next` command, and the cheap guide changes. Sharpened brief 08 and both todos; no new todo.
updated: 2026-11-06
---

# Agent runs elsewhere: what other trackers and runtimes do

[research-agent-runs.md](research-agent-runs.md) took the evidence of the
five-agent run of 2026-11-05 and what the HyperAgent projects suggest. The
owner asked to dig deeper. This page reads how agent trackers, agent
protocols, job systems and agent runtimes handle the same problems, from
their own docs on 2026-11-06, and judges each idea against
[decisions.md](decisions.md). The problems are a worker holding a task, a
worker that dies, a worker that needs a human, and a worker's report coming
back.

## The survey

Each row gives the mechanism, then what it would mean here.

### Trackers built for agents

| Source | Mechanism | For the board |
|---|---|---|
| [beads](https://github.com/steveyegge/beads), [CLI reference](https://github.com/steveyegge/beads/blob/main/docs/CLI_REFERENCE.md) | `bd update <id> --claim` sets assignee and in_progress in one step, `bd ready` lists open issues with no open blockers, and `bd assign` won't overwrite another actor's live claim. There is no heartbeat or lease. `bd stale` lists issues not updated in 30 days, and `bd close` records the session from `CLAUDE_SESSION_ID`. | The tracker built for coding agents keeps a claim as a plain record and finds abandoned work by age, which is brief 08's model. `ready` earns its keep from a dependency graph the board doesn't hold. |
| [Linear agent sessions](https://linear.app/developers/agent-interaction) | Delegating an issue opens a session. The agent posts activities (`thought`, `action`, `elicitation`, `response`, `error`), and the session's state (`pending`, `active`, `awaitingInput`, `error`, `complete`, `stale`) follows the last one. After the agent's first response, follow-up activities may come for up to 30 minutes before the session counts as stale, and the next activity recovers it ([best practices](https://linear.app/developers/agent-best-practices)). A session carries `externalUrls`, such as its PR. | Every activity counts as the heartbeat, and there is no separate call. `awaitingInput` is derived from an elicitation, not set as a column. Both carry over. |
| [GitHub Copilot cloud agent](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/use-cloud-agent-on-github) | Assigning an issue starts a session that raises a PR and requests a review when finished. Later comments on the issue don't reach it; feedback goes on the PR. A session runs at most 59 minutes ([about](https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent)). Stop session ends the run and keeps the commits already pushed, and every commit links to the session log ([tracking](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/track-copilot-sessions)). | The hand-back is an artifact in the repo, the PR, not a chat message, and a stop keeps the work done so far. Here the equivalent is the commit and the brief's outcome note. |
| [vibe-kanban](https://github.com/BloopAI/vibe-kanban) | The board creates each workspace (a branch, a terminal, a dev server) and cleans up orphan and expired ones itself. The project is sunsetting. | It can clean up because it started the processes. brief-board starts nothing, so an agent has to say what it started. |

### Protocols

| Source | Mechanism | For the board |
|---|---|---|
| [A2A specification](https://a2a-protocol.org/latest/specification/) | A task is submitted or working, can be interrupted as input-required or auth-required, and ends completed, failed, canceled or rejected. Results go in Artifacts, and "Messages SHOULD NOT be used to deliver task outputs". A client answers input-required with a message on the same task. The spec has no heartbeat or task timeout. | input-required assumes a live task that resumes under the same id. A background agent here can't wait; it ends its turn. Results as artifacts matches the outcome note. |
| [MCP tasks](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/tasks) (spec 2025-11-25, experimental) | A task is `working`, can go to `input_required` and back, and ends `completed`, `failed` or `cancelled`. Every response carries `createdAt`, `lastUpdatedAt` and a `ttl` after which the receiver may delete it. The requestor polls; nothing heartbeats. | `lastUpdatedAt` is the "last heard" field brief 08 needs. `ttl` only cleans up. Neither protocol notices a dead worker. |

### Job systems: leases and liveness

| Source | Mechanism | For the board |
|---|---|---|
| [SQS visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html) | A received message is hidden for 30 seconds by default. A worker that doesn't delete it in time loses it to the next worker. Long work extends the timeout with `ChangeMessageVisibility`, at most 12 hours in all. | The timeout exists so the queue can give the message to someone else. The board never gives a ticket to anyone. |
| [Temporal activities](https://docs.temporal.io/encyclopedia/detecting-activity-failures) | The server can't see a crashed worker, so the docs strongly recommend a Start-To-Close timeout. A Heartbeat Timeout fails an attempt early and the retry policy reruns it. Heartbeats carry progress for the retry, and cancellation reaches an activity only when it heartbeats. | The SDK heartbeats from code, not from a model's memory. Cancellation is cooperative, which maps to asking an agent to wind down before stopping it. |
| [Kubernetes Leases](https://kubernetes.io/docs/concepts/architecture/leases/), [node heartbeats](https://kubernetes.io/docs/concepts/architecture/nodes/) | A Lease has `holderIdentity`, `leaseDurationSeconds` and `renewTime`, and a kubelet's heartbeat is an update to `renewTime`. The node controller checks every 5 seconds, sets an unreachable node's Ready to `Unknown`, and waits 5 minutes before evicting its pods. | Same shape: a renew time, a threshold, then a controller acts. Here the only one who acts is the owner. |

### Agent runtimes' own records

| Source | Mechanism | For the board |
|---|---|---|
| [Claude Code subagents](https://code.claude.com/docs/en/sub-agents) | A background subagent's report reaches the parent as a completion notification, and each subagent keeps its own transcript. The parent stops one with `TaskStop`, the owner with `x` in `/tasks`. | The controller knows when it stops an agent. The stopped agent gets no chance to tidy up, so whoever stops it has to release its run. |
| [Claude Code hooks](https://code.claude.com/docs/en/hooks) | `SubagentStop` gets `agent_id` and `agent_transcript_path`. `Stop` gets `background_tasks`, the session's in-flight shells with their command lines, and "does not run if the stoppage occurred due to a user interrupt". The docs don't say whether `SubagentStop` fires on `TaskStop`. | A hook can't be trusted to release a stopped agent's run. The task list does see a dev server started as a background shell. It doesn't see one started with `&`, `nohup` or `docker run -d`. |
| [OpenHands SDK](https://docs.openhands.dev/sdk/api-reference/openhands.sdk.conversation) | A conversation is `idle`, `running`, `paused`, `waiting_for_confirmation`, `finished`, `error` or `stuck`, and a stuck detector flags an agent repeating itself. | It records how a run ended, not only that it ended. |
| [SWE-agent trajectories](https://swe-agent.com/latest/usage/trajectories/) | A `.traj` file holds every step (thought, action, observation) and an `info` block with `exit_status`, the submitted patch and the cost. | The same: the record ends with how it ended, and the full log stays outside the tracker. |
| [Taskmaster](https://github.com/eyaltoledano/claude-task-master/blob/main/docs/task-structure.md) | `tasks.json` holds a status (`pending`, `in-progress`, `review`, `done`, `deferred`, `cancelled`), dependencies and a priority. `next` picks a task whose dependencies are done, ranked by priority, dependency count and id. | Like `ready`, `next` needs a graph and priorities. |
| [LangGraph interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts) | `interrupt()` pauses a graph, a checkpointer saves its state per `thread_id`, and `Command(resume=...)` resumes it. A pending interrupt shows under `__interrupt__`. | Waiting for a human means the run is saved and stopped. The question outlives the process. |

## What the sources agree on

- The systems that reassign work (SQS, Temporal, Kubernetes) need a heartbeat
  and a timeout, because expiry hands the work to another worker. The
  trackers (beads, Linear) never hand work on, and read liveness from the
  record itself, by its last activity or its age.
- Every protocol and runtime that waits for a human (A2A, MCP, Linear,
  OpenHands, LangGraph) gives the wait a state, and never a terminal one.
  Linear derives it from the last activity instead of setting it.
- The report is an artifact kept apart from the chatter (A2A's Artifacts,
  Copilot's PR, SWE-agent's `info`), and the full log stays where the run
  ran.

## Judgements

### 1. The run: open and close, kept alive by its own writes

Plain open and close, with no `beat` command. Every board write on the
ticket sets the run's last-heard time (start, comment, move, and later a
hold or a question). A run whose last write is older than the threshold is
stale. The board works that out when it reads and stores nothing, so nothing
runs on a timer and sync stays by hand.

**Why not a lease with a heartbeat.** A lease has teeth only because expiry
reassigns the work, and the board reassigns nothing: Blocked happens by
agreement, and the owner decides. A quick death signal would buy nothing,
while a forgotten beat costs a lot. Under a heartbeat, an agent that forgets
to beat looks dead while it works. Whatever acts on that, sync closing its
ticket or a controller starting a second agent, repeats the loss of
2026-11-05. Under open and close, a run nobody closed only means something
when its agent died, and then whoever stopped it runs `release`. An agent
can't beat from a timer either, since a background loop is one more process
left behind. Linear made the same call.

**What the board shows.** An In Progress card shows the run's author, when
it started and when the board last heard from it. Past the threshold it
reads "stale run" in the warning tone, and the ticket stays In Progress for
the owner's call. `brief-board runs` lists open runs across projects,
stalest first. Sync's report names each stale run it closed and each fresh
one it left. The run keeps how it ended (moved, and to which column;
released; or closed by sync as stale), as SWE-agent's `exit_status` does.

Default threshold: 4 hours since the run's last write. With the guide's new
order a live agent never has its brief in `done/` while its run is open, so
the threshold mostly decides what the card shows, and a short one is safe.

### 2. A question for the owner

A2A's input-required as a status would mean a new column, which revisits
"Six columns" and the move table. Blocked by agreement needs the owner in the
session, and most of the questions of 2026-11-05 didn't stop the work. That
leaves questions as records, the todo's plan, which this page recommends,
sharpened.

A question belongs to the ticket, not the run. On 2026-11-05 the questions
came at the end, in the hand-back, so they have to outlive the end move. A
background agent can't wait mid-run the way an A2A task does; it ends its
turn. The card shows a badge for open questions in any column, derived the
way Linear derives `awaitingInput`, never a status. `brief-board questions`
lists every open question across projects, the one place the owner lacked.
Blocked stays for work the owner agrees to put off. Questions don't need
runs, so they can be built before brief 08 or without it.

### 3. What a run holds

Other systems record a holder and a time (`holderIdentity`, `renewTime`),
links out (Linear's `externalUrls`, Copilot's session log), progress for a
retry (Temporal's heartbeat details), or the resources themselves when the
system made them (vibe-kanban's workspace, Claude Code's `background_tasks`).
Only the last bears on the dev server left on 5173.

The smallest useful version is `brief-board hold <ticket> <kind> <value>`,
with kinds `port`, `pid`, `container` and `path`, and `drop` to take one off.
The end move and `release` print what's still held and keep it in the
history, `brief-board runs` shows the holds, and a `hold` on a port another
open run holds warns. A guide line comes first and needs no build. Start a
long-lived process as the runtime's background task, so `/tasks` shows it,
never with `&` or `nohup`, and stop what you started before your end move.

### 4. A ready-work query

No `brief-board next`. beads' `ready` and Taskmaster's `next` earn their
keep from dependency graphs and priorities. Here briefs run in number order,
so the next one is the lowest file in `corpus/briefs/todo/`. The controller
reads that from the corpus anyway, because a down board never stops work.
The board knows one thing the corpus doesn't, which projects have a run open,
and `brief-board runs` answers that. It moved into brief 08.

### 5. Other cheap preventions

- The guide's order, the last board move before the brief moves to `done/`,
  alone stops the mid-run close. It was already in brief 08.
- A wind-down before a stop, after Temporal's cooperative cancellation and
  Copilot's stop that keeps commits. Where the runtime lets the controller
  message an agent, it asks it to stop what it started, release its run and
  hand back; otherwise it stops the agent and runs `release` for it, naming
  what was left running. Guide text, now in brief 08.
- Before a sync the owner asks for, the controller runs `brief-board runs`
  and names the open ones. Guide text, in brief 08.
- `--author` defaults to `agent`, so five runs all read "agent". The guide
  can ask the controller to name each agent. An owner decision in brief 08.
- The hand-back's short form needs no build. The guide can ask for commits,
  checks run, checks skipped and owner steps as lines in the end move's
  message today. In the hand-back todo.
- Considered and left out: a `SubagentStop` hook that releases runs, since it
  may not fire on a stop and hooks are owner steps; and a commit trailer
  naming the ticket, as beads' `(bd-abc)` suffix does, since this repo's
  commits already name the brief and the estate's commit style belongs to
  corpus-flow in the skills repo.

No new todo. Everything worth doing fits brief 08 or the two todos.

## What changed

[Brief 08](../briefs/done/08-a-ticket-knows-the-run-that-works-it.md) keeps
a run alive by its own writes, records how it ended, adds `brief-board runs`
and a guide section for the session that runs agents, and lists five owner
decisions. [a-run-lists-what-it-holds](../todos/a-run-lists-what-it-holds.md)
has the smallest `hold` and the guide line.
[brief 09](../briefs/todo/09-the-hand-back-goes-on-the-board.md) (promoted 2026-11-06)
puts questions on the ticket, independent of runs, with `brief-board
questions`.
