---
summary: Research of 2026-11-06 into what the HyperAgent projects suggest for brief-board and for managing agent runs. The evidence from the five-agent run of 2026-11-05 (sync closed a ticket mid-run, stopped agents left tickets In Progress and a dev server running, owner questions scattered across chat), each HyperAgent and the one pattern it offers, the candidates ranked against the board's decisions, and the recommendation (a run on the ticket first, brief 08; what a run holds and a hand-back on the board as todos). Followed the same day by research-agent-runs-elsewhere.md, the survey past HyperAgent that sharpened all three.
updated: 2026-11-06
---

# Agent runs on the board: what HyperAgent suggests

On 2026-11-06 the owner asked whether anything in "HyperAgent" could improve
brief-board's style or how agents are managed. The HyperAgent research itself
was done the same day for the whole estate (the ro-housing repo's todo
`check-every-hop-of-a-pasted-link` came out of it). This page takes the part
that bears on the board.

Later on 2026-11-06 the owner said they meant hyperagent.com, the hosted agent platform, not the projects below; [research-hyperagent-platform.md](research-hyperagent-platform.md) covers it.

## The evidence: the run of 2026-11-05

That evening one session ran up to five background agents, one project each,
and the board showed only part of it:

- **Sync closed a ticket mid-run.** An agent moved brief imbatranimOS-31 to
  `done/` and committed before its last board move. The owner then asked for
  a sync, which closed the ticket (In Progress to Done, the rule in
  [sync.md](sync.md)). The agent's intended move to Ready for deploy was then
  refused, since Done has no move out, and the deploy steps ended up in a
  comment on a Done card.
- **Stopped agents left tickets In Progress.** The owner stopped two agents
  (README retakes put off). Their tickets stayed In Progress with nothing
  working them, until the session moved them to Blocked by hand. Nothing on a
  card tells a live run from a dead one.
- **Stopped agents left things running.** One left a Vite dev server on port
  5173, which another agent needed (it worked round it with a relay
  container); the main session's attempt to stop it was refused by its
  permission mode, so it went to the owner. Earlier, a sync of source into the
  shared imbatranimOS dev container had copied a folder that then kept the
  container from starting for the next agent.
- **The hand-back lived in chat.** Each agent's report (commits, checks run
  and skipped, owner steps, questions) came back to the session and was
  relayed by hand. Some reached the board as a comment, most didn't. Five
  reports each ended with "decisions for you", and nothing collects them.
- **Load rules live in the controller's head.** Light checks only, at most one
  Docker-heavy job: written in each agent's prompt, invisible on the board.

## The HyperAgents and what each offers

| Project | What it is | The pattern worth a look |
|---|---|---|
| [hyperlight-dev/hyperagent](https://github.com/hyperlight-dev/hyperagent) | A CLI agent on the Copilot SDK: the model writes JavaScript handlers that run in QuickJS inside Hyperlight micro-VMs (1 s CPU, 5 s wall, 16 MB heap by default). Pre-release, last release 2026-07-03. Needs KVM, MSHV or WHP, which neither the laptop's WSL2 nor the VPS has. | Nothing is ambient: files, fetch and MCP are host plugins enabled one by one, approvals pinned to a hash of their code. Limits come as named profiles. State between handlers goes through one shared store. Output over 20 KB is written to a file and only its path comes back. |
| [FSoft-AI4Code/HyperAgent](https://github.com/FSoft-AI4Code/HyperAgent) ([arXiv 2409.16299](https://www.arxiv.org/pdf/2409.16299)) | A multi-agent system for software tasks: a Planner hands work to Navigator, Editor and Executor through a message queue. | The queue knows which worker holds which task, and the planner reads results from it rather than from each worker's chatter. |
| [hyperbrowserai/HyperAgent](https://docs.hyperbrowser.ai/hyperagent) | Playwright with an AI layer. | A step that worked once is recorded (its XPaths) and replayed later without the model. |
| [STEYZJ/HyperAgent](https://github.com/STEYZJ/HyperAgent) | A hyperspectral image classification pipeline. | Nothing; same name only. |

What none of them changes: the board is a view of the corpus, written through
one CLI, and no agent framework replaces Claude Code's subagents here. The
patterns are about what the board records, not about running agents.

## Candidates, ranked

1. **A run on the ticket** (brief 08). `start` opens a run (who, when) and
   the run's end move, or a `release` when an agent stops without finishing,
   closes it. Sync leaves a ticket with an open run alone when its brief is in
   `done/` and says so; a run older than a day counts as stale and sync closes
   the ticket as before. A card shows whether a run holds it. And the guide
   puts the last board move before the brief moves to `done/`, which alone
   would have prevented the closed-mid-run case. The pattern: FSoft's queue
   knows who holds a task; a Hyperlight handler owns its sandbox until it
   returns. It fixes a real loss and the next two build on it.
2. **What a run holds** (brief 12, promoted from its todo on 2026-11-06). An agent records
   what it starts that outlives a command (a port, a dev server's PID, a
   container, a scratch folder); `release`, the end move and `brief-board
   runs` list them, so whoever stops an agent can clean up, and a second agent
   can see that 5173 is taken. Hyperlight's "nothing is ambient", turned into
   a ledger. Run profiles (light, walk, Docker) could hang off the same
   record later, so a controller sees how many Docker-heavy runs are open.
3. **The hand-back on the board** (brief 09, promoted from its todo on 2026-11-06).
   One structured report at the end move (commits, checks run, checks
   skipped, owner steps, questions), with each open question shown on the card
   until answered, without blocking the ticket. Hyperlight's large-output rule
   applies: a long report goes in the repo (the brief's outcome note already
   is that file) and the board keeps the short form and the path.
4. **Replayed walks** (hyperbrowser). A browser walk that passed is kept as a
   script and rerun at Ready for test instead of walked again by a model. That
   belongs to the ui-test-plans skill in the skills repo, not to the board; no
   item here.
5. **A brief pinned at start** (Hyperlight's hash pinning). Warn when a brief
   changed after its run started. No case of it happened; not worth building.

## What the candidates must respect

From [decisions.md](decisions.md): one ticket per brief and none by hand;
the corpus wins, so a run only delays sync's correction until the run ends;
the UI stays read-only (runs open and close through the CLI); sync runs only
by hand; Blocked happens by agreement, so a released run leaves the ticket In
Progress for the owner's call rather than blocking it; a down board never
stops work, so runs are a record, never a lock an agent waits on.

## Recommendation

Build brief 08. Take the two todos to briefs once 08 has shown that agents
open and close runs reliably. The owner decides the stale threshold and
whether "The corpus wins" gets a revisit note for the delayed close (08 lists
both).

Followed up the same day in
[research-agent-runs-elsewhere.md](research-agent-runs-elsewhere.md), which
surveys other agent trackers, protocols, job systems and runtimes. It changed
three things here: a run stays alive by its own board writes and goes stale
after hours of silence rather than a day from its start, questions belong to
the ticket and need no run, and `brief-board runs` moved into brief 08.
