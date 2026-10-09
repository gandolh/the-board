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
