# brief-board: design

Recorded on 2026-11-13 from what shipped in brief 20. The direction is "The queue and the lanes", approved on the estate
redesign board. The tokens are in `src/styles/index.css`; the board's behaviour is in
[corpus/wiki/board-ui.md](../corpus/wiki/board-ui.md).

## The idea

A read-only board for one owner. Ink is the accent, so only the statuses carry colour: a status colour always means a
status. What needs the owner is a queue of rows that say what is asked, in the API's own words, and the board's
columns are one status row that is the column header for every lane.

## Tokens

- **Colour.** A cool violet-grey ladder. Page `#f0f0f4` / `#141419`; surface (cards, bands, header, panel) `#fdfdff` /
  `#2a2a35`, lighter than the page in dark; surface-sunk (wells, fields, the facts well) `#e4e3eb` / `#101015`; ink
  `#1a1a24` / `#e9e8f0`; ink-muted `#575668` / `#a3a2b3`; line `#c9c8d4` / `#40404c`; outline (edges that must be seen:
  the tag select, fields, the copy button) `#7a7990` / `#82819a`; accent = focus = ink. Each is a `light-dark()` pair.
- **Statuses.** The API's names (`in_progress`, `ready_for_test`...), each a colour for text on the surface and an edge.
  Washes sit behind badges: `danger-wash`, `question-wash`, `done-wash`, `test-wash`. A need's kind pairs as: Question
  `in_progress`, Stale run `warn`, To test `ready_for_test`, To deploy `ready_for_deploy`, Blocked `danger`.
- **Type.** Atkinson Hyperlegible Next (400, 500, 700) and Atkinson Hyperlegible Mono (400, ticket keys), self-hosted from
  `@fontsource` at 5.3.0. Scale: `meta` 12/16, `small` 13/18 bold, `body` 14/20, `heading` 15/22 500 (16 on a phone for a
  card title), `title` 18/24, `display` 22/28.
- **Shape.** `radius-badge` 6, `radius-card` 8, `radius-band` 12, `radius-pill`. Elevation 1 (`shadow-card`) is raised: a
  card, a band, the header; elevation 2 is an overlay: `shadow-panel`, `shadow-sheet`. In dark there is no card shadow: a
  lighter surface and a 1 px line carry it.
- **Focus.** A 2 px ring in `focus`, 2 px off the element, with a 4 px surface halo.

## Layout

- **Widths.** Content is 1440 px at most, 24 px at the sides (16 on a phone). `mid:` is under 1240 px, `narrow:` under
  1100 px, `phone:` under 720 px.
- **Header.** One 56 px row from 1240 px: name, sprint ("Sprint 3 · since 2026-11-02"), blocked pill, the tabs, the clock,
  the tag select, the account. From 720 px the tabs take a second 48 px row with the tag select. The current tab has a 3 px
  ink bar on the header's edge. Under 720 px a bottom bar replaces the tabs and the account link; the current item has an
  ink bar at the top.
- **Needs you.** A raised 12 px band. The head line is a chevron (drawn open), the name, and one total per kind in the
  kind's colour (the radios). A row is 36 px: a kind pill (104 px), the key (mono), the title (700), the reason; long
  reasons wrap. The chosen kind's rows take a 4 px ink left edge on `surface-sunk`. On a phone a row is two lines and a
  third for the reason, and the queue shows four rows, then `Show all N`.
- **Status row.** Seven raised chips, each with a 3 px status-coloured cap, the name in the status colour and the count in
  title size (a zero is muted). From 1100 px it is a grid aligned with the wells, sticky at the top of the screen. Below it,
  a wrapping row of chips; on a phone a 4 + 3 grid with the count above the name.
- **Lanes.** A band 38 px high with a chevron, the project name and "3 open · 1 done"; wells hang 4 px below it. From
  1100 px a well is a sunk panel, 8 px apart; an empty one is a quiet sunk well with nothing in it. A well past five cards
  stops at 600 px and scrolls inside. Below 1100 px the wells are one sunk panel in a grid of 300 px columns; each non-empty
  status is a heading (a 4 px status bar, the name, the count) with its cards, and the empty ones are one line, "Backlog,
  Blocked: empty".
- **Cards.** A raised 8 px card: the key (mono), the title (14/20, 500), the run line, the badges (blocked-by in full in
  `danger` on its wash, the question count), then the tags wrapping and the age at the end. The pointer shifts the border
  to `outline` and the fill 8% toward ink.
- **Detail panel.** A non-modal side panel, 480 px, over the board; under 720 px a bottom sheet with 16 px top corners,
  below a dimmed strip of the screen (no drag handle). The head has the key, a Copy button and Close. The title is
  `display`. The facts sit on a sunk well; the status is a pill in its colour. Sections (Summary, Questions, Comments,
  Earlier runs, History) are separated by a rule, with sentence-case 15/700 headings and a count where there is one.
  A comment's role is a badge in the colour of its status, on a wash where one exists.
- **Older Done.** One column, 880 px at most, of raised project groups: a head (name and count) and one-line rows, the key and
  title on the left, the date on the right. On a phone the date moves to the top right.
- **Sprints.** Older Done's patterns: a lane-style band per sprint (a `Collapsible` heading) over its raised groups.
- **Sign-in, account and the gate.** A raised card on the page, fields 36 px high (44 on a phone) with an `outline` edge, ink
  buttons; the account page's facts sit on a sunk well and the theme is a radio group of three buttons.

## Rules this design keeps

- The board only reads. Nothing is a control that writes; the theme switch writes to the device only.
- Nothing ends in an ellipsis or a clamp, and nothing scrolls sideways.
- Status colour is for a status, never decoration. Ink is the primary.
- Under reduced motion nothing runs: the only transition is the lane chevron's turn, and it is off.

## What was not drawn

The board never drew Sprints, sign-in, the account page, the gate's loading and unreachable states, or the tag chips'
extra places (the Tags row of the panel). They take the tokens and the patterns above; no new layout.
