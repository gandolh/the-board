# The board tokens: board role to app token

Mechanism: the app's own, kept. `@theme static` holds each colour as `light-dark(light, dark)`, picked by `color-scheme` on `:root`; shadows use `light-dark()` too, so there is no `[data-theme="dark"]` block. `the-board.tokens.css` replaces the colour, text, font, radius and shadow groups of `web/src/styles/index.css`; the resets, `--height-top`, the z-index group, `@layer base` and the two custom variants stay. The board's palette is a violet-grey ladder with a graphite accent (today: Atlassian-style blue), so every value moves.

## Renamed or remapped (board role to app token)
- page, surface, surface-sunk, ink, ink-muted, line, danger, banner-bg, banner-text, warn: same names, new values
- accent: same name, now graphite ink (#1a1a24 light, #e9e8f0 dark) instead of blue; the base layer's `:focus-visible` outline moves to the new `focus`
- backlog, todo, in-progress, ready-for-test, ready-for-deploy, done: same roles; the app keeps the API's underscores (`in_progress`, `ready_for_test`, `ready_for_deploy`)
- elevation 1 (raised: card, band, header) -> `shadow-card`; elevation 2 (overlay: panel) -> `shadow-panel`; dark has no shadow on cards, a lighter surface and the 1 px line carry it
- fonts: Atkinson Hyperlegible Next -> `font-sans` (system-ui today); Atkinson Hyperlegible Mono -> new `font-mono`, also set as `default-mono-font-family`
- sizes, with line height and weight on each as `--text-*--line-height|font-weight`: 12/16 mono -> `text-meta` (was 12 body); 13/18 700 -> `text-small`; 14/20 -> `text-body`; 15/22 500 -> `text-heading` (card title, 16 on a phone); 18/24 700 -> `text-title`; 22/28 700 -> `text-display` (was 20). `body`'s fixed `line-height: 1.45` in `@layer base` can go, since `text-body` carries 20 px
- `font-weight-strong` 650 -> 700 (Atkinson ships 400, 500, 700)
- radii: board 6 / 8 / 12 / full are new names (below); `radius-chip` 3, `radius-box` 4 and `radius-gate` 8 stay in the file for the components that use them until the code brief collapses them
- spacing: the board's 4 8 12 16 20 24 are Tailwind's default 4 px scale; no tokens

## New tokens (component that needs them)
- `well-edge`: the 1 px edge of a sunk well (status row, copy button)
- `outline`: the tag select, fields, the copy button's rest edge
- `on-accent`: text on the primary (Copied state, the chosen need)
- `focus`: every focus ring
- `scrim`: behind the detail panel and the phone's sheet (the app sets the alpha)
- `danger-wash`, `question-wash`, `done-wash`, `test-wash`: the Needs you queue's kinds (Stale run, Question, Answered, To test) and the status chips
- `font-mono`: ticket keys (almanac-6)
- `radius-badge` 6, `radius-card` 8, `radius-band` 12, `radius-pill`: badges, cards, lane bands and the header, chips
- `shadow-sheet`: the phone's bottom sheet

## App tokens the design no longer uses (keep or drop is the code brief's call)
- `text-micro` (11 px): the board's smallest size is 12
- `radius-chip` (3), `radius-box` (4), `radius-gate` (8, now equals `radius-card`)
- `surface-hover` stays as a derived mix, now toward an ink accent, so it is a grey shift; check it still reads
- `--default-mono-font-family: monospace`: replaced by `font-mono`
- `height-top`, `z-index-*`, `--cell-cap`: unchanged and not drawn on the board

## Not mapped
- board-only `callout` and `on-callout` (#c83122 / #ff9a8c): specimen annotation colours on the direction sheet
- the Needs you kinds map to existing statuses (Question to `in_progress` blue on `question-wash`, Stale run to `warn` on `danger-wash`, To test to `ready_for_test`, To deploy to `ready_for_deploy`) by inference from the comps; the code brief should confirm each pairing
