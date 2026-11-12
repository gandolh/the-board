---
summary: Which tags a ticket carries, as agreed 2026-11-12, and how tags change. One kind tag per ticket (feature, fix, redesign, base-ui, tailwind, server-structure, harness, deps, tracker, docs, research, infra, skill) and optional area tags (web, server, corpus, deploy, security), lower-case and hyphenated; create --tag, tag, untag and list --tag; the tags route, its tag events and refusals, why it leaves the run alone, what the CLI says to an older board; the script that tagged the existing tickets.
updated: 2026-11-12
---

# Tags

A tag is a label on a ticket, shown on its card and usable as a filter
([glossary.md](glossary.md)). The project tag is not one of these: it is the
lane. The server knows nothing of this list; it only checks that a tag `tag`
adds is lower-case words joined by hyphens, at most 50 characters, and at most
20 on a ticket. Keep the list small and stable: a new kind needs a reason
that no existing one covers.

## Kind: one per ticket

What the work is. Pick the first that fits, top to bottom.

| Tag | For |
| --- | --- |
| `tracker` | A brief that tracks the same work across repos ("... (tracker)"), or an estate run's board. |
| `deps` | A dependency bump: "Base UI 1.9.0", "@fastify/static moves to 10.1.9". |
| `skill` | Work on the skills library (`my-personal-skills`): a skill, a hook, a review of the library. |
| `redesign` | A visual redesign, such as "A redesign with Hallmark". |
| `base-ui` | Moving a web app's widgets onto Base UI by the conventions. |
| `tailwind` | Moving a web app's styles to Tailwind. |
| `server-structure` | A server moved into the house code structure. |
| `harness` | The house style and the quality harness (lint, format, conventions, checks). |
| `infra` | A stack, a container, the VPS or the deploy itself. |
| `docs` | A README, a docs site, guides. |
| `research` | A study that ends in findings or briefs, not shipped code. |
| `fix` | Something that was wrong and is put right. |
| `feature` | New behaviour for the people who use the app. The default when nothing else fits. |

`skill` is the one kind beyond the owner's first list: the skills library's
tickets (17 of the board's 133 on 2026-11-12) are neither features of an
app nor research, and `feature` would hide them.

## Area: optional, any number

Where the work lands, when the kind doesn't already say it: `web`, `server`,
`corpus`, `deploy`, `security`. `security` marks anything an attacker could
use, whatever its kind.

## Setting them

- When filing: `brief-board create <n> --title ... --summary ... --tag <kind>`.
- Later: `brief-board tag <ticket> <tag>...` and `brief-board untag <ticket> <tag>...`.
  Both are idempotent, and the ticket's History records each real change with
  its author. Filing a ticket again without `--tag` keeps its tags.
- A Backlog ticket belongs to sync and takes no tags; a closed sprint's tickets
  are frozen and keep the tags they had ([decisions.md](decisions.md),
  "Sprints, and only the CLI starts one").
- `brief-board list --tag <tag>` and the board's tag filter find them.

## How it is built

- **Server:** `POST /api/tickets/:key/tags`, body `{ add?, remove?, author? }`,
  answers `{ ticket, added, removed }` with only what really changed
  ([routes.ts](../../server/src/features/tickets/routes.ts),
  `Store.changeTags`). Each change is a row in `tag_events` (migration 8 in
  [db.ts](../../server/src/db.ts)), and the detail reply carries `tagEvents`,
  optional in the schema so a client reading an older board still parses.
  It refuses a Backlog ticket (400 `sync_owned`), a closed sprint's (409
  `sprint_closed`), an unknown one (404) and a 21st tag (400
  `too_many_tags`). Unlike every other write it leaves the open run as it
  was, so a pass that tags many tickets can't make a stale run look fresh.
- **PUT:** naming `tags` replaces them, as before; leaving them out keeps
  them on an update. Old clients always name them, so they behave as before.
- **CLI:** `tag` and `untag` check the pattern locally (exit 1). A board
  deployed before the route answers 404 `no route`, which they print as "the
  board's server doesn't take tag changes yet" (exit 2). `list --tag` filters
  on the client, so it works with `--sprint` too. `show` merges tag events
  into History by time.
- **Web:** unchanged. The card's chips and the panel's Tags row show a new
  tag at the next poll; the panel does not list tag events yet.

## Tagging the existing tickets

[`scripts/tag-tickets.mjs`](../../scripts/tag-tickets.mjs) reads the active
sprint's tickets from the board `brief-board` reaches and picks a kind for
each from its project, title and brief file name, by the table above. It skips
Backlog and any ticket that already carries a kind. It prints the plan as a
table and writes nothing unless given `--apply`; the rows marked `default`
got `feature` because no rule matched, so read them before applying. Run once
by the owner after the deploy of 2026-11-12's tags work; agents tag new
tickets as they file them.
