# Task 15: A long cell scrolls, and older Done gets a page

## Context

On 2026-11-09 the owner said the Done column grows too tall, and asked for
one of two things: a cell that scrolls once it holds more than five cards,
or a time filter on Done set to two weeks by default, with a separate page
for older Done tickets.

Half of the second idea is already built. The board shows Done tickets only
for `doneDays` after they got there (`DEFAULT_DONE_DAYS = 14` in
[shared/src/api.ts](../../../shared/src/api.ts), the cutoff on
`status_changed_at` in `Store.board`,
[server/src/store.ts](../../../server/src/store.ts)). The web app never
passes `doneDays`, so it always gets the default. What's missing is any way
to see a ticket once it has fallen out of those 14 days.

The window doesn't help yet. The board went live on 2026-11-03, so every
Done ticket is younger than 14 days. On 2026-11-09 the live board held 108
Done cards: imbatranimOS 32, vps-deploy 23, lantern 14, brief-board 9,
newspapper 5, and the rest 4 or fewer. A single cell of 32 cards is what
makes the board tall, and it will happen again after any big brief run,
whatever the window.

So this brief does both: every cell stops growing at five cards and scrolls
inside, and Done tickets older than the window get a page of their own.

**Build it on main after the owner has deployed briefs 08-14 and rebuilt the
local CLI.** The reason is the same as for briefs 13 and 14: `npm run
typecheck` rebuilds `cli/dist`, which is the CLI every agent on this machine
uses, and the server must not be behind it.

## Owner decisions

The owner asked for this brief on 2026-11-09 without settling the details.
The calls below are the writer's defaults. The owner can change any of
them before the build, and if they don't, build these.

1. **Which cells scroll.** Every cell, not only Done. A cell with five
   cards or fewer looks the same as today. A cell with more stops at about
   five cards' height and scrolls vertically inside the lane. In Progress or
   To Do can get long too after a big brief promotion, and one rule for all
   cells is simpler than a rule for Done. Rejected: a "Show 27 more" button,
   which adds state per cell that the owner didn't ask for.
2. **The board keeps its 14 days.** There's no time picker on the board. The
   window stays `DEFAULT_DONE_DAYS`, and anything older is on the new page.
   Rejected: a picker on the board (1 week, 2 weeks, a month, all), because
   then a ticket can be found in two places and the board goes back to
   being tall whenever the picker is set wide.
3. **The page.** "Older Done" at `<base>done`, linked from the header next
   to the tag filter. It lists Done tickets that reached Done more than 14
   days ago, grouped by project (alphabetical), newest first within each
   project. Each row shows the key, the title and the date it reached Done.
   Clicking a row opens the same detail panel the board uses. The tag filter
   applies here too. Until a ticket is that old (the first will be on
   2026-11-17), the page says "Nothing older than 14 days yet."
4. **Read-only.** Like the rest of the UI, the page writes nothing
   ([decisions.md](../../wiki/decisions.md), "The UI is read-only").

## What to do

1. **Cells.** In [web/src/styles.css](../../../web/src/styles.css), cap
   `.cell` height at roughly five cards and let it scroll vertically. A cell
   at or under five cards must look exactly as it does now: no reserved
   height and no scrollbar gutter. Keep focus visible, so that tabbing to a
   card scrolls it into view (the cards are already buttons). On narrow
   screens, lanes already scroll sideways
   ([styles.css](../../../web/src/styles.css), "Narrow screens"). Check
   that the vertical scroll inside a cell still works there and that the
   page itself never scrolls sideways.
2. **The route.** `GET /api/done` returns Done tickets that are not hidden
   and whose `statusChangedAt` is older than `olderThanDays` (default
   `DEFAULT_DONE_DAYS`, same bounds as `doneDays`). It takes an optional
   `tag` that works the way the board's does, and returns tickets in the
   page's order (decision 3). Put the query and response schemas in
   `shared/`. Nothing new is stored: `status_changed_at` already holds the
   date. No pagination; a few hundred rows is fine for now.
3. **The page.** Add `"done"` to `Page` in
   [web/src/route.ts](../../../web/src/route.ts), add `fetchDone` in
   [web/src/api.ts](../../../web/src/api.ts), and add a `DonePage` that is
   polled like the board and reuses `DetailPanel` and the tag filter. In the
   header, add an "Older Done" link on the board and a "Board" link back on
   the page.

## Files you OWN

- `web/src/styles.css`, `web/src/Board.tsx` (only if the cap needs markup),
  `web/src/route.ts`, `web/src/api.ts`, `web/src/App.tsx`, a new
  `web/src/DonePage.tsx`, and their tests
- `server/src/app.ts` and `server/src/store.ts` and their tests (the route)
- `shared/src/api.ts` (the route's schemas)
- `docs/architecture.md`, `corpus/wiki/status.md`,
  `corpus/wiki/architecture.md`, `corpus/log.md`

## Files you must NOT touch

- `server/src/db.ts`: no migration. The date is already stored.
- `server/src/sync.ts` and `cli/`: sync and the CLI don't change.
  `brief-board list --all` already prints Done tickets of any age.

## Acceptance

- Tests: the route returns only Done, not-hidden tickets older than the
  cutoff, in the page's order, narrowed by `tag`. A ticket exactly at the
  cutoff is on the board or on the page, never on both and never on
  neither. `pageOf` maps `done` to the page. The page renders its empty
  state and a grouped list.
- `npm test`, the typecheck, lint and the web build pass.
- A browser walk on a local board seeded with a lane holding 30 Done
  tickets, some older than 14 days. The lane's Done cell scrolls and its
  neighbours don't. The older tickets are only on the page, and clicking one
  opens its panel. At phone width, the page doesn't scroll sideways.
- **Owner steps:** `node cli.ts brief-board deploy` and `node cli.ts
  brief-board server` from vps-deploy. The CLI doesn't change, so there's
  nothing to rebuild for it.
