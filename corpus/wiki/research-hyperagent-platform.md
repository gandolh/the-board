---
summary: Research of 2026-11-06 into hyperagent.com, the hosted agent platform the owner meant (seen in ThePrimeagen's promos), not the HyperAgent projects in research-agent-runs.md. Who makes it (the Airtable team, now Hyperagent, Inc.), when it launched, its monthly plans and metered cost per run, its models and its cloud sandbox per thread; that ThePrimeagen's segments could not be found; its ways of running a fleet (Command Center, Inbox, delegation cards, rooms, schedules and Live Mode, learning review, rubrics) set against what brief-board has, what briefs 08 and 09 add and what it lacks; three ranked candidates (run duration and tokens, one needs-you list, a Discord nudge from just-a-bot) and what is not for us. No brief or todo written.
updated: 2026-11-06
---

# Hyperagent, the hosted agent platform

On 2026-11-06 the owner said the "HyperAgent" they meant is
[hyperagent.com](https://www.hyperagent.com/), seen in ThePrimeagen's promo
videos, and that they liked the idea of the platform. The first two passes,
[research-agent-runs.md](research-agent-runs.md) and
[research-agent-runs-elsewhere.md](research-agent-runs-elsewhere.md), read
other projects with the same name and other agent trackers. This page reads
the platform from its homepage, its documentation and press coverage. Every
URL was read on 2026-11-06. Nothing was signed up for or tried, so the
features below are as documented, not as tested.

## What it is

The Airtable team made it. A Hacker News submission of 2026-02-20 is titled
["Hyperagent, Made by the Team at Airtable"](https://news.ycombinator.com/item?id=47090865),
and Browserbase's [case study](https://browserbase.com/blog/case-study-hyperagent)
of 2026-07-02 says Airtable built it and quotes Howie Liu as Airtable's CEO.
The homepage itself names no maker. The
[terms](https://hyperagent.com/terms?standalone=1), last updated 2026-08-31,
name the provider as Hyperagent, Inc., domiciled in California.
[RuntimeWire](https://runtimewire.com/article/airtable-carved-out-hyperagent-before-bending-spoons-deal)
(2026-08-05) reports that Airtable moved the Hyperagent business into a
separate Delaware corporation before Bending Spoons signed, on 2026-08-04, to
buy Airtable's core business at an enterprise value of $1.285 billion, citing Bending Spoons' SEC
6-K.

It is a hosted service. Each thread gets
[its own Linux sandbox](https://www.hyperagent.com/docs/tools/data-and-code.md)
with a shell, Node.js 24, Python 3 and headless Chrome; files persist across
turns in that thread only, local servers work only inside it, and inbound
traffic and SSH are not supported. Web browsing runs on Browserbase, which
counted more than 300,000 Hyperagent sessions since April 2026 (the case
study above). The docs describe no self-hosted option.

Money is a dollar credit balance. The
[plans](https://www.hyperagent.com/docs/billing/plans.md) run monthly from
Hyperagent 20 ($20 buys $20 of credit) to Hyperagent 10000 ($10,000 buys
$14,500); pay-as-you-go and annual plans ended on 2026-08-26. A
[free tier](https://www.hyperagent.com/docs/billing/plans/free-plan.md)
offers low-cost models, research and browsing, schedules at most daily and one
Live Mode agent at most hourly, with no image, video or audio. Per the
[credits page](https://www.hyperagent.com/docs/billing/credits.md), "A run's
cost is the sum of the metered work behind it": model tokens, image and video
generation, speech, web search, browser time, integration actions and avatar
video. That is what the homepage's sample figures are, such as "8m $6.41" for
an out-of-home ad campaign and "29m $24.79" for a property video: the run's time
(the page doesn't define "m") and its metered cost. Plan credit lapses at the
end of the period; an agent can carry a budget limit per turn and a run time
limit ([models and compute](https://www.hyperagent.com/docs/concepts/agents/models.md)).
A connected ChatGPT subscription can cover GPT models.

It runs many models: Claude (Opus 5.5 down to Haiku 4.5), OpenAI's GPT-6
family, Gemini, Meta's Muse, Grok and open models such as Moonshot's Kimi K3
([supported models](https://www.hyperagent.com/docs/reference/supported-models.md)).
An Auto setting picks a model per message by a Quality, Balanced or Low cost
profile. The terms list Anthropic, Fireworks.ai, Google, OpenAI and Vercel as
AI subprocessors.

Its nouns, from the [docs index](https://www.hyperagent.com/llms.txt): an
agent is a saved role with instructions, tools, knowledge and an autonomy
policy; each job runs in a thread; a room is a shared conversation of people
and agents; the Inbox holds what waits on a person; the Command Center is the
fleet view; the Library keeps outputs. Agents start from a message, a
schedule, Live Mode, Slack, Telegram, email, a webhook, an MCP client or
another agent.

## What the promo videos show

Not found. No ThePrimeagen video or post that mentions Hyperagent turned up in
web searches (standard and extended) or in a
[YouTube search](https://www.youtube.com/results?search_query=primeagen+hyperagent),
and the channel's own search page stopped at a cookie wall.
[Sponsorradar](https://sponsorradar.com/channels/theprimeagen) lists only Turso
(2026-06-24) and Blacksmith.sh (2025-07-03) for his channel. Other creators
did post Hyperagent videos, such as Rob Pene's test of whether it is "worth $6
every 10 minutes" (same YouTube search), and some guides carry invite links
with $1,000 of bonus credit
([one example](https://sidsaladi.substack.com/p/hyperagent-101-the-complete-guide)).

The nearest sourced stand-in is the homepage: a roster of role agents (editor,
creative director, podcast producer, social media manager), a brief handed to
the fleet, each agent in its own environment, every search and artifact
visible as it is built, and finished deliverables priced by time and dollars.
Secondary coverage ([Stork](https://www.stork.ai/blog/airtables-ceo-just-built-your-ai-team))
describes a live demo where one brief fans out to agents that build a startup
end to end for about $35; that source is low quality and the figure is
unconfirmed. A link to the video the owner saw would settle this section.

## How it runs a fleet, against the board

"Here" says whether brief-board has it, has it briefed in
[brief 08](../briefs/done/08-a-ticket-knows-the-run-that-works-it.md) or
[brief 09](../briefs/done/09-the-hand-back-goes-on-the-board.md), or lacks it.

| Hyperagent | Source | Here |
|---|---|---|
| The Command Center, for owners: Needs Attention (the Inbox), Active Operations (runs executing now), total cost with a breakdown, average score with trends, the agent roster and recent runs. It links to detail and acts on nothing itself. | [Command Center](https://www.hyperagent.com/docs/concepts/command-center.md) | Active runs: briefed, 08's run line and `brief-board runs`. Cost: lacks (candidate 1). Score: lacks, not for us. A roster has nothing to list with one agent per project. |
| The Inbox holds questions, approvals, mentions and failing schedules. "Reading the item is not the same as approving it, answering it, or fixing the underlying problem." | [Inbox](https://www.hyperagent.com/docs/concepts/teams/inbox.md) | Questions: briefed, 09's badge and `brief-board questions`, cleared only by `answer`. One list of everything waiting on the owner: lacks (candidate 2). |
| A question or approval pauses the run in its thread; a scheduled run's write waits in the Inbox "before the same run continues". | [Autonomy](https://www.hyperagent.com/docs/concepts/agents/autonomy.md), [blog of 2026-08-24](https://www.hyperagent.com/blog/agents-do-more-stay-in-control/) | Differs on purpose: a background agent here can't wait, it ends its turn, so 09 keeps questions on the ticket after the run. |
| Delegation: the caller writes a brief with every input, since the other agent "will not see the original conversation"; the parent shows a card reading Running, Finished, Failed or Unavailable with a link to the child's thread; one level deep by default, two at most; the first account pays and the child's budget can't exceed the caller's cap. | [Agents working together](https://www.hyperagent.com/docs/concepts/agents/invocations/other-agents.md) | Has: corpus briefs are self-contained and the controller delegates one level. Briefed: 08 records how a run ended (`moved`, `released`, `stale`). No budget cap here. |
| Every run is a thread holding "the complete record of what the agent read, did, and produced"; an agent's Activity lists one row per thread. | [Activity](https://www.hyperagent.com/docs/concepts/agents/activity.md) | Has, split three ways: history and comments on the ticket, the transcript in Claude Code, the outcome note in the repo. |
| Cost on every run: time and dollars on each sample, a Usage card itemized by provider and model, a budget limit per turn and a run time limit. | [Credits](https://www.hyperagent.com/docs/billing/credits.md) | Lacks (candidate 1). |
| A room's status line shows which agent is working, with a Stop that interrupts its current and queued work; room notes are "a shared document where agents record decisions, findings, and unfinished work". | [Working in a room](https://www.hyperagent.com/docs/concepts/rooms/working-in-a-room.md) | Briefed: 08's run line, and `release` after the controller stops an agent. Has: the corpus wiki and log are the notes. |
| "A schedule never runs two jobs at once"; missed runs make no backlog; Live Mode checks at most every 30 minutes, "stays silent while everything is fine" and pauses after three errors in a row. | [Schedules](https://www.hyperagent.com/docs/concepts/agents/invocations/schedules.md), [Live Mode](https://www.hyperagent.com/docs/concepts/agents/invocations/live-mode.md) | No scheduled agents here. One run per ticket: briefed, 08's `start` warns on another author's fresh run. Silent unless needed: candidate 3. |
| One sandbox per thread, local servers only inside it. | [Code and files](https://www.hyperagent.com/docs/tools/data-and-code.md) | The isolation the laptop lacks, why a dev server on 5173 clashed on 2026-11-05. The board-sized answer is the todo [a-run-lists-what-it-holds](../todos/a-run-lists-what-it-holds.md). |
| Agents propose memories, skills and instruction changes; under the default "nothing changes what the agent knows until you accept it", and a dismissed proposal won't come back. | [Learning](https://www.hyperagent.com/docs/learning.md), [Manage learnings](https://www.hyperagent.com/docs/learning/manage-suggestions.md) | Outside the board: memory and skills belong to Claude Code and the skills repo. |
| Rubrics scored on demand by a model judge, Opus 5 by default. | [Rubrics](https://www.hyperagent.com/docs/learning/rubrics-and-evaluations.md) | Lacks; not for us. |
| Per action Allow, Ask or Deny; "Without an available approval path, the action is blocked." | [Autonomy](https://www.hyperagent.com/docs/concepts/agents/autonomy.md) | Claude Code's permission modes do this on the laptop, and deploys stay owner steps. |
| For a stopped run: "Repeating the original request does not resolve a pending decision", and check whether an outside action already succeeded before retrying. | [Troubleshooting](https://www.hyperagent.com/docs/reference/troubleshooting-faq.md) | Agrees with 08's resume and `release -m`. Reading the ticket's history and the git log before resuming is guide text, no build. |

Briefs 08 and 09 already cover most of what the platform does to keep track
of a fleet: who is working what, how a run ended, and questions that outlive
the run. Three things are new: what a run cost, one place for everything
waiting on the owner, and a nudge that reaches the owner away from the board.

## Candidates, ranked

Ranked by value against cost, against [decisions.md](decisions.md): the UI
stays read-only, sync stays by hand, no new column, and runs are a record.

1. Run duration and tokens, in brief-board. The card, `show` and `brief-board
   runs` give a closed run's duration, derived from brief 08's start and end
   times with no new input, and brief 09's report lines gain `Tokens:`, which
   the controller fills when it has a figure (a small build after 08, guide
   text for the tokens).
2. One needs-you list, in brief-board. A read-only command and a strip on
   the board gather open questions (09), stale runs (08) and tickets waiting
   in Ready for test and Ready for deploy, derived like the question badge
   (a small build once 08 and 09 exist).
3. A Discord nudge, in just-a-bot. The bot reads that list on a timer, with
   no model call, and posts only when it changes, the Live Mode rule of
   silence while all is fine (a build plus a read token, light enough for the
   VPS, and the owner's call whether pings are wanted).

On 2026-11-06 the owner picked candidates 1 and 2: brief 10 (a run shows
how long it took, plus brief 09's `Tokens:` line) and brief 11 (one list of
what needs the owner). Candidate 3 wasn't picked.

## Not for us

- Running the estate's briefs on Hyperagent itself. Its sandboxes can't reach
  the laptop's repos, Docker Desktop or the dev containers, it bills every
  metered step on top of a plan, and pushes and deploys stay the owner's.
- Schedules and Live Mode that run a model on a timer. Every check is billed,
  agents here run only in a session the owner starts, and the VPS is too small
  to host agents.
- A roster of role agents. Agents here work one project each and the brief is
  the role.
- Rubrics scored by a model judge. Each evaluation spends tokens, and Ready
  for test is the owner's own review.
- A queue of proposed learnings. Worth a look for memory and skills, but that
  belongs to Claude Code and the skills repo, not the board.
- Allow, Ask and Deny policies per action. Claude Code's permission modes
  already gate actions on the laptop.

## Unconfirmed

- ThePrimeagen's promo segments and what they show (see above).
- The launch date. The HN submissions of 2026-02-20 and
  [2026-02-24](https://news.ycombinator.com/item?id=47140784) are the firmest
  evidence; RuntimeWire's
  [Chinese edition](https://runtimewire.com/zh/article/airtable-carved-out-hyperagent-before-bending-spoons-deal)
  says Howie Liu introduced it on 2026-02-19 (seen in a search snippet only);
  a [wiki page](https://ai.miraheze.org/wiki/Hyperagent_(platform)) says "the
  first half of 2026"; a
  [guide](https://www.nocodefounders.com/guides/build-an-agent-fleet-with-hyperagent)
  describes a waitlist in June 2026 (search snippet only); the
  [changelog](https://www.hyperagent.com/docs/changelog) opened a free tier on
  2026-10-21.
- That the Bending Spoons deal closed on 2026-09-04. Only secondary sources
  say so, such as [Carly's pricing post](https://www.usecarly.com/blog/hyperagent-pricing/)
  of 2026-09-30, a competitor's; RuntimeWire on 2026-08-05 called it pending.
- The $35 startup demo, and anything from affiliate or competitor reviews,
  such as which actions cost most or a "plan mode"
  ([one review](https://www.aitoolssme.com/review/hyperagent), not read).
- "The work never goes stale". The docs say a published page is static and
  changes only when someone publishes a new version, with a "Source updated"
  flag when its source changed
  ([webpages and slides](https://www.hyperagent.com/docs/tools/webpages-and-slides.md)).
  The nearest mechanisms are a schedule that reruns the agent in one thread,
  and Live Mode.
