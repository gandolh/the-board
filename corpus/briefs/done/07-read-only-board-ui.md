# Task 07: Read-only board UI

## Context

The owner looks at the board in a browser to see what is happening on every
project. The UI never writes. The owner asks an agent to make moves ("The UI
is read-only" in [decisions.md](../../wiki/decisions.md)). It reads
`GET /api/board` and `GET /api/tickets/:key` as defined in
`shared/src/api.ts` (brief 02).

The layout is conventional Jira. A metaphor-led UI was rejected on another of
the owner's projects as hard to navigate, so there's no visual concept here.
Familiar affordances only. The words on screen come from
[glossary.md](../../wiki/glossary.md).

## Files you OWN

```
web/src/**  web/index.html  web/package.json (dependencies only)
web/vite.config.ts  scripts/seed-demo.ts
```

## Files you must NOT touch

`shared/`, `server/`, `cli/`, `corpus/`.

## What to do

1. **Board.**
   - The column headers (To Do, In Progress, Blocked, Ready for test, Ready
     for deploy, Done) sit once at the top and stay visible while scrolling.
   - Each project tag gets a lane, a row with its tickets under the matching
     columns.
   - Lanes with open tickets come first, then the rest, alphabetically.
   - A lane with nothing open starts collapsed, showing the project name and
     its Done count. Clicking expands it.
2. **Header.**
   - The name.
   - A filter on the other tags.
   - A count of Blocked tickets.
   - When the data was last fetched.
3. **Cards.** Each card shows the key, the title, its labels, and how long it
   has been in its column.
4. **Detail.** Clicking a card opens a side panel with:
   - the title, and the key with a copy button (the owner pastes it into a new
     session),
   - the status and tags,
   - the brief path with a copy button,
   - the summary rendered as markdown,
   - comments oldest first, each labelled with its role (Block reason, Test
     notes, Deploy steps, Confirmation, Conclusion, Comment),
   - the history.

   The panel has no buttons that change anything.
5. **Markdown.** Use `react-markdown` without raw HTML.
6. **Updates.**
   - Poll `/api/board` every 10 seconds, and pause while the tab is hidden.
   - The tab title shows the Blocked count, for example "(2 blocked)
     brief-board".
   - If the API is unreachable, show a quiet banner and keep the last data on
     screen.
7. **Theme.** Light and dark follow the system.
8. **Narrow screens.** At phone width, columns inside a lane may scroll
   sideways, but the page itself must not.
9. **Demo data.** `scripts/seed-demo.ts` creates tickets across three made-up
   projects, in every status, with comments of every role, through the API.
   Point it at a dev database, never at `data/`.

## Acceptance

- Against the seeded dev server, at 1440px and at 390px width, take
  screenshots of:
  - the board,
  - a collapsed lane,
  - the tag filter,
  - the detail panel for a ticket with comments of every role.
- No element in the UI sends anything but a GET.
- `npm run typecheck && npm run lint && npm run build` pass.

## Outcome (2026-10-09)

Done. `web/src/`: `App.tsx` (header, filter, banner, tab title), `Board.tsx`
(sticky column headers, lanes, `orderLanes`), `Card.tsx`, `DetailPanel.tsx`,
`usePolling.ts`, `api.ts` (the only requests, both GETs), `labels.ts`,
`time.ts` and `styles.css`. `react-markdown` 10.1.0 with `skipHtml`.
`scripts/seed-demo.ts` runs with plain `node` (Node 24 strips the types).

Calls the brief left open:
- **No single ticket can carry all six roles.** A confirmation needs Blocked →
  Done and a conclusion any other move into Done, and nothing leaves Done. The
  seed's `paper-kite-21` carries the other five; `paper-kite-22` carries the
  confirmation.
- The tag filter works on the polled board in the browser, so its options are
  every tag on the board. The Blocked count and the tab title stay board-wide
  while filtering.
- A lane can be collapsed or expanded by hand either way; the starting state
  is collapsed exactly when it has nothing open.
- Below 1100 px the sticky header row gives way to a column name inside each
  lane, because lanes there scroll sideways on their own and one header row
  could not stay aligned with all of them.
- The seed refuses a board that holds any project other than its three, and
  skips tickets it already made.

Verified (2026-10-09) in agent-browser against a dev server on a scratch
database, seeded: the board, the collapsed `orchard-app` lane, the `ui` and
`infra` filters, and the detail panel for `paper-kite-21`, at 1440 and 390 px.
At 390 px the page is 390 px wide while each lane scrolls its 1360 px of
columns. With the API stopped, the banner showed and nine cards stayed on
screen. The tab title read "(1 blocked) brief-board". Typecheck, lint and
build pass.
