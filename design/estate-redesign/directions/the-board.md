# the-board (brief-board): three directions

Written 2026-11-12 by the art director. Repo: brief-board, brief 20. Recorded limits every direction keeps: read-only (no control that writes, the theme switch writes only to the device), project lanes of cards, the glossary words (ticket, card for the drawing only, lane), the seven status colours as API meanings with blocked and danger as one token, the family's token names (`surface`, `ink`, `accent`, `line`, `danger`, `page`, `surface-sunk`, `banner-bg`, `banner-text`, `warn`, the status names), and the routes Board, Older Done, Sprints, Account. Nothing new to navigate to.

Today's token sheet is Atlassian's published palette almost to the digit (`#172b4d`, `#0c66e4`, `#f4f5f7`, `#1d2125`, the `rgb(9 30 66)` shadow). Every hex moves in all three directions, A included. Do not copy `web/src/styles/index.css`.

## 1. Today's strengths (keep all of them)

1. "Needs you" is its own raised surface, read before the board. Each kind has its status colour and a count, and one click narrows the board to it.
2. Project lanes collapse, and each lane header gives its counts ("3 open · 1 done") beside the name.
3. The statuses keep a fixed order. Each column has a colour and a count, so a full Blocked or Ready for test column shows at a glance.
4. Figure and ground. Cards are raised white surfaces on sunken cells, and an empty status still shows as an empty slot.
5. The card reads top to bottom: key, title, run line, badges, tags, then the age right-aligned in tabular figures.
6. One header holds the sprint, the tag filter, the other pages, the blocked count and the last update.

Fix what today gets wrong, in every direction: tracked capitals on column heads (Floor 9), the "Blocked by: Wai…" badge cut to three letters, "Ready for deploy 1" breaking its count onto a second line, and at 390 lanes that scroll sideways from Backlog with almost nothing hinting at the other six columns.

## 2. The main screen

The board with its shell, route `/`. Today: `light-1280-board.png` and `light-390-board.png` (dark: `dark-1280-board.png`, `dark-390-board.png`) in `board/shots/the-board/`. The 1280 shot is a viewport and cuts the wicket lane. Draw the whole page.

## 3. The content fixture (word for word, from the shot and its stub `board-capture-a/board-shots.mjs`, run through the app's formatters)

Header: wordmark `brief-board` · `Sprint 3 · since 2026-11-02` · `Tag` with a select showing `All tags` · links `Older Done`, `Sprints` · chip `1 blocked` · `Updated 10:30:06 AM` · account link `demo`. Tab title `(1 blocked) brief-board`.
Needs strip: `Needs you` with four choices, `1 question`, `1 stale run`, `1 to test`, `1 to deploy`, none chosen (no "Show all" while the filter is off). Their reasons (the API's `Need.reason`, a real field; only B shows them, on purpose): question, almanac-6 "Which default reminder should a new all-day event get?"; stale run, wicket-15 "Run by builder-b, silent for 30 hours"; to test, shelfmark-31 "Open the search page, search for a title and check the covers load."; to deploy, almanac-4 "Run node cli.ts almanac server from the deploy checkout."
Columns, in this order, in source case: Backlog 2, To Do 4, In Progress 2, Blocked 1, Ready for test 1, Ready for deploy 1, Done 4.
Lanes, in this order, all open: `almanac` 3 open · 1 done; `lantern` 2 open · 1 done; `shelfmark` 4 open · 1 done; `wicket` 2 open · 1 done.

| Lane | Column | Key | Title | Run line | Badges, tags | Age |
|---|---|---|---|---|---|---|
| almanac | To Do | almanac-5 | A redesign with Hallmark | | web, design | 12h |
| almanac | Blocked | almanac-6 | Reminder times for all-day events | | `Blocked by: Waits on the owner's choice of default time`, `1 question`, server | 40h |
| almanac | Ready for deploy | almanac-4 | The server in the code structure | | server | 5h |
| almanac | Done | almanac-3 | The web app to Tailwind | | web | 26h |
| lantern | Backlog | lantern-20 | Poster size on phones | | web | 2d |
| lantern | To Do | lantern-19 | A redesign with Hallmark | | web, design | 14h |
| lantern | Done | lantern-18 | The server in the code structure | | server | 18h |
| shelfmark | Backlog | shelfmark-35 | A redesign with Hallmark | | web, design | 2d |
| shelfmark | To Do | shelfmark-34 | Lookup order keeps Google last | | server | 20h |
| shelfmark | In Progress | shelfmark-33 | Change username in the account page | builder-a · running 2h · heard 3m ago | web | 2h |
| shelfmark | Ready for test | shelfmark-31 | Search results page | | web | 8h |
| shelfmark | Done | shelfmark-30 | Reading goals | | web | 30h |
| wicket | To Do | wicket-14 | A redesign with Hallmark | | web, design | 9h |
| wicket | In Progress | wicket-15 | Retry a failed call once | builder-b · stale run, heard 30h ago · ran ≥ <1m (warn tone) | server | 1h |
| wicket | Done | wicket-13 | The server in the code structure | | server | 2d |

Every other cell is empty. Keep wicket-15's run line exactly as the code writes it. The words and their order are fixed. The "·" separators in the sprint line, the lane counts and the run lines are presentation: draw them as separate spans with a gap, or keep the glyph, but decide once per direction (Floor 10 bans dot-joined meta strings, and the critic will ask). Status names are source case. Capitals are CSS, and Floor 9 rules them out anyway.

Shared status set, all directions (text on `surface` ≥ 4.75 light, ≥ 5.8 dark). Light: backlog `#85704c`, todo `#5f6b7f`, ready_for_test `#8f6c00`, ready_for_deploy `#6550bd`, done `#1c7650`. Dark: `#c6ae84`, `#98a4b5`, `#dfb426`, `#a898f2`, `#55c996`. in_progress and blocked come from each direction's own palette. Banner: light `#fbefc4` / `#4a3805`, dark `#2f2914` / `#f0cd5c`. A sketcher may shift lightness to pass on its own surfaces, but not the hue.

Surface Floor, in all three directions: dark wells sit below the page (about 1.06:1), so every dark well carries a 1 px `line` edge (≥ 1.8:1 against the page). The Tag select and any field use `outline` (≥ 3:1). The figures below are pre-checked with WCAG 2 luminance. Re-run `contrast.mjs`.

## 4. Directions

### A. Swimlanes, settled (Evolve today)
- **Idea:** today's board, with a palette and type of its own and the column heads made readable at a glance.
- **Skeleton:** today's. A 56 px header bar on `surface` across the full width, with today's items in today's order. The Needs you card sits below it. A sticky row of seven column heads, then each lane: a header line (chevron, name, counts), then a row of seven sunken wells holding raised cards. Container capped at 1440 with 24 px gutters. At 390 the header takes two rows (wordmark, blocked chip, account; then sprint, Tag, links), the needs choices make a 2×2 grid, and each lane still scrolls sideways, but cells snap at 82% of the width so the next column peeks in. Its own column name sits at the top of each cell, as today.
- **Type:** Onest (Google), 400/500/600, tabular figures on, wordmark at 650. Scale 12/16 meta, 13/18 small, 14/20 card body at 1280 (16/24 at 390), 16/24 lane name, 18/24 column count, 22/28 wordmark. One family.
- **Palette** (light / dark): page `#eef1f5` / `#13171d`; surface `#ffffff` / `#222932`; surface-sunk `#e2e6ed` / `#0d1014`; ink `#182235` / `#e2e7ee`; ink-muted `#525d72` / `#9ca7b6`; line `#c3cbd6` / `#3b4552`; outline `#78839a` / `#6f7c8e`; accent = in_progress, cobalt `#1f52c4` / `#8aaaff`, on-accent `#ffffff` / `#0e1a3a`; danger = blocked `#b3302a` / `#f07a70`; warn `#974603` / `#eda06a`. Surface on page 1.13 / 1.23, card on well 1.25 / 1.30.
- **Signature:** the status rail. Sticky column heads, each a raised tab with a 3 px cap in its status colour, the name in sentence case and the count at 18 px tabular, so a non-empty Blocked or Ready for test stands out before you read a card.
- **Reference:** `stripe`, for its dense tabular rhythm and restraint. Nothing of its palette.
- **Reopens:** none.

### B. The queue and the lanes
- **Idea:** Needs you becomes a queue that says what is being asked without opening a ticket, and each lane carries its own head, so it reads whole on any width.
- **Skeleton:** two header rows. The first holds the wordmark, the sprint, the blocked chip, Updated and the account. The second is a tab row (Board, Older Done, Sprints as tabs, the current one marked) with the Tag select at its right end. Below them, Needs you is a raised band of four tiles in a 2×2 grid at 1280, each tile showing its kind and count, the key, the ticket title and the reason line (the reasons from the fixture). Below that, a slim row of seven status chips gives the board-wide counts (Backlog 2 … Done 4) in the status colours. Each lane then opens with a raised head band (radius 12 on top: chevron, name, counts, and its own seven column labels), over its seven sunken wells of cards. No outer box wraps the lane, so there is never a card inside a card (Floor 11). There is no global sticky column row. At 390 a bottom navigation bar (Board, Older Done, Sprints, and the account as `demo` with a person icon, 56 px plus the gesture inset) replaces the tab row. No new copy. The header's second line holds the sprint and the Tag select. The status chips wrap to two rows, the tiles stack in one column, and inside each lane the statuses stack vertically: each non-empty status is a heading with its count over its cards, and the empty ones fold into one muted line (lantern's reads "In Progress, Blocked, Ready for test, Ready for deploy: empty". The word "empty" is new copy, so put it in a Decision sticky). Nothing scrolls sideways.
- **Type:** Atkinson Hyperlegible Next (Google) 400/500/700 for the UI, Atkinson Hyperlegible Mono 400 for ticket keys only (gate 64: ages and run lines are not IDs). Scale 12/16, 14/20, 15/22 card body, 18/24 lane name, 22/28 wordmark at 700.
- **Palette** (light / dark), violet-grey neutrals, kept off shelfmark's warm greys: page `#f0f0f4` / `#141419`; surface `#ffffff` / `#24242d`; surface-sunk `#e4e3eb` / `#0e0e12`; ink `#1a1a24` / `#e9e8f0`; ink-muted `#575668` / `#a3a2b3`; line `#c9c8d4` / `#40404c`; outline `#7a7990` / `#727186`; accent is the ink itself, `#1a1a24` / `#e9e8f0` with on-accent `#ffffff` / `#141419` (links underlined, the active tab an ink bar), so the status colours carry all the chroma. The question kind and the question badge keep blue (the in_progress hue), as today, so each needs kind keeps its colour; in_progress `#2457c5` / `#86a9f5`; danger = blocked `#b42d26` / `#f07a70`; warn `#974603` / `#eda06a`. Surface on page 1.14 / 1.19.
- **Signature:** the Needs you queue, four tiles that show the question, the stale run, the test step and the deploy command in the API's own reason text.
- **Reference:** `cal`, for its nav-pill tab row and its soft 12 px radius.
- **Reopens:** none of the decisions. It changes board-ui.md's record that lanes scroll sideways below 1100 px. Flag that as a reopened record, not a decision.

### C. The ledger grid
- **Idea:** the board drawn as a frozen grid, where the project names hold a left column and the statuses hold the top row, so both stay in view at any scroll.
- **Skeleton:** a single header bar (wordmark, sprint, Tag, Older Done, Sprints, blocked chip, Updated, account). Needs you is a slim raised row of four tiles, left-aligned, each a status-tinted count button. Then the grid, straight on the page with no box around it: a frozen header row of seven raised `surface` heads and a frozen first column, 120 px, of raised project heads (name and chevron on one line, the counts under it). Cells are sunken `surface-sunk` wells divided by `line` rules, and the cards in them are the only raised layer inside the grid, `surface` with a 1 px `line` edge (card on cell is only 1.14 / 1.09). Columns come to about 155 px at 1280. A head puts its count chip top right and lets the name wrap to two lines under it, never the count. A collapsed lane folds into one short row of counts per cell. At 390: a sticky strip of seven status tabs with counts (To Do selected in the comp), one status at a time, its cards grouped under project headings that keep the lane counts ("3 open · 1 done"). The four needs tiles sit in a 2×2 grid above the strip. A bottom navigation bar (Board, Older Done, Sprints, and the account as `demo` with a person icon) holds the other pages.
- **Type:** Archivo (Google, variable width). Project names and the wordmark at wdth 112, weight 650. Column heads at 600, body at 400. Scale 12/16, 13/18, 14/20 card body (16/24 at 390), 16/22 project name, 20/26 wordmark. One family.
- **Palette** (light / dark): page `#e6e9ed` / `#101316`; surface `#ffffff` / `#1e2329`; surface-sunk `#eef0f3` / `#171b20`; ink `#161c24` / `#e4e8ec`; ink-muted `#4f5968` / `#9aa4af`; line `#bcc4ce` / `#3f4851`; outline `#727d8c` / `#6c7784`; accent mulberry `#8e2a6e` / `#f3a8dc`, on-accent `#ffffff` / `#2a0b1f`; the question kind and badge keep blue, the in_progress hue, as today; in_progress `#2457c5` / `#86a9f5`; danger = blocked `#b3302a` / `#f07a70`; warn `#974603` / `#eda06a`. Use the accent only for links, focus, the selected tab and the chosen need, never next to a danger fill without a label. The two are 1.48:1 apart in dark, and the hue does the rest.
- **Signature:** the frozen corner. Project names and status heads stay pinned while the grid scrolls in either direction, and a collapsed lane still shows its counts per status.
- **Reference:** `airtable`, for the grid of records with a frozen first column and sober ink. Square corners after `ibm`'s Carbon tiles.
- **Reopens:** none of the decisions. It changes board-ui.md's record (lanes scroll on their own below 1100 px, each lane shows its column names). At 390 a lane becomes a project heading inside one status. That keeps one project tag per lane in meaning, but flag it, since the lane row is no longer drawn on the phone.

## 5. Registry lines

| the-board (A) | Swimlanes, settled | Onest | Onest | cobalt blue (today's family) | header bar; needs card; sticky status rail; lanes of sunken wells with raised cards |
| the-board (B) | The queue and the lanes | Atkinson Hyperlegible Next | Atkinson Hyperlegible Next (+ Mono for keys) | ink (neutral); status colours carry the chroma | header plus a tab row; a needs queue of 2×2 tiles; board-wide status chips; each lane a raised head band over its wells; phone bottom bar, statuses stacked |
| the-board (C) | The ledger grid | Archivo (wide) | Archivo | mulberry | header bar; needs tiles; a frozen grid, project column and status row raised, no outer box; phone status tabs and a bottom bar |
