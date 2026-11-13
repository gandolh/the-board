---
summary: How the read-only board in the browser is built, as of 2026-11-13 (the redesign "The queue and the lanes": a Needs you queue, one sticky status row from 1100 px, lanes that stack below it, a bottom bar under 720 px). Its GETs and where the API is, polling every 10 s and the banner when the API is down, the tag filter (in the browser, carried between pages), lanes that stack below 1100 px and never scroll sideways (2026-11-13), cells past five cards that stop at 600px and scroll (2026-11-09), the Older Done page for Done past the board's 14 days and how a ticket is on exactly one of the two (2026-11-09), the shared header and the active sprint in it, the Sprints page of closed sprints (2026-11-10), the non-modal Base UI detail panel and the wrappers Base UI sits behind (2026-11-11), the Tailwind stylesheet, its tokens and the Light / Dark / System switch (2026-11-11), and the demo seed script.
updated: 2026-11-13
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
board-wide. Nothing scrolls sideways (since 2026-11-13, [decisions.md](decisions.md),
"Nothing on the board scrolls sideways"). From 1100 px one status row, sticky at the top
of the screen, is the column header for every lane; below 1100 px a lane stacks its non-empty
statuses as headings with their cards, in a grid of 300 px columns, and its empty statuses fold into one
line, "Backlog, Blocked: empty". Light, Dark and System are the owner's choice, light on a first visit
(see "Styling and themes" below). Ticket markdown goes through
`react-markdown` with `skipHtml`.

Since 2026-11-09 a cell holding more than five cards (`CELL_CARDS` in
`Board.tsx`) gets the `CELL_LONG` utilities and a `data-long` attribute: it
stops at `--cell-cap` (600px, about five Done cards) and scrolls inside, from 1100 px (below it the
cards flow in the page). Only those utilities cap
a cell, so one of five cards or fewer is as tall as its cards whatever their
height. Older Done
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
it). The group is `display: contents` (class `contents`), so its radios lay out
in the strip's own row; a box of its own wrapped the strip differently at
390 px, and Chrome keeps the `radiogroup` role on a `contents` element. The
wrappers take their utility classes as props from the caller.

## Styling and themes

Since 2026-11-11 the whole web app is Tailwind 4, from one stylesheet,
`web/src/styles/index.css`. Its `@theme` holds every token and clears
Tailwind's default colour, text, radius and shadow scales, so only the board's
own exist. Colours name a role (`surface`, `ink`, `ink-muted`, `line`,
`accent`, `danger`, `page`, `surface-sunk`, `banner-bg`, `banner-text`, plus `well-edge`, `outline`, `on-accent`,
`focus`, `scrim`, the four washes, `warn` and the seven status colours, named as the API names them) and are
`light-dark()` pairs. The type scale is `meta`, `small`, `body`,
`heading`, `title`, `display`; each size carries its line height, and some a weight (`small` is bold, `heading`
500, `title` and `display` 700). The text is Atkinson Hyperlegible Next, the ticket keys its Mono
(`font-mono`), both self-hosted from `@fontsource` packages.
The 14 px base sits on `body`, the root keeps the browser's size. `narrow:`
(`max-width: 1099px`) and `phone:` (`719px`) are custom variants, and `mid:` (`1239px`) a third; the
header's one row starts at 1240 px (`min-[1240px]:`). Each stops at the pixel before the edge the design names.

Classes that depend on data (a status's colour, a role's badge, a needs kind's
colour) are whole strings in a `Record` beside the component that uses them, so
Tailwind's scanner sees them. `web/src/lib/cn.ts` is `tailwind-merge` told these token
names. `looks.ts` holds the class strings several screens share (the button,
the count, the tag), and `MarkdownText.tsx` puts back, on its wrapper, what the
reset took from react-markdown's elements.

Light, Dark and System are a `RadioGroup` on the account page
(`ThemeSwitch.tsx`), kept in `localStorage` and never sent to the API, so the
board still only reads. `web/src/lib/theme.ts` sets `data-theme` on `<html>`; the boot
script in `web/index.html` does the same before the first paint, light when
nothing is stored. `color-scheme` follows the attribute, so System tracks the
operating system in CSS, with no listener.

`scripts/seed-demo.ts` (plain `node`) fills a scratch board with three
made-up projects. It refuses a board holding any other project. No one ticket
can carry all six message roles, because a confirmation needs Blocked → Done,
so the seed spreads them over two.

## The redesign (2026-11-13)

Brief 20 built the owner's approved direction "The queue and the lanes". [web/DESIGN.md](../../web/DESIGN.md)
records what shipped. In short:

- **Header** (`TopBar.tsx`): from 1240 px one 56 px row (name, sprint, blocked pill, the tabs Board, Older Done and
  Sprints, the clock, the tag select, the account); from 720 px the tabs take a second row with the tag select; under
  720 px a bottom bar (`BottomBar`) holds Board, Older Done, Sprints and the account, and the Sprints icon is a calendar.
  The current page has an ink bar. The header scrolls away; the status row stays.
- **Needs you** (`NeedsStrip.tsx`): a queue, a row per need (kind pill, key, title, the API's reason). The head line
  holds a `RadioGroup` of totals by kind; the rows of the chosen kind are drawn pressed, and "Show all" clears the
  choice. A row is not a control. On a phone the queue stops at four rows until "Show all N" (`usePhone`).
- **Lanes** (`Board.tsx`): a band 38 px high (a 36 px toggle in a 1 px edge), wells hanging 4 px below it. One DOM serves
  both layouts: each cell is a well from 1100 px and a heading with its cards below it.
- **Panel** (`DetailPanel.tsx`, `components/ui/Dialog.tsx`): still the non-modal Base UI dialog; under 720 px a bottom
  sheet below a dimmed strip of the screen, with no drag handle.
- **Checks**: `web/e2e/` (Playwright, Vite alone with every GET stubbed from `fixtures.ts`, a frozen clock) runs the
  focus ring, reduced motion, 390 and 360 px overflow and theme-switch specs in light, dark and system;
  `SHOTS_DIR=<dir> npm run test:e2e -w @brief-board/web -- shots` writes the screenshots. `npm run check:contrast`
  measures the built tokens.
