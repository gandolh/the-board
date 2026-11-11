# Task 17: Base UI by the conventions

**Depends on:**

- In brief-board: brief 16, for the gate, the formatter and `.claude/rules/web.md`.
- In the owner's skills library:
  - brief 02, *A base-ui skill, styled with Tailwind*: rules 1-13, the references and `check-base-ui.mjs`;
  - brief 15, *Enforce the base-ui and code-structure skills in every repo*: the checker runs `--warn-only` until brief 18 here is done.
- The owner's grilling of 2026-11-10: Q15 (Base UI only under `ui/`), Q16 (where native controls stay), Q19 (parity), Q41 and Q57 (the strip), Q58 and Q40 (dialogs), Q60 and Q62 (tests).

**Runs before:** 18. This brief changes structure and markup. Brief 18 then changes only the styling, so its before and after screenshots compare like with like.

**Before you start:** run `brief-board guide` ([corpus/CLAUDE.md](../../CLAUDE.md)).

## Context

The owner's call of 2026-11-09 is Base UI everywhere at 1.9.0, with the base-ui skill's conventions enforced in each repo. brief-board put its detail panel and lanes on Base UI on 2026-10-23 ([wiki/decisions.md](../../wiki/decisions.md), "Base UI for the UI's widgets, styled by our own CSS"). It uses two components: a `Dialog` and a `Collapsible`. This brief closes the gaps the audit below found. It does not move styling to Tailwind; that is brief 18.

### The pin (verified 2026-11-10)

- `web/package.json:13` pins `"@base-ui/react": "1.9.0"` exactly. It is the only manifest that names it.
- `package-lock.json` resolves `node_modules/@base-ui/react` at 1.9.0, with `@base-ui/utils` 0.5.0.
- No code uses the two names 1.9.0 renamed: `grep -rn "OTPFieldPreview\|otp-field\|sanitizeValue"` over the repo (minus `node_modules` and the lockfile) finds nothing.

**No bump brief is needed.**

### The audit against rules 1-13 (2026-11-10)

All of Base UI's use is in two files: `web/src/Board.tsx` (`Collapsible`, lines 84-114) and `web/src/DetailPanel.tsx` (`Dialog`, lines 50-222). `grep -rn "@base-ui" web/src cli server shared` finds exactly those two imports.

| Rule | Violations | Where |
|---|---|---|
| 1. Exact pin | 0 | |
| 2. Subpath imports, no root barrel | 0 | `web/src/Board.tsx:1` (`/collapsible`), `web/src/DetailPanel.tsx:1` (`/dialog`). |
| 3. Base UI only under a `ui/` folder | **2** | `web/src/Board.tsx:1` and `web/src/DetailPanel.tsx:1`. There is no `ui/` folder: `web/src` is flat, 25 files. |
| 4. Tailwind on the parts, no class selector aimed at a part | all the Base UI styling | `.panel` (the `Dialog.Popup`, `DetailPanel.tsx:59`), `.icon-button` (`Dialog.Close`, line 64), `.lane-head` (`Collapsible.Trigger`, `Board.tsx:89`), `.lane-scroll` (`Collapsible.Panel`, line 99), and `.lane-head[data-panel-open] .chevron` (`web/src/styles.css:296`). **Brief 18's work.** |
| 5-7. One stylesheet, semantic tokens, motion | all of them | **Brief 18's work.** No inline `style` prop exists (`grep -rn "style={" web/src` finds none). One literal colour sits outside the tokens (`styles.css:443`, the panel's `box-shadow`). There are no `@keyframes`, one `transition` (`styles.css:293`, the chevron) and its reduced-motion override (line 769). |
| 8. Floating parts portalled, z from tokens | 0 | The panel goes through `Dialog.Portal` (`DetailPanel.tsx:58`). The four z-indexes are literals (`styles.css:90, 242, 437, 651`), which brief 18 turns into tokens. |
| 9. A trigger around a component uses `render` | 0 | The two `render` props pass native elements: `<aside />` (`DetailPanel.tsx:59`) and `<section … />` (`Board.tsx:87`). `Dialog.Close` wraps an `<svg>`, not a component. A checker that flags any capitalised child will not hit these. |
| 10. `Select.Root` with `items` | 0 | No Base UI `Select`. The one `<select>` is native by decision: `web/src/TopBar.tsx:41`. |
| 11. No `window.confirm`, `alert` or `prompt` | 0 | `grep -rnE "confirm\(\|alert\(\|prompt\(" web/src` finds none. |
| 12. Dialogs | **1** | The one dialog (`DetailPanel.tsx:50-222`) is a non-modal panel, controlled (`open`, `onOpenChange` calling `onClose`), with `disablePointerDismissal` (line 53) and `initialFocus={closeRef}` (line 59), so focus lands on the close button and returns to the card. The icon-only close button has an `aria-label` (line 64). **It has no `Dialog.Title`:** the popup is named by `aria-label={`Ticket ${ticketKey}`}` (line 59), and the ticket's title is a plain `<h2 className="panel-title">` (line 75). No text field lives in it, so the Escape guard has nothing to guard. |
| 13. Base UI over hand-built widgets | **1** | See below. |

**Rule 13's one**, with what the decisions keep native left out:

1. **The needs strip**, `web/src/NeedsStrip.tsx:23-47`: a `<nav>` of buttons with `aria-pressed` (line 35), where pressing the pressed one clears the choice (line 36) and a "Show all" button clears it too (line 43). It is a filter: a single-choice group that switches what the board shows. By the owner's picker rule it becomes a `RadioGroup` (decision 3), which gives one Tab stop and arrow keys where today each count is its own Tab stop.

**Considered and left:**

- **Kept native by [wiki/decisions.md](../../wiki/decisions.md) (Q16):** the tag filter's `<select>` (`TopBar.tsx:41`), "native controls that are already accessible"; and the login form's two text inputs (`LoginPage.tsx:66, 85`).
- **Not a widget:**
  - `Card` and the Older Done rows are `<button>`s that open the panel (`Card.tsx:23`, `DonePage.tsx:81`);
  - `PageLink` (`TopBar.tsx:54`) is navigation;
  - `CopyButton` (`DetailPanel.tsx:226`) is a button with a timed label;
  - the API banner (`TopBar.tsx:23`) is a `role="status"` line, and Base UI has nothing for it.
- **Optional, decision 4:** the native `title` tooltips: `Card.tsx:35, 47, 57`, `DonePage.tsx:84`, `DetailPanel.tsx:239`. One of them (`Card.tsx:47`) repeats the visible text exactly.

**A styling class used as a behaviour hook:** none. `grep -rn "querySelector\|classList" web/src` finds nothing, so brief 18 can rename every class without touching behaviour. The tests do read classes (brief 18's list).

## Owner decisions

1. **Base UI only under `ui/`** (Q15, decided 2026-11-10, technical call). The two uses move behind two wrappers in `web/src/components/ui/`, and the needs strip gets a third.
2. **Does the flat `web/src` get feature folders?** Default, not asked: no. 25 files, none over 244 lines, and the checker doesn't enforce rule 10; this brief adds only `web/src/components/ui/`.
3. **The needs strip is a `RadioGroup`** (Q41 and Q57, decided 2026-11-10, technical call). A filter that switches what a list shows uses `RadioGroup`: arrow keys may choose. The strip becomes a `RadioGroup` with a `Radio` per count and "Show all" kept as a separate button that clears the choice. Two behaviours change, both accepted: one Tab stop and arrow keys instead of a stop per count, and pressing the chosen count no longer clears it (a radio can't be unchecked; "Show all" clears). The state is `role="radio"` with `aria-checked`, not `aria-pressed`. Nothing is chosen when the filter is off, so the group has no checked radio; step 4 checks that Base UI's `RadioGroup` allows it.
4. **The optional two** (Base UI `Button`, `Tooltip`s). Default: neither in this brief. A tooltip is a visual change, and touch screens have no hover.
5. **How Base UI behaviour is tested** (Q60, decided 2026-11-10, technical call). jsdom tests only for wrappers that hold logic, and the three wrappers here pass props through, so no DOM environment is added. The repo's web tests render to static markup (`renderToStaticMarkup`) and assert roles, `aria-*` and text (Q62: by role). Flows (focus on open, Escape, focus on close, the strip's arrow keys) are checked in a real browser with a Playwright script kept out of the repo, and the outcome note records each result.
6. **Native controls** (Q16, decided 2026-11-10, technical call). As [wiki/decisions.md](../../wiki/decisions.md) has them, so the list above stays native.
7. **A `Title` on the panel** (default). The ticket's `<h2 className="panel-title">` becomes the `Dialog.Title`, and the `aria-label` stays for the moment before the ticket loads, when there is no heading yet. The visible text and the heading level don't change.
8. **Dialogs and the phone** (Q58 and Q40, decided 2026-11-10). The panel is a non-modal side panel with no form, already on `disablePointerDismissal`; a future dialog holding a form sets it too. It is not a navigation menu, so the owner's `Drawer` call for phone menus doesn't apply: the panel stays a `Dialog`.
9. **Visual parity** (Q19, decided 2026-11-10, owner). Close enough: no visible change to layout or colour at 1280 and 390 px, in light and dark. A few pixels of drift needn't be fixed or listed.
10. **The theme switch** is not here. Light / Dark / System (Q18) is brief 18's, where the tokens move.

## The wrapper set: `web/src/components/ui/`

The props are the ones the call sites pass today; a test fixes them.

| File | What it is | From |
|---|---|---|
| `Dialog.tsx` | Base UI `Dialog` as the board's non-modal side panel: `open`, `onClose`, `label`, `initialFocus`, `children`; `modal={false}`, `disablePointerDismissal`, the `Portal`, the `Title`, and a `Close` | `web/src/DetailPanel.tsx:50-69`, moved out |
| `Collapsible.tsx` | Base UI `Collapsible`: `open`, `onOpenChange`, `label`, the trigger's content, `children`; the root renders as the lane's `<section>` through `render` | `web/src/Board.tsx:84-114`, moved out |
| `RadioGroup.tsx` | Base UI `RadioGroup` + `Radio.Root`, single choice; "Show all" stays a button beside it | `web/src/NeedsStrip.tsx:31-41`, moved out |

`web/src/DetailPanel.tsx` keeps what is ticket-specific: the fetch, the facts, the comments, the history, `CopyButton`. `web/src/Board.tsx` keeps the lanes and cells.

## Files you OWN

- `web/src/components/ui/**` (new), and the imports in `web/src/Board.tsx`, `web/src/DetailPanel.tsx` and `web/src/NeedsStrip.tsx`.
- The existing CSS rules for markup this brief changes. Rename or move a class rule to the new part; don't restyle. Brief 18 turns them into utilities.
- The tests for the above: `web/src/NeedsStrip.test.tsx` (its two class assertions, lines 33 and 46, follow the new markup) and new tests beside the wrappers.
- `scripts/conventions.json`, only if an exception is needed.
- Corpus:
  - [wiki/board-ui.md](../../wiki/board-ui.md): the panel and lanes now sit behind `web/src/components/ui/`;
  - [wiki/decisions.md](../../wiki/decisions.md): the Base UI entry gains the 2026-11-09 conventions line;
  - [wiki/status.md](../../wiki/status.md);
  - [log.md](../../log.md).

## Files you must NOT touch

- `server/`, `shared/`, `cli/`, and `web/package.json`. Every part needed ships in `@base-ui/react` 1.9.0 (`radio-group` and `radio` are in the package: `ls node_modules/@base-ui/react`), so no new dependency.
- Styling beyond renaming a rule's selector. No Tailwind here.
- What the panel does: the ticket reload on every poll, the key-per-ticket remount in `App.tsx` that opens each ticket fresh, and focus returning to the card on close.
- The native controls, and `web/vendor/`.

## What to do

One commit per numbered step. After each, `npm run check` passes, with `check-base-ui` `--warn-only`.

1. **Before.** Run `check-base-ui` strict and record the counts by rule. Expect rule 3 at 2, and rules 4-6 at whatever the checker counts for the CSS. Bring the board up on a scratch database the way [docs/images/shots.md](../../../docs/images/shots.md) does, with several projects and tickets in every status, including a lane with more than five Done tickets, a blocked brief and a ticket with open questions. Take Playwright screenshots, at 1280 and 390 px, light and dark (`colorScheme`), of: the board; a collapsed lane; the needs strip with a kind chosen; the detail panel open on a ticket with comments, questions and runs. Write down, as the baseline for step 5, how the panel behaves from the keyboard: where focus lands on open, what Escape does, where focus goes on close, what a click on another card does.
2. **`Dialog.tsx`.** Move the panel's Base UI parts out of `DetailPanel.tsx`. Make the heading the `Dialog.Title` (decision 7), keeping `aria-label` and `initialFocus` on the close button. Rule 3 drops to 1, rule 12 to 0.
3. **`Collapsible.tsx`.** Move the lane's parts out of `Board.tsx`. Rule 3 reaches 0. `web/src/Board.test.tsx` renders `Board` to static markup, so its assertions are the proof the lanes still render: they pass unchanged.
4. **`RadioGroup.tsx`**, and the needs strip on it (decision 3). Keep:
   - "Show all" clearing the choice (a click on the chosen count no longer does);
   - the counts' order and text (`needCountText`);
   - the strip's `aria-label` "Needs you", and nothing at all when nothing waits.

   Update `NeedsStrip.test.tsx` lines 33 and 46 to roles and `aria-checked`, not class names.
5. **After.** Take the screenshots again from the same data and compare them (decision 9: no visible change to layout or colour; a few pixels of drift needn't be fixed or listed). Repeat the keyboard walk from step 1 and list any change: on the panel there should be none, and on the strip the Tab, arrow-key and click-to-clear changes are the ones decision 3 accepted.
6. **Corpus.** Update [wiki/board-ui.md](../../wiki/board-ui.md), [wiki/decisions.md](../../wiki/decisions.md), [wiki/status.md](../../wiki/status.md) and [log.md](../../log.md). Add the Base UI lines to `.claude/rules/web.md`: the wrappers in `web/src/components/ui/` are the only importers.

## Acceptance

- [ ] `grep -rn "@base-ui/react" web/src --include=*.tsx --include=*.ts | grep -v "components/ui/"` prints nothing.
- [ ] `check-base-ui` strict reports 0 for rules 1, 2, 3, 9, 10, 11 and 12. Rules 4-7 are left for brief 18, and their counts are in the outcome note.
- [ ] The panel has a `Dialog.Title`, still an `aria-label` while it loads, and its close button still has `aria-label="Close"`. A static-markup test shows the wrapper's markup; the Playwright keyboard walk (decision 5) shows Escape closing it, focus landing on the close button, and focus returning to the clicked card.
- [ ] The needs strip: a test shows `role="radio"` with `aria-checked` on the chosen count only (and none checked when the filter is off), and the walk shows one Tab stop, the arrow keys moving between counts, and "Show all" clearing the choice.
- [ ] The before and after screenshots at 1280 and 390 px, light and dark, show no visible change to layout or colour.
- [ ] `npm run check` passes, and `bash corpus/lint.sh` ends clean.

## Interplay

- Brief 18 styles `web/src/components/ui/` with Tailwind on the parts, and removes the CSS rules this brief renamed. It also builds the theme switch.
- The skills library's `check-base-ui` heuristic for rule 9 may flag `Dialog.Close` around an icon. That is a false positive, to report to the skill rather than to except here.

## Outcome (2026-11-11)

Built in three code commits (`1967b32`, `6baba96`, `2447802`), not deployed.

- **Wrappers** in `web/src/components/ui/`: `Dialog.tsx` (`Panel`, `PanelTitle`), `Collapsible.tsx` (the lane and the sprint) and `RadioGroup.tsx` (the needs strip). The panel's heading is the `Dialog.Title`; `aria-label="Ticket <key>"` names the panel until it loads; Close keeps `aria-label="Close"`.
- **Not in the audit:** `SprintsPage.tsx` is a third Base UI importer (a `Collapsible`, with its trigger inside an `h3`). It moved behind the same wrapper, which takes `heading="h3"`. `Panel` owns its close-button ref, so `initialFocus` is not a prop.
- **Needs strip:** `<div class="needs">` holding a `role=radiogroup` named "Needs you" and the "Show all" button. The old `<nav>` landmark is gone, since the strip is a filter. The group is `display: contents` (`.needs-group`), because a flex group of its own re-wrapped the strip at 390 px. `.needs-kind[aria-pressed]` became `[data-checked]`.
- **check-base-ui strict:** rules 1, 2, 3, 9, 10, 11, 12 at 0. Rule 5 reports 1 (`web/src/styles.css`, not `styles/index.css`), left for brief 18, so the checker stays `--warn-only`. Rules 4, 6 and 7 print no findings in this checker version.
- **Checks:** `npm run check` exit 0 (319 tests, 19 files); `bash corpus/lint.sh` clean.
- **Screenshots** (made-up board, scratch database, 1280 and 390 px, light and dark; board, collapsed lane, strip with a kind chosen, panel): the only pixels that differ from before are the header clock and the cards' "running 3m" text. The board had no lane with more than five Done tickets: Done tickets in the sprint before the active one don't show on the board.
- **Keyboard walk** (Playwright against Vite): the panel is unchanged (focus on Close on open, Escape closes and returns focus to the card, a click on another card switches the ticket, Close returns focus to the card). The strip: one Tab stop (was one per count), ArrowRight and ArrowDown move and choose, a chosen count stays chosen on a click and "Show all" clears it, nothing is checked when the filter is off.
- **For the skill:** the `Dialog` reference's wrapper is modal with a footer; the board's panel is non-modal with no form, so it got its own small wrapper. `RadioGroup` with nothing chosen needs `value=""` to stay controlled. A strip whose radios sit in a row with a label and separators wants `prefix` and `separator` props.
