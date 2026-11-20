# The board's notes: The board

The estate redesign board is a private canvas. This file copies what its page for this app said beside the screens: the owner's asks, the decisions, the rules the design reopened, the open questions and the Floor. The owner's answers are in [README.md](../README.md#the-owners-decisions).

## Asks to the owner

- 1. Reopened record: board-ui.md says lanes scroll sideways below 1100 px. Proposed: they never do, and each lane stacks its statuses on a phone. Accept? 2. New copy on a phone: a lane folds its empty statuses into one line, "Backlog, Blocked: empty" (the word "empty" is new). Keep it? 3. Approve The queue and the lanes as the-board's direction? (beside `the-board-direction`)

## Decisions

- Needs you is a queue, one 36 px row per need: kind pill (Question, Stale run, To test, To deploy), key, title and the API's own reason text, never cut. The head line keeps today's totals in each kind's colour, and the disclosure is drawn open. A chosen row gets an ink bar and the head shows today's own "Show all" button, drawn on the Direction sheet [conv]. (beside `the-board-proposed-board-1280`)
- The status row is the column header: it lines up with the lanes' wells, stays sticky at the top of the screen as you scroll, and carries the board-wide counts, so lane heads need no column labels. Today's header was sticky too; here the header scrolls away and this row stays. Every well in a lane fills the lane's row, so a status reads as a column from lane to lane; an empty status is the same quiet sunk well, with no dashes, since nothing on this board can be dropped. (beside `the-board-proposed-board-1280`)
- At 1240 px and up the tabs sit in the one 56 px top row (brand, sprint, 1 blocked, Board / Older Done / Sprints, then Updated, Tag, account), the current page marked by an ink bar on the header edge; between 720 and 1239 px they take a second row with the Tag select. Ink is the accent, so the status colours carry all the chroma [conv, cal-style tabs]. (beside `the-board-proposed-board-1280`)
- On a phone a bottom bar (Board, Older Done, Sprints, demo) replaces the tab row; each lane stacks its statuses; the status counts are a fixed 4 + 3 grid of equal cells; a need row keeps its reason on a third line. Between 720 and 1099 px a lane's status groups sit in a grid of 300 px columns, not one stretched list. The new word is "empty" in the folded line, for example "Backlog, In Progress, Ready for test: empty". (beside `the-board-proposed-board-390`)
- Today's strengths kept: the raised Needs you surface, collapsible lanes with their counts, fixed status order with colour and count, cards raised on sunk wells, the card read top to bottom, one header. Fixed: tracked capitals on column heads, the Blocked-by badge cut to three letters, the count that wrapped under Ready for deploy. (beside `the-board-proposed-board-1280`)
- The detail panel keeps its side-panel place and its facts, summary, questions, comments, earlier runs and history. Section heads are sentence case, the facts sit on a sunk well, and the status is a chip drawn in its colour. (beside `the-board-proposed-detail-1280`)

## Reopened rules

- Recorded (brief-board wiki/board-ui.md, 2026-11-09 and 2026-11-10): "Below 1100 px each lane scrolls sideways on its own and shows its own column names." Proposed: nothing scrolls sideways. At 1280 one status row aligns with every lane's wells, and below 1100 px each lane stacks its non-empty statuses as headings with their cards. (beside `the-board-proposed-board-1280`)

## Open questions

- At 390 the panel is a bottom sheet over a dimmed header, not today's full-width panel. Today's panel is non-modal so another card can be clicked (board-ui.md, 2026-10-23); on a phone nothing else is reachable while it is open, so the scrim is only a visual dim. Keep the sheet? It has no drag handle, since nothing here is built to drag. (beside `the-board-proposed-detail-390`)

## The Floor

- Contrast is scripted over 43 pairs, both themes: text min 4.58 light and 5.21 dark, UI and edges 3.75 and up, focus ring 12 and up, all AA. Surfaces: surface on page 1.12 / 1.29, card on well 1.25 / 1.34, every raised surface also carries a 1 px line edge; dark wells sit one step below the page (1.03) with a faint 1 px edge of their own. No sideways overflow at 1280, 1100, 1024, 768, 390, 360 or 320 in either theme, and no control spills its own box at 390 or 360. Phone targets are 48 px or more. At 1280 x 800 lanes almanac and lantern are whole (they end at y 751) and shelfmark's head sits at y 759 to 797; at 390 x 844 almanac's head sits at y 667 to 721, above the bottom bar (top at 788). Sloplint --scope app: 0 FAIL and 0 REFLEX on the three comps, 2 waivers in the stamp. The Direction sheet draws the empty, loading, no-match and API-down states of every screen; this read-only app has no input errors or toasts, so the API-down banner is its one error. (beside `the-board-direction`)

## Other notes

- Older Done keeps today's single newest-first column: raised project groups stacked at up to 880 px, each row one line (key and title left, date right). It shows no sprint name or blocked chip, as today. The detail panel's history is two moves read from the ticket's own run and test notes; the shot cuts it off.
- Round 2 changes, from the critique and the controller: tabs into the top row; one-line Needs you rows with the totals back in the head and a Show all state; lane heads 36 px, hung 4 px above their wells; wells stretch with plain sunk empties; dark without well borders (card on well 1.34); the 600 to 1099 px grid; Older Done in one column; the Sprints icon is a calendar; the sprint line keeps its dot; no clamp on Blocked-by.
- Another agent is adding tags to cards in brief-board; the tag chips here are today's. A quiet tag line would sit in the same place.

## Contrast, as measured

| Pair | Light | Dark | Needs |
|---|---|---|---|
| ink on page | 15.18 | 15.09 | 4.5 |
| ink on surface | 16.98 | 11.66 | 4.5 |
| ink on surface-sunk | 13.54 | 15.6 | 4.5 |
| ink-muted on page | 6.29 | 7.32 | 4.5 |
| ink-muted on surface | 7.04 | 5.66 | 4.5 |
| ink-muted on surface-sunk (empty line, tags, ages) | 5.61 | 7.57 | 4.5 |
| on-accent on accent (fill) | 16.98 | 15.09 | 4.5 |
| backlog text on surface | 4.68 | 6.61 | 4.5 |
| to do text on surface | 5.31 | 5.61 | 4.5 |
| in progress text on surface | 6.37 | 6.08 | 4.5 |
| blocked / danger text on surface | 6.18 | 5.21 | 4.5 |
| ready for test text on surface | 4.79 | 7.22 | 4.5 |
| ready for deploy text on surface | 6.02 | 5.7 | 4.5 |
| done text on surface | 5.5 | 6.87 | 4.5 |
| warn text on surface (stale run) | 6.47 | 6.64 | 4.5 |
| danger on danger-wash (Blocked chip, badge) | 5.28 | 5.45 | 4.5 |
| in progress on question-wash (question badge) | 5.41 | 6.07 | 4.5 |
| done on done-wash (Answered badge) | 4.7 | 6.61 | 4.5 |
| ready for test on test-wash (Test notes badge) | 4.58 | 6.63 | 4.5 |
| banner-text on banner-bg | 9.81 | 9.39 | 4.5 |
| danger text on surface-sunk | 4.93 | 6.98 | 4.5 |
| warn text on surface-sunk | 5.16 | 8.89 | 4.5 |
| on-callout on callout (board marker) | 5.28 | 8.96 | 4.5 |
| outline (Tag select edge) on surface | 4.16 | 3.75 | 3 |
| outline on page | 3.72 | 4.86 | 3 |
| focus ring on surface | 16.98 | 11.66 | 3 |
| focus ring on surface-sunk | 13.54 | 15.6 | 3 |
| focus ring on page | 15.18 | 15.09 | 3 |
| accent (current-tab bar, links) on surface | 16.98 | 11.66 | 3 |
| status cap backlog on surface | 4.68 | 6.61 | 3 |
| status cap to do on surface | 5.31 | 5.61 | 3 |
| status cap in progress on surface | 6.37 | 6.08 | 3 |
| status cap blocked on surface | 6.18 | 5.21 | 3 |
| status cap ready for test on surface | 4.79 | 7.22 | 3 |
| status cap ready for deploy on surface | 6.02 | 5.7 | 3 |
| status cap done on surface | 5.5 | 6.87 | 3 |
| SURFACE: surface on page (header, bands, panel) | 1.12 | 1.29 | 1.09 |
| SURFACE: surface-sunk on page (wells, no edge) | 1.12 | 1.03 | 1.03 |
| SURFACE: card (surface) on well (surface-sunk) | 1.25 | 1.34 | 1.25 |
| EDGE: well-edge on page (dark well edge; light = fill) | 1.12 | 1.29 | 1 |
| EDGE: line on page (every raised edge) | 1.46 | 1.8 | 1.3 |
| EDGE: line on surface-sunk (well edge in dark) | 1.3 | 1.86 | 1.3 |
| EDGE: line on surface (card edge) | 1.63 | 1.39 | 1.3 |

## The runner-up

**Runner-up: C, The ledger grid (sketch only, not built)**

Note: how this direction was picked. Three directions were sketched (A evolve today, B the queue and the lanes, C the ledger grid) and two judges compared every pair against today, in both orders, at 1280 light and 390 dark. All 24 verdicts agreed: B won 6 of 6, C 4, A 2, today 0. C lost to B on the Needs you queue (counts only) and on its hot-pink selected tab; it beat A and today on density (four lanes above the fold). Say so here if you'd rather have C's frozen grid.

## The artboards on the board

- Direction · The queue and the lanes
- Board · 1280 · light · today
- Board · 390 · light · today
- Ticket detail · 1280 · light · today
- Ticket detail · 390 · light · today
- Older Done · 1280 · light · today
- Older Done · 390 · light · today
- Board · 1280 · light · proposed
- Board · 390 · dark · proposed
- Ticket detail · 1280 · light · proposed
- Ticket detail · 390 · dark · proposed
- Older Done · 1280 · light · proposed
- Older Done · 390 · dark · proposed
- Runner-up C, The ledger grid · 1280 light (sketch)
- Runner-up C, The ledger grid · 390 dark (sketch)
