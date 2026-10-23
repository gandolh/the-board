# Task 09: Base UI for the panel and the lanes

## Context

On 2026-10-23 the owner asked for Base UI (`@base-ui/react`) in the apps that
still hand-build their interactive widgets. Most of the owner's other apps
already use it (atrium, imbatranimOS, sports-app, trips, ro-housing,
public-resource-map, newspapper). Base UI is headless: it supplies the focus
handling, keyboard behaviour and ARIA, and the app keeps its own CSS.

The board has two hand-built widgets:

- `web/src/DetailPanel.tsx`: the ticket side panel, an `<aside role="dialog">`
  with its own Escape listener and focus-on-open. Focus does not go back to
  the card when it closes.
- `web/src/Board.tsx` `Lane`: the collapsible lane, a button with
  `aria-expanded` that toggles the lane body.

The pattern to copy is `../newspapper/ui/src/components/ui/Modal.tsx`: Base UI
`Dialog` styled by the app's own stylesheet, with the component's props left
as they were.

## Files you OWN

```
web/src/DetailPanel.tsx  web/src/Board.tsx  web/src/App.tsx
web/src/styles.css  web/package.json (dependencies only)  package-lock.json
corpus/wiki/decisions.md  corpus/wiki/status.md
```

## Files you must NOT touch

`shared/`, `server/`, `cli/`, `scripts/`.

## What to do

1. Add `"@base-ui/react": "1.9.0"` to `web/package.json` dependencies, pinned
   exactly like the rest, and run `npm install` from the root.
2. **Detail panel → `Dialog`, non-modal.** Use `Dialog.Root` with
   `modal={false}` so the board stays usable and clicking another card
   switches the ticket, as it does today. `Dialog.Popup` is the `.panel`,
   `Dialog.Title` the ticket title, `Dialog.Close` the close button. Drop the
   hand-written Escape listener and the `closeRef` focus effect, because Base
   UI handles both and returns focus to the card. Keep the copy buttons, the
   markdown and the reload-on-refresh behaviour as they are. The props
   (`ticketKey`, `refreshedAt`, `onClose`) stay the same.
3. **Lanes → `Collapsible`.** `Collapsible.Root` per lane, driven by the
   existing `expanded`/`onToggle` state (controlled `open` and
   `onOpenChange`). `Collapsible.Trigger` is `.lane-head` and
   `Collapsible.Panel` wraps `.lane-scroll`. Point the chevron's rotation at
   the trigger's `data-panel-open` attribute instead of `aria-expanded`.
4. **Styles.** In `styles.css`, move selectors that keyed off the old markup to
   the attributes Base UI sets (`data-open`, `data-panel-open`). Keep the look
   identical.
5. The tag filter stays a native `<select>`. It is already accessible, and
   swapping it would only restyle it.
6. Add a `decisions.md` entry: Base UI for interactive widgets, dated
   2026-10-23, the owner's call to match their other apps. Rejected: keeping
   the hand-built widgets, and a styled kit (shadcn) that would bring
   Tailwind. Update `status.md`.

## Acceptance

- `npm run typecheck && npm run lint && npm run test && npm run build` pass.
- In a browser against the seeded dev server (`scripts/seed-demo.ts`, dev
  database only):
  - opening a card moves focus into the panel, Escape closes it, and focus
    returns to the card;
  - with the panel open, clicking another card switches the ticket;
  - a collapsed lane expands and collapses with the mouse and with
    Enter/Space;
  - the board looks the same as before at 1440 px and 390 px. Take
    screenshots before and after.
- No hand-written Escape or focus code is left in `DetailPanel.tsx`.
- `bash corpus/lint.sh` passes.

## Outcome (2026-10-23)

Shipped in `9012a73`. The panel is a non-modal `Dialog` with
`disablePointerDismissal`, so clicking another card switches the ticket
instead of closing the panel. `App.tsx` keys `DetailPanel` by ticket, so each
ticket opens fresh: focus lands on Close (`initialFocus`), and Escape returns
it to the card that opened that ticket. The panel keeps `aria-label="Ticket
<key>"` as its name rather than `Dialog.Title`, so the name doesn't change
when the detail loads. The lanes are `Collapsible`, with the chevron on
`data-panel-open`. The web bundle grew from 122 KB to 143 KB gzipped.

Checked against a seeded demo server on port 8816 (scratch database): typecheck,
lint, 114 tests and the build pass. In the browser, mouse and Enter open a
ticket, a second card switches it, Escape and Close return focus to the card,
and lanes toggle with Enter and Space. Before/after screenshots at 1440 px and
390 px match, apart from card ages and focus rings. One difference: the Close
button now shows its focus ring when the panel opens.
