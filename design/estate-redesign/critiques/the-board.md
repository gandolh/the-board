fix

# the-board: critique of "The queue and the lanes"

Read from the renders first (board, detail, older-done at 1280, 1100, 1024, 768, 390 and 360, light and dark), then from today's shots, then the manifest's stickies. The red numbered dots on the 1280 board are canvas markers, and the bottom bar sitting mid-page in the `-full` phone shots is a capture artefact. Neither is a finding.

## Regressions against today

1. **Board, 1280: the first viewport shows one lane where today showed three.** Today at 1280×800 you see almanac, lantern and shelfmark whole, plus wicket's head. In the proposal you see almanac only, with lantern's head cut at the fold. That is the app's main job ("where every ticket stands across projects"), and the cost is all chrome:
   - the header grew from 56 to 104 px (brand row plus tab row);
   - Needs you grew from a 36 px strip to 245 px (48 px head and four 49 px rows);
   - each lane head became a 48 px card;
   - the Blocked-by box runs 4 lines (5 at 1100).

   Fixes:
   - at ≥1100, put the tabs back into the top row (brand · Sprint 3 · 1 blocked · Board / Older Done / Sprints … Updated · Tag · demo; it fits in about 1000 px), so the header is 56 px;
   - make Needs-you rows one line, 36 px tall: pill, key, title in 14/600, reason in 13 px ink-muted, truncated with an ellipsis. Cut the head to 40 px;
   - show at most 5 rows, then a "Show all N" row;
   - lane heads 40 px;
   - clamp Blocked-by to 2 lines on the card; the panel has the rest.

   Target: lanes one and two whole and the third head visible at 1280×800, with four needs open.
2. **Board, 1280: columns no longer read down the page.** Today every well in a lane row has the same height, so each status reads as a column from lane to lane. Here the wells hug their cards (`.wells{align-items:start}`) and the empty cells are 44 px dashed stubs. The result is a ragged staircase: almanac's Blocked well is 240 px tall next to a 44 px stub. The dashes also read as drop targets on a board that cannot be written to. Fix: `align-items:stretch`, so every well fills its lane row. Draw empty wells as the same sunk fill (`surface-sunk`, radius 12) with no border and no dash.
3. **Needs you: the per-kind totals are gone.** Today's strip reads in one line: 1 question · 1 stale run · 1 to test · 1 to deploy. Now every row carries a pill saying "1 …". With three questions it is unclear whether each row says "1 question" or "3 questions". Fix:
   - put the totals back in the head line: "Needs you  1 question · 1 stale run · 1 to test · 1 to deploy", in each kind's colour, 13 px;
   - make each row's pill name the kind only (Question, Stale run, To test, To deploy).
4. **Older Done, 1280: three groups side by side break "newest first".** Today it is one list you read top to bottom. With about 16 projects of uneven length, three columns become a ragged masonry, and the eye has to zigzag to compare dates. Fix: keep the raised group cards, but stack them in one column, max-width 880 px, with one-line rows as today: key · title on the left, date on the right.

Nothing else regressed. The detail panel keeps every section, its place and its non-modal behaviour.

## Priority issues (ranked by cost to the owner)

1. **First-viewport density at 1280**: regression 1. This is the one thing that decides whether the board still works at a glance.
2. **Phone, 390 and 360: Needs you fills the whole first screen.** At 360 the status chips wrap to three rows, and no lane head shows above the bottom bar. With 8 needs, the board starts two screens down. Fixes:
   - on a phone, give each need two lines (pill + key, then a 15/600 title) and hide the reason; the reason is in the panel;
   - show 3 needs, then "Show all N";
   - lay the status counts out as a fixed 4+3 grid of equal cells: two rows at any width, never three.
3. **1024 and 768: a phone list stretched to 990 px.** The cards span the full width, with the tag at the left edge and the age about 950 px away, and four lanes run 3355 px tall. Fix: between 600 and 1100 px, place a lane's status groups in a grid, `repeat(auto-fill, minmax(300px, 1fr))`, so 1024 shows 3 groups per row and 768 shows 2. Keep the age next to the tags (`gap:8px`), not pushed to the far edge.
4. **Column continuity and the dashed empties**: regression 2.
5. **Dark: double outlines on the board.** Each well has a 1 px `line` border (`.well{border-color:var(--color-line)}`) and each card inside it has its own. So every cell is a box in a box, and the board reads as wireframe rather than depth. Light doesn't have this. Fix: in dark, drop the well border and let the fill carry it. Darken `surface-sunk` slightly so card-on-well reaches about 1.35 (now 1.25).
6. **Needs-you counts**: regression 3. Also show which row is narrowing the board. Today's strip is a radio group, so a chosen row needs a 2 px ink left bar and a "Clear" button at the right of the head.
7. **Small inconsistencies:**
   - the detail facts' "web" tag loses its chip, because the chip fill equals the well fill, and it sits 8 px right of the other values. Give it `surface` fill plus a 1 px line, aligned to the value column;
   - the Sprints icon in the phone bar is a two-arrow loop, which reads as Refresh beside an "Updated" clock. Use a calendar or flag glyph;
   - at 1100 the tags stack ("web" above "design") and the age floats beside them. Let the tags wrap in their own row, with the age at the row's end.

## The manifest's open questions

- **No sideways scroll:** accept. Today's 390 board scrolls each lane sideways and cuts cards mid-word ("A redesign with", "Lookup order kee"). Stacking is plainly better. Do it with the 600–1100 grid from issue 3, so the change isn't a stretched phone.
- **The word "empty":** keep it. "Backlog, In Progress, Ready for test: empty" is plain and saves the dead stubs.
- **The phone bottom sheet:** keep it. Drop the drag handle unless drag-to-dismiss is actually built; a handle that does nothing is an invented gesture.
- "ran ≥ <1m" on wicket-15 comes from today's `shared/src/duration.ts`, not from the comp. It reads garbled, but fixing it belongs to the app, not the redesign.

## Strengths to keep

- **Needs you as a queue.** Key, title and the API's own reason text in one row tell the owner what is being asked without opening a ticket. That is the biggest gain over today. Make it denser, but don't strip it back to bare counts.
- **The phone board is a real phone design:** one column, each lane stacked by status with named groups, a 56 px bottom bar, 48 px targets. Today's phone was a squeezed desktop.
- **The islands kept and sharpened:** a raised Needs-you card, raised lane heads, sunk wells holding raised cards. The sticky status row lines up with the wells and carries board-wide counts.
- **Fixes to today's flaws:** the Blocked-by reason readable instead of "Blocked by: Wai…", sentence-case status names, and chroma spent only on statuses, with the accent ink.

## Heuristic scores (0–4)

1. Visibility of system status: 3. Updated clock, sticky counts and stale runs are visible; the needs filter state is not.
2. Match with the real world: 3. The owner's own words; "1 question" on every row reads as a total.
3. User control and freedom: 3. Lanes and Needs you fold and the panel closes; there is no visible way to clear a needs filter.
4. Consistency and standards: 2. The tag chip changes in the facts well, dashed empties suggest drop zones, the Sprints glyph reads as Refresh.
5. Error prevention: 3. Read-only, with little to get wrong; a needs row looks like "open ticket" but narrows the board.
6. Recognition over recall: 3. The sticky status row means no column memorising; phone groups are named.
7. Flexibility and efficiency: 2. Nothing surfaces the radio group's arrow keys, and there is no jump to a lane.
8. Aesthetic and minimalist design: 3. Calm and structured, but Needs you and the header are oversized for a glance tool.
9. Error recovery: 3. The API-down banner is designed in both themes.
10. Help and documentation: 2. "Stale run" and "heard" are unexplained; a title tooltip would do.

Total 27/40. Cognitive load is low (1 checklist failure: single focus, because at 1280 the queue crowds out the board).

**Detector** (`detect.mjs --json` with parser modules resolved, not degraded):
- board and detail, both themes: 8 `cramped-padding`, all dismissed. They flag `.bb` (the page wrapper), `.r2` (the tab row), `.needs`, `.nlist` and `.lhead`, whose children carry their own padding; the renders show proper insets.
- detail and older-done: 1 `flat-type-hierarchy` (12–22 px, 1.8:1). Dismissed: a dense tool, and the hierarchy holds through weight and surfaces.
- direction sheet: 6 `border-accent-on-rounded` (a 3 px top cap on a radius-8 chip). The comps' status row draws the same cap. Accepted as continuity, since today's column heads have it too. If it stays, give the cap the chip's top radius so it doesn't thin at the corners.
- direction sheet: 6 `cramped-padding` on specimens, dismissed.
- direction sheet: 2 `gpt-thin-border-wide-shadow` on the overlay elevation level, dismissed because a sheet needs that shadow.
- direction sheet: 1 `aphoristic-cadence` on two plain empty-state sentences, dismissed.

Do not dilute the Needs-you queue's reason text or the raised-cards-on-sunk-wells structure while buying back the density.
