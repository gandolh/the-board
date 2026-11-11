# Task 20: A redesign with Hallmark, on the estate board

**Depends on:**

- In brief-board: [brief 18](18-the-web-app-to-tailwind.md), which puts the web app on Tailwind tokens in one `@theme`, with a named type scale and the Light / Dark / System switch. A redesign is then mostly a new token set and layout. [Brief 17](../done/17-base-ui-by-the-conventions.md) fixes the Base UI wrappers it restyles.
- In the owner's skills library:
  - brief 24, which vendors Hallmark as the design skill and adopts taste-skill 2.5's ideas (palettes and type dealt by trade, its copy layer);
  - the estate redesign board: one artifact with a page per app, owned by the skills library.
- The owner's answer of 2026-11-10 (Q39): no bake-off; Hallmark redesigns every web UI, keeping what is useful from taste-skill 2.5, and the owner approves each app on the board before any code changes.

**Runs before:** nothing. **Runs after:** 16 to 19, the redesign last. Brief 19 is server-only and does not block it.

**Before you start:** run `brief-board guide` ([corpus/CLAUDE.md](../../CLAUDE.md)).

## Context

brief-board is the read-only board of the owner's briefs: lanes by status, a strip of what needs the owner, a detail panel per ticket, an Older Done page and a sign-in. It is a small tool, and its token names are shared with the rest of the small-tools family.

### The screens (read 2026-11-10, `web/src/route.ts`)

| Screen | Route | File |
|---|---|---|
| Board: lanes, cells, cards, the needs strip, the tag filter, the API banner | `/` | `web/src/App.tsx`, `Board.tsx`, `Card.tsx`, `NeedsStrip.tsx`, `TopBar.tsx` |
| Detail panel: facts, comments by role, questions, runs, history | an overlay on the board | `web/src/DetailPanel.tsx` |
| Older Done | `/done` | `web/src/DonePage.tsx` |
| Sign-in, the gate's loading and unreachable states | `/login`, and the gate before any page | `web/src/LoginPage.tsx`, `web/src/AuthGate.tsx` |
| Account: who is signed in, Link Ward, sign out | `/account` | `web/src/AccountPage.tsx` |

### What the design docs fix today

- [wiki/board-ui.md](../../wiki/board-ui.md) records how the board is built: the four GETs, polling every 10 s, the tag filter, lanes that scroll sideways below 1100 px, the long cell cap at 600 px, Older Done, and the panel's behaviour.
- [wiki/decisions.md](../../wiki/decisions.md): "The UI is read-only" (no control that writes to the API; the theme switch writes only to the device), and "Base UI for the UI's widgets", as brief 18 revisits it.
- [wiki/glossary.md](../../wiki/glossary.md): "ticket" in copy, "card" only for its drawing, "lane".
- The seven status colours are API values with meaning; the blocked and danger colour is one token (brief 18).
- The theme switch is the owner's call of 2026-11-10 (Q18), built in brief 18.

The redesign stays inside these decisions unless the owner reopens one on the board.

## Owner decisions

Answered 2026-11-10: Q39 (Hallmark, with taste-skill 2.5's useful parts; approval on the board first). Default: the proposal keeps the lanes-and-cards board, the read-only rule and the glossary words. Anything that moves one of those is flagged on the board as a reopened decision. Token names stay in the family's set (`surface`, `ink`, `accent`, `line`, `danger`); the redesign changes values, not names.

## Files you OWN

- `web/src/styles/index.css` (the tokens and the type scale) and the screens listed above, one commit each.
- A `DESIGN.md` in `web/`, recorded from the shipped result.
- Corpus: [wiki/board-ui.md](../../wiki/board-ui.md), [wiki/status.md](../../wiki/status.md), [log.md](../../log.md).

## Files you must NOT touch

- `server/`, `shared/` and `cli/`.
- The vendored Ward library in `web/vendor/`.
- The copy's meaning: wording stays unless the board approves a change. No invented tickets, projects or figures in screenshots beyond a made-up scratch board's.
- Behaviour: polling, the tag filter, the panel's focus handling, routes.

## What to do

1. **Today.** Take Playwright screenshots of every screen above at 1280 and 390 px, in light and dark, kept out of git. Use the scratch board and frozen clock from brief 18's method, with every column filled. Include a lane with a long cell, the panel open on a ticket with questions and runs, and the banner.
2. **Propose.** With Hallmark (and taste-skill 2.5's trade palettes and copy layer where they help), make a proposal per screen, inside the recorded decisions. Check each against the Floor: contrast, a visible focus ring, a reduced-motion path, no invented facts, no broken phone layout.
3. **Board.** Put the proposals on this app's page of the estate board, beside today's screenshots at both widths.
4. **Approval.** The owner approves on the board. Nothing below starts before that, and the approval is recorded in `log.md` with its date.
5. **Build.** First as a token change in `index.css` (colours, radii, type scale, spacing, both themes), then one screen per commit. Keep the wrappers and the theme switch working.

## Acceptance

- [ ] The owner's approval is on the board and recorded in `log.md` with the date.
- [ ] Contrast: every text and icon pair in both themes clears 4.5:1 (3:1 for large text and UI parts), measured with a script over the built tokens and listed in the outcome note, including each status colour against its badge text.
- [ ] A Playwright test tabs through each screen and asserts a visible focus ring on every stop.
- [ ] A Playwright test with `reducedMotion: "reduce"` asserts no running animation or transition on each screen.
- [ ] A Playwright test at 390 px asserts `document.documentElement.scrollWidth <= window.innerWidth` on each screen, except where a lane scrolls sideways on purpose inside its own container.
- [ ] Every ticket, project and figure shown comes from the data or the copy; the outcome note lists none invented.
- [ ] The Light / Dark / System switch still works, with light on a first visit, and the Playwright suite passes in light, dark and system.
- [ ] `npm run check` passes, and `bash corpus/lint.sh` ends clean.

## Interplay

- Brief 18 owns the tokens, the type scale, the two breakpoints (`narrow`, `phone`) and the theme switch; this brief changes their values and the layout on top.
- Brief 17's wrappers (`Dialog`, `Collapsible`, `RadioGroup`) are restyled, not replaced.
- Brief 16's formatter and lint run on every redesign commit.
