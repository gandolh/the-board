---
summary: How the read-only board in the browser is built, as of 2026-11-10. Its GETs and where the API is, polling every 10 s and the banner when the API is down, the tag filter (in the browser, carried between pages), lanes that scroll sideways below 1100 px, cells past five cards that stop at 600px and scroll (2026-11-09), the Older Done page for Done past the board's 14 days and how a ticket is on exactly one of the two (2026-11-09), the shared header and the active sprint in it, the Sprints page of closed sprints (2026-11-10), the non-modal Base UI detail panel and the wrappers Base UI sits behind (2026-11-11), and the demo seed script.
updated: 2026-11-11
---

# Board UI

Code: `web/src/`. Read-only, see [decisions.md](decisions.md), "The UI is
read-only". How the rest fits together: [architecture.md](architecture.md).

`web/src/`; `api.ts` holds the only requests, all GETs (the board, a
ticket, since 2026-11-06 what needs the owner, for the strip above the
lanes that narrows the board to one kind at a click, since 2026-11-09
older Done, and since 2026-11-10 the sprints and one sprint), built from
`API_BASE` in `base.ts` (`/brief-board-api`). Vite's `base` is
`BRIEF_BOARD_BASE`, default `/brief-board/`, so assets load from
`/brief-board/assets/`; in dev, Vite proxies `/brief-board-api` to
127.0.0.1:8806 and strips the prefix as Caddy does. It polls every 10 s
(`POLL_MS`), pauses while the tab is hidden, and keeps the last data behind a
banner when the API is down. The tag filter works in the browser on the polled
board; the Blocked count and the tab title ("(1 blocked) brief-board") stay
board-wide. Below 1100 px each lane scrolls sideways on its own and shows its
own column names, since one sticky header row can't stay aligned with all of
them. Light and dark follow the system. Ticket markdown goes through
`react-markdown` with `skipHtml`.

Since 2026-11-09 a cell holding more than five cards (`CELL_CARDS` in
`Board.tsx`) gets `.cell-long`: it stops at `--cell-cap` (600px, about five
Done cards) and scrolls inside, and on a narrow screen its column name
sticks to its top. Only that class caps a cell, so one of five cards or
fewer is as tall as its cards whatever their height. Older Done
(`DonePage.tsx`, `<base>done`) lists `GET /api/done`: Done tickets past the
board's 14 days, not hidden, by project as the lanes are, newest Done first.
The board keeps a ticket while `status_changed_at` is at or after the cutoff
and the page takes it once it is before, so a ticket is on exactly one. The
header (`TopBar.tsx`) is shared by both pages, links one to the other next
to the tag filter, and the tag choice carries between them.

Since 2026-11-10 the board and older Done show the active sprint's tickets
only. The header names it next to the brand, "Sprint 2 · since 2026-11-10"
(`SprintName`, the day as stored, UTC), from the board's own response, so it
needs no second call. The Sprints page (`SprintsPage.tsx`, `<base>sprints`,
linked from both headers) lists the closed sprints from `GET /api/sprints`,
newest first: each is a heading, "Sprint 1 2026-11-10 to 2026-11-10 4 Done",
that opens (a `Collapsible`, like a lane) to its Done tickets by project,
older Done's list with `h4` project headings, fetched once from
`GET /api/sprints/:number`, since a closed sprint never changes. The newest
starts open; an empty one says "No Done tickets."; a row opens the detail
panel. Nothing on it writes: starting a sprint is the CLI's
([decisions.md](decisions.md), "Sprints").

Since 2026-10-23 the detail panel is a non-modal Base UI `Dialog` with
`disablePointerDismissal`, so clicking another card switches the ticket
instead of closing the panel. `App.tsx` keys it by ticket, so focus lands on
Close and Escape returns it to the card that opened it. Since 2026-11-11 the
panel's heading is the `Dialog.Title`; until the ticket loads the panel is
named by `aria-label="Ticket <key>"`. Lanes and sprints are `Collapsible`s.

Since 2026-11-11 Base UI is imported only under `web/src/components/ui/`:
`Dialog.tsx` (`Panel` and `PanelTitle`, the side panel `DetailPanel` fills),
`Collapsible.tsx` (the lane and the sprint, with the chevron and an optional
`h3` around the trigger) and `RadioGroup.tsx`. The needs strip is a
`RadioGroup` named "Needs you": one Tab stop, the arrow keys move and choose,
nothing is chosen while the filter is off, and "Show all" beside it clears the
choice (a chosen radio can't be unchecked, so a second click no longer clears
it). The group is `display: contents` (`.needs-group`), so its radios lay out
in the strip's own row. The classes are still `styles.css`'s, passed in as
props; moving them to Tailwind is brief 18.

`scripts/seed-demo.ts` (plain `node`) fills a scratch board with three
made-up projects. It refuses a board holding any other project. No one ticket
can carry all six message roles, because a confirmation needs Blocked → Done,
so the seed spreads them over two.
