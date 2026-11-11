---
paths:
  - "web/src/**"
---

# The board (`web/src`)

- Read the `base-ui` skill before you add or change a component, and
  [corpus/wiki/board-ui.md](../../corpus/wiki/board-ui.md) for UI work.
- The board is read-only ([corpus/wiki/decisions.md](../../corpus/wiki/decisions.md),
  "The UI is read-only"): no control that writes to the API.
- Base UI stays in the files that use it today (`Board.tsx`, `DetailPanel.tsx`,
  `SprintsPage.tsx`) until it moves behind `web/src/components/ui/` wrappers. A
  trigger around one of our components uses `render`, never a wrapping `span` or
  `div`.
- Native controls that are already accessible, such as the tag filter's
  `<select>`, stay native
  ([corpus/wiki/decisions-engineering.md](../../corpus/wiki/decisions-engineering.md),
  "Base UI for the UI's widgets, styled by our own CSS").
- Light / Dark / System, light on a first visit, is planned with the Tailwind
  migration. Until then dark follows the system, and colours come from the
  custom properties in `web/src/styles.css`, never a hex or `rgb()` in a
  component.
- Words in the UI follow [corpus/wiki/glossary.md](../../corpus/wiki/glossary.md):
  "ticket" in copy, "card" only for its drawing, "lane".
- Components use named exports. Default exports are for config files only.
- Tests render to static markup (`renderToStaticMarkup`), so assert on roles and
  text, never on class names.
- `web/vendor/` is Ward's generated client. Never edit it.
- `npm run check:conventions` runs `check-base-ui` over this folder,
  `--warn-only` until the Base UI and Tailwind migration lands.
