# Task 18: The web app to Tailwind

**Depends on:**

- In brief-board:
  - brief 16, for the gate, the formatter and the `.claude/rules/web.md` this brief extends;
  - brief 17, which puts the Base UI wrappers in `web/src/components/ui/` and settles their markup, so this brief styles each part once, in its final place.
- In the owner's skills library:
  - brief 02, *A base-ui skill, styled with Tailwind*: rules 4-8, the `tailwind.md` reference and the method in `migrating-from-plain-css.md`;
  - brief 27, *A house style, and a quality harness that enforces it*: the `better-tailwindcss` lint;
  - brief 11, *wicket's web app to Tailwind*: it goes first and writes down the small-tools family's `@theme` token names, which this brief reuses;
  - brief 12, *the-board's web app to Tailwind*, the estate draft this brief replaces.
- The owner's grilling of 2026-11-10:
  - Q17 and Q61 (token names: the family converges on `surface`, `ink`, `accent`, `line`, `danger`), Q18 (dark mode), Q19 (visual parity), Q20 (the order of the migrations);
  - Q44 (the root font size), Q60 and Q62 (tests, the type scale).

**Before you start:** run `brief-board guide` ([corpus/CLAUDE.md](../../CLAUDE.md)).

## Context

The owner's call of 2026-11-09: Base UI is styled with Tailwind v4, and whole apps move to Tailwind, not only the Base UI parts. brief-board's web app is one plain stylesheet on tokens. This brief moves all of it to Tailwind 4.3.5 with the looks unchanged, and it is the deep version of the skills library's draft (its brief 12). Where this brief and that draft disagree, this brief was measured against the code on 2026-11-10.

### Corrections to the estate draft

- **Tokens.** `web/src/styles.css` defines **20 distinct token names**, 38 definitions: 20 in the light `:root` (lines 5-37), 18 overridden in the dark block (lines 39-60; `--top-h` and `--cell-cap` are not). The draft's 32 is not a count of anything in the file. Four more custom properties are component-local and set per class: `--col` (7 definitions, `styles.css:265-271`), `--status` (7, lines 531-537), `--role` (8, lines 591-592 and 600-605) and `--need` (5, lines 209-213). All are read: `grep -o "var(--[a-z_-]*"` counts 122 reads.
- **Dark mode is a real feature here.** Today it follows `prefers-color-scheme: dark`. What the file does is not a `dark:` utility on each element but a second value for 18 tokens, so the migration keeps one place that redefines colours (decision 2), now under a `data-theme` switch. `color-scheme: light dark` is on `:root` (line 6).
- **No vendor CSS.** `web/vendor/ward/ward-auth-react.js` is hooks only (no `className`, no `<style>`), and `main.tsx` imports one stylesheet. So the unlayered-vendor-CSS problem the Almanac brief handles doesn't arise here.
- **The type scale is not a scale.** There are no font-size tokens: the file sets `font-size: 14px` on `:root` (line 33) and sizes in `px` and `em` inline (`px` appears 151 times, in 27 distinct values; there are no `rem`s).

### The stylesheet today

One file, **909 lines**, imported at `web/src/main.tsx:6`. Measured 2026-11-10 with `grep`:

- 109 distinct class names, in 140 rule blocks that start at the left margin;
- **126 `className=` attributes in 10 `.tsx` files** (`grep -o`): `DetailPanel.tsx` 43, `LoginPage.tsx` 17, `DonePage.tsx` 14, `Board.tsx` 13, `Card.tsx` 9, `AccountPage.tsx` 8, `TopBar.tsx` 8, `AuthGate.tsx` 6, `NeedsStrip.tsx` 5, `App.tsx` 4;
- 4 `@media` blocks: `prefers-color-scheme: dark` (line 39), `max-width: 1100px` (613), `max-width: 600px` (751) and `prefers-reduced-motion: reduce` (767);
- 0 `@keyframes`, 0 `!important`, 1 `transition` (line 293, the chevron's turn) and its reduced-motion override (769), 7 `grid-template`s, 7 `color-mix` calls, 8 `:hover` rules, 4 `z-index`es (lines 90, 242, 437, 651);
- one literal colour outside the tokens, the panel's `box-shadow` (line 443).

| Lines | What it styles |
|---|---|
| 1-85 | the tokens and the dark overrides, the reset (`*`, `body`, `button`), `:focus-visible`, `.muted` |
| 86-162 | the header (`.top`, `.brand`, `.filter`, the account link, `.updated`, the API banner) and the link to the other page |
| 163-230 | the needs strip (`.needs*`, five `--need` colours) and `main` |
| 231-430 | the board: column heads, lanes, the collapsible's trigger and chevron, cells (`--col`), the long cell, cards, badges, tags |
| 431-611 | the detail panel: `.panel`, facts, the markdown wrapper (`.markdown`), comments, roles, history |
| 612-661 | the narrow layout (`max-width: 1100px`) |
| 662-772 | Older Done, its 600px layout and the reduced-motion rule |
| 773-909 | sign-in: the gate, the login form, fields, errors, the account page, buttons |

The built CSS is **one file, 11,871 bytes raw and 3,184 gzip**, next to a 490 kB script (`npm run build -w @brief-board/web`, 2026-11-10).

### Names that come from data (the one real trap)

Five places build a class name from a value at run time, so Tailwind's scanner, which reads source text, can't see them:

| Where | The class | Values |
|---|---|---|
| `web/src/Board.tsx:54` and `:104` | `col-${status}` | the seven statuses |
| `web/src/DetailPanel.tsx:79` | `status status-${status}` | the seven statuses |
| `web/src/DetailPanel.tsx:168` | `role role-${role ?? "comment"}` | six roles, and `question-open` and `question-answered` set two more |
| `web/src/NeedsStrip.tsx:34` | `needs-kind needs-${kind}` | five kinds |

Each class today only sets one local variable that other rules read. The migration writes each as a `Record` of whole class strings in the same file, so the scanner sees them: for example `Record<Status, string>` holding `"[--col:var(--color-backlog)]"` and the rest. Tailwind's own docs name this as the way. A class built by string concatenation is a finding for `better-tailwindcss`, and a missing entry is a type error.

### Tailwind 4.3.5 against this app (scratch compile, 2026-11-10)

- **Status names with underscores work.** With `--color-in_progress` in `@theme`, `text-in_progress` and `bg-ready_for_test` compile. So the seven status tokens keep their names (`backlog`, `todo`, `in_progress`, `blocked`, `ready_for_test`, `ready_for_deploy`, `done`), which are the API's status values too.
- **`max-[1100px]:` is not today's query.** It compiles to `@media (width < 1100px)`, and the stylesheet's `@media (max-width: 1100px)` includes 1100. The same for 600. Use `@custom-variant narrow (@media (max-width: 1100px));` and `@custom-variant phone (@media (max-width: 600px));` in `index.css`, which compile to exactly today's queries.
- **`--color-*: initial` clears the default palette:** `text-red-500` produced no CSS.
- **`group-data-panel-open:rotate-90` compiles** to `:is(:where(.group)[data-panel-open] …)`, which replaces `.lane-head[data-panel-open] .chevron` (line 296).
- **A local property as an arbitrary class** (`[--col:var(--color-in_progress)]`) and `border-(--col)` both compile.

### Gotchas Tailwind brings to this app

- **The 14 px root.** `styles.css:33` sets `font-size: 14px` on `:root`. Every rem-based Tailwind default would come out 14/16 of its size, and `p-4` would be 14 px. Decision 4 moves the 14 px onto `body`.
- **Default names.** Tailwind's default palette, text scale, radii and shadows would sit beside the app's own tokens and could be used by mistake, so each default namespace is cleared first (`--color-*: initial` and so on), and only the app's tokens exist.
- **`tailwind-merge` doesn't know custom colour names.** Unconfigured, `cn("text-ink-muted", "text-body")` may treat both as colours and drop one. `web/src/lib/cn.ts` uses `extendTailwindMerge` with the app's colour and type-scale names, and has a test for exactly that case.
- **`hover:` is hover-capable only.** In Tailwind v4, `hover:` applies under `@media (hover: hover)`. The 8 `:hover` rules (lines 145, 200, 359, 483, 730, 844, 859, 890) no longer stay "stuck" after a tap on a phone. That is an expected difference to list.
- **Element selectors.** These rules aim at elements, not classes: `main` (221 and 618), `.panel h3`, `.gate-card p`, `.field input`, `.markdown pre`, `.markdown > :first-child` and `:last-child`, `button`, `body`. Tailwind's preflight covers the reset ones; the rest become classes in the markup or arbitrary descendant variants (decision 6).
- **The cell cap.** `.cell-long` (`Board.tsx:104`, `styles.css:325`) is a class that exists only to cap height; it becomes a conditional utility with `--cell-cap`'s 600 px, and its narrow-screen sticky head (`styles.css:648-656`) a `narrow:` variant.

### Classes the code reads, not only the stylesheet

- **None in production code.** `grep -rn "querySelector\|classList\|matchMedia" web/src` finds nothing, and no component reads a class back.
- **Tests: 25 assertions on class names in 3 files**, to rewrite as roles, text, or `data-` attributes. All three render to static markup:
  - `web/src/Board.test.tsx`: 43, 50, 52, 55, 67, 68, 69, 73, 94, 99, 104, 105, 110, 113, 134, 149 (16);
  - `web/src/DonePage.test.tsx`: 31, 36, 45, 47, 48, 50, 51 (7);
  - `web/src/NeedsStrip.test.tsx`: 33, 46 (2; brief 17 rewrites these).

  The `title=` and `aria-label=` assertions in the same lines stay.
- **Inline styles:** none (`grep -rn "style={" web/src`). Brief 02's exception for calendar colours has no counterpart here.

## Owner decisions

1. **Token names** (Q17 and Q61, decided 2026-11-10, technical calls). Names name a role, never a value. The small-tools family (wicket, the-board, lantern) converges on `surface`, `ink`, `accent`, `line` and `danger`, used as `bg-surface`, `text-ink` (no `bg-bg`), in Tailwind's namespaces (`--color-<name>`). brief-board adds only what it alone needs: the seven status colours, `--warn` and `--cell-cap`. Today's names, with their reads:

   | Today | Reads | Today | Reads |
   |---|---|---|---|
   | `--text-muted` | 21 | `--todo` | 3 |
   | `--surface` | 14 | `--in_progress` | 3 |
   | `--accent` | 14 | `--bg` | 3 |
   | `--line` | 9 | `--backlog` | 3 |
   | `--blocked` | 8 | `--warn` | 2 |
   | `--surface-sunk` | 7 | `--top-h` | 2 |
   | `--text` | 5 | `--banner-bg`, `--banner-text` | 2 each |
   | `--shadow` | 4 | `--cell-cap` | 1 |
   | `--ready_for_test`, `--ready_for_deploy`, `--done` | 4 each | | |

   So `--text` becomes `ink`, `--surface` stays `surface`, `--accent` and `--line` stay, and `--blocked` and wicket's `--danger` are one value (`#c9372c`) and one token: `danger`. The blocked status colour is `danger` (`[--col:var(--color-danger)]`), and the other six status names stay (`backlog`, `todo`, `in_progress`, `ready_for_test`, `ready_for_deploy`, `done`), since they are the API's status values. The page background (`--bg`), the sunk surface and the muted text follow the names wicket's brief 12 lists in its body; that list wins over this one wherever it differs.
2. **Dark mode: a Light / Dark / System switch, light by default** (Q18, decided 2026-11-10, owner). A first visit shows the light theme, not the system's. `dark:` keys off a `data-theme` attribute through `@custom-variant dark`, not `prefers-color-scheme`. The 18 dark values stay one block in `@layer base`, now under `[data-theme="dark"]`, redefining `--color-*`, so every utility follows and no `dark:` utility is needed. The choice is kept on the device in `localStorage`, since the board keeps no settings. The control lives on the account page, and it writes nothing to the API, so "the board only reads" ([wiki/decisions.md](../../wiki/decisions.md)) holds. Step 6 builds it.
3. **Visual parity** (Q19, decided 2026-11-10, owner). Close enough: screenshots at 1280 and 390 px in light, plus the two breakpoints' edges (1101 and 1099 px, 601 and 599 px), show no visible change to layout or colour. A few pixels of drift in spacing or rounding needn't be fixed or listed. Dark is checked for unreadable text.
4. **The 14 px root** (Q44, decided 2026-11-10, technical call). The root font size goes back to the browser's default, and the app's 14 px moves onto `body`. A pixel size on `html` overrides the reader's own font setting and skews every `rem` utility. Tailwind's default spacing then stays (4 px at a 16 px root), with the default text, radius, shadow and colour scales cleared, so only the app's tokens exist. No rule here uses `rem`, so nothing visible changes.
5. **Type sizes** (Q62, decided 2026-11-10, technical call). The font sizes become a named scale in `@theme` (`--text-*`), not arbitrary values. The stylesheet uses six distinct `font-size`s (12 px ×13, 18 px ×2, 14 px ×2, and one each of 20, 13 and 11 px). Step 2 names them by role and lists the table; 11, 12 and 13 px may merge where the screenshots show no visible change (Q19). The default `--text-*` is cleared.
6. **Order** (Q20, decided 2026-11-10, technical call). After the todo app and wicket, before lantern. This brief depends on wicket's token names, and on nothing else.
7. **The markdown wrapper** (default). `DetailPanel.tsx` renders ticket text through `react-markdown`, so `.markdown` styles elements the app doesn't author (`pre`, and the first and last child's margins, lines 539-556). Arbitrary descendant variants on the wrapper (`[&_pre]:overflow-x-auto`, `[&>:first-child]:mt-0`), no new dependency. The alternative is `@tailwindcss/typography`, which would restyle every element. *Still a question for the owner.*
8. **Preflight** (default). Tailwind's preflight, with what the file's reset adds beyond it ported to `@layer base`. The fallback, if a screenshot shows a shift: import `theme.css` and `utilities.css` without preflight, and keep the file's resets.
9. **Motion** (rule 7, default). Parity. The chevron's 150 ms turn becomes `transition-transform duration-150 motion-reduce:transition-none`, and there are no new animations.
10. **Attributes for the data-driven classes** (default). The `Record` of whole class strings (above). The alternative is a `data-status` attribute with `data-[status=backlog]:` variants, which `better-tailwindcss` also reads. The `Record` keeps the colour next to the component.
11. **Tests** (Q60 and Q62, decided 2026-11-10, technical calls). The 25 class-name assertions become role, text or `data-` assertions, and `data-testid` only where no role fits. The tests stay static-markup; jsdom is for wrappers that hold logic.

## Files you OWN

- `web/src/styles.css` (it goes) and `web/src/styles/index.css` and `web/src/lib/cn.ts`, new, with a `cn` test.
- The `className` values in `web/src/**/*.tsx`, and the `Record`s for the five data-driven names.
- The style import in `web/src/main.tsx`.
- The 25 class-name assertions listed above.
- The dependencies:
  - `web/package.json`, all pinned: `tailwindcss` 4.3.5, `@tailwindcss/vite` 4.3.5 (peer `vite` up to `^8`, against 8.3.5), `clsx` 2.1.1, `tailwind-merge` 3.7.0;
  - the root devDependencies: `eslint-plugin-better-tailwindcss` (4.11.0 is the latest on 2026-11-10, peer `tailwindcss ^4.1.17` and `eslint ^10`; Almanac's brief names 4.10.0, so use one version across both);
  - `package-lock.json`.
- `web/vite.config.ts`: the plugin, only. The `base`, the proxy and the `process.env` read stay.
- The theme switch (step 6): `web/src/AccountPage.tsx` for the control, a small theme module, the theme script in `web/index.html`, and their tests.
- `eslint.config.js`: the `better-tailwindcss` block only, with `entryPoint: "web/src/styles/index.css"`.
- `.prettierignore`: delete the `web/src/styles.css` line (brief 16, decision 4).
- `scripts/conventions.json`, if an exception is needed.
- `.claude/rules/web.md`: the Tailwind lines.
- Corpus:
  - [wiki/decisions.md](../../wiki/decisions.md): the revisit below;
  - [wiki/board-ui.md](../../wiki/board-ui.md): "Light and dark follow the system" and the `.cell-long` paragraph name `styles.css`;
  - [wiki/architecture.md](../../wiki/architecture.md), if it names the stylesheet;
  - [wiki/status.md](../../wiki/status.md);
  - [log.md](../../log.md).

## Files you must NOT touch

- `server/`, `shared/`, `cli/`.
- Behaviour. That covers event handlers, polling, the route, the Base UI wrappers' logic (`web/src/components/ui/`), and keyboard handling. A change that looks necessary for styling is a finding for the outcome note.
- `web/src/components/ui/`'s props. Brief 17 settled them.
- `web/vendor/`.

## What to do

Follow the skill's `migrating-from-plain-css.md`. One commit per numbered step; after each, `npm run check` and `npm run build` pass.

1. **Screenshots before.** Bring the board up on a scratch database as [docs/images/shots.md](../../../docs/images/shots.md) does: a second server (`BRIEF_BOARD_DB=<scratch> PORT=8807`), a temporary projects folder of made-up projects, and `brief-board sync` with a few `start` and `move` calls so every column is filled. `scripts/seed-demo.ts` can't be used: it sends no token and gets a 401 ([wiki/status.md](../../wiki/status.md), "Open"). Make the one local account with `SEED_USERNAME` and `SEED_PASSWORD` set in the environment for `npm run seed -w @brief-board/server`, then sign in through the login form in Playwright. Three additions:
   - **Freeze the browser clock** with `page.clock` at one instant, and set `BRIEF_BOARD_STALE_HOURS` high so no run flips to stale between the two passes. Capture the stale tone in a separate pair with `BRIEF_BOARD_STALE_HOURS=0.001`, run twice within minutes.
   - **Copy the scratch database** so the after pass starts from the same rows.
   - Emulate `colorScheme` light and dark (the app follows the system today).

   Keep the images out of git. Take each state at 1280 × 800 and 390 × 844 (Playwright's iPhone 14), light and dark, plus the edges at 1101, 1099, 601 and 599 px for the first two rows:

   | Area | States |
   |---|---|
   | Board | the default view; a collapsed lane; a lane with a cell of more than five cards (the long cell, with its sticky head under 1100 px); a lane of only Done; the empty board message; the board with the API down (the banner) |
   | Header | the tag filter set and unset; the link to Older Done; the blocked count with and without blocked tickets; "Loading…" |
   | Needs strip | all five kinds; one chosen; hidden when nothing waits |
   | Cards | in every column; with a run, a stale run and no run; with the blocked badge, the questions badge and tags; a todo's card |
   | Detail panel | open on a brief with comments of every role, questions open and answered, earlier runs and history; on a blocked brief; on a todo; loading; failed; "Copied" |
   | Older Done | with groups; empty; empty with a tag; at 600 px |
   | Sign-in | the login page; a failed sign-in; the session-ended notice; with "Sign in with Ward" (a dummy `WARD_OIDC_ISSUER`); the gate's Loading… and "can't be reached" (stop the API) |
   | Account | the page; the Ward link; an error |
   | Focus | a keyboard focus ring on a card, on the strip, on the filter and on the panel's close button |

   Record the built CSS size, raw and gzip.
2. **Set up.**
   - Add the dependencies and `@tailwindcss/vite`.
   - Write `web/src/styles/index.css`:
     - the layer order (`@layer theme, base, components, utilities;`);
     - `@import "tailwindcss"`;
     - `@theme` with the default colour, text, radius and shadow namespaces cleared, the tokens mapped (decision 1) and the named type scale (decision 5);
     - `font-size: var(--text-body)` on `body`, with the root left at the default (decision 4);
     - the two `@custom-variant`s (`narrow`, `phone`), and `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));`;
     - the dark block in `@layer base` under `[data-theme="dark"]`, with `color-scheme: dark` there.
   - Keep `styles.css` for now, **as aliases only** (`--surface: var(--color-surface)`) for the rules not yet migrated.
   - Add `web/src/lib/cn.ts`, and a test that `cn("text-ink-muted", "text-body")` keeps both.
   - Check that `text-in_progress` and `group-data-panel-open:rotate-90` compile in this app's build.
3. **Migrate one section at a time**, in this order, deleting each section of `styles.css` as its rules go:
   1. the base: preflight plus `@layer base` for `:focus-visible`, the 14 px on `body` and the page background (decision 8);
   2. the header, the API banner and the link to the other page (`TopBar.tsx`, `App.tsx`);
   3. the needs strip, with the `Record` for its five colours;
   4. the board: cells with the `Record` for `--col`, the long cell, the lane's trigger and chevron (`group-data-panel-open:`), cards, badges and tags;
   5. the detail panel: `web/src/components/ui/Dialog.tsx`'s markup, the facts, the markdown wrapper (decision 7), comments with the `Record`s for `--role` and `--status`, history;
   6. the narrow layout (`narrow:` variants, folded into the rules above as each is migrated);
   7. Older Done and its `phone:` layout;
   8. sign-in and the account page;
   9. `styles.css`, the aliases: delete it once nothing reads an old name (`grep -rn "var(--" web/src` shows only `--color-*` names, the `--col`, `--status`, `--role` and `--need` arbitrary properties, and Base UI's positioner variables if any).
4. **Lint.** Turn on `better-tailwindcss`'s correctness rules and its class order as errors, and fix what they find.
5. **Screenshots after.**
   - Take the same states again from the copied database and the same frozen clock.
   - Compare each pair with Playwright's comparison or pixelmatch.
   - Fix any difference a person would see in layout or colour (decision 3). Drift of a few pixels needn't be fixed or listed.
   - Expected: hover not sticking after a tap on a phone. Record the CSS sizes.
6. **The theme switch** (decision 2), in its own commit after the screenshots:
   1. A theme module reads the stored choice (`light`, `dark` or `system`, in `localStorage` inside a `try`, since storage can be blocked) and sets `data-theme` on `<html>`.
   2. A small inline script in `web/index.html`'s `<head>` does the same before first paint: the stored choice, else `light`. With `system` it follows `prefers-color-scheme` and listens for changes, and the `color-scheme` meta follows the theme.
   3. A Light / Dark / System control on the account page, on a Base UI `RadioGroup` wrapper in `web/src/components/ui/` (brief 17 adds that wrapper for the needs strip). Tests select it by role.
   4. Tests: each stored value maps to the attribute; `system` follows a changed media query.
7. **Corpus.**
   - In [wiki/decisions.md](../../wiki/decisions.md), revisit **"Base UI for the UI's widgets, styled by our own CSS"**, with a dated line and a `log.md` entry. It says the widgets "keep `styles.css`" and rejected a styled kit "such as shadcn, which would bring Tailwind into a board that has none". Both change: the widgets are now styled with Tailwind, by the owner's call of 2026-11-09. shadcn stays rejected, for a reason of its own to record: Base UI is used directly, without a styled kit on top. The "native controls stay native" half stands.
   - Update [wiki/board-ui.md](../../wiki/board-ui.md), [wiki/architecture.md](../../wiki/architecture.md) where it names the stylesheet, [wiki/status.md](../../wiki/status.md) and [log.md](../../log.md).
   - Add to `.claude/rules/web.md`:
     - tokens only from `@theme`;
     - no arbitrary colours;
     - a class chosen by data is a whole string in a `Record`, never built by concatenation;
     - `narrow:` and `phone:` are the two breakpoints, and they match today's `max-width` queries;
     - light and dark both change when a colour token changes, under `data-theme`;
     - type sizes from the named scale, no `text-[13px]`.
   - Run `bash corpus/lint.sh --index`, then `bash corpus/lint.sh`, until it is clean.
8. **The gate.** Drop `check-base-ui`'s `--warn-only` from `check:conventions`.

## Acceptance

- [ ] `find web/src -name '*.css'` prints only `web/src/styles/index.css`, and `grep -n "styles.css" .prettierignore web/src/main.tsx` prints nothing.
- [ ] `check-base-ui` passes **strict**.
- [ ] `grep -rnE "(bg|text|border|fill|stroke|ring|outline|shadow)-\[(#|rgb|hsl)" web/src` prints nothing, and ``grep -rn 'className={`' web/src`` prints nothing: no class is built from a template literal, so none is built from data.
- [ ] `index.css`'s `@theme` defines exactly the mapped tokens. The default colour, text, radius and shadow scales are cleared: `bg-red-500` in a component produces no CSS.
- [ ] `grep -rn "text-\[" web/src` prints nothing: every size is named. A `cn` test proves `cn("text-ink-muted", "text-body")` keeps both classes.
- [ ] The light screenshot pairs at 1280 and 390 px, and at the breakpoints' edges, show no visible change to layout or colour, alongside the before and after CSS sizes (11,871 bytes raw, 3,184 gzip, before).
- [ ] The switch has three choices. A first visit with no stored choice is light even when the system is dark; "Dark" and "System" (with a dark system) set `data-theme="dark"` before first paint, with no flash; the choice survives a reload. A Playwright test covers all three, and dark screenshots of each main screen show no unreadable text. `grep -rn "prefers-color-scheme" web/src` finds only the "System" code and the theme script.
- [ ] `npm run check` (with `better-tailwindcss`) and `npm run build` pass, and so do the 25 rewritten assertions.
- [ ] The decision is revisited in [wiki/decisions.md](../../wiki/decisions.md), and board-ui's "Light and dark follow the system" is updated, with a `log.md` entry. `bash corpus/lint.sh` ends clean.

## Interplay

- Brief 17's wrappers (`Dialog`, `Collapsible`, `ToggleGroup`) are styled here like any other part.
- Brief 19 doesn't touch `web/`. If both are open at once, they conflict only in `package-lock.json`, so don't run them at the same time.
- Brief 20 (the redesign) builds on this brief's tokens, type scale and theme switch.
- wicket's brief and lantern's use the same token names, so a later shared token file stays possible. If this brief adds a name wicket should have, say so in the outcome note.

## Outcome (2026-11-11)

Built in 10 code commits, a762e8f to 27a7fcd, then the closeout (local, not pushed). Board: Ready for deploy, with one
question for the owner (decision 7, the markdown wrapper, built as the brief's default: descendant variants on one
wrapper, no `@tailwindcss/typography`).

- **Parity.** 56 screenshots per set (1280 × 900 and 390 × 900, light and dark: login, a failed and an empty sign-in,
  board, a collapsed lane, a chosen strip kind, keyboard focus on a card, the panel and "Copied", Older Done, Sprints,
  account; plus the board and Older Done at 1101, 1099, 601 and 599 px, light), on a scratch database of made-up tickets
  (a lane with eight To Do cards, Done, blocked, ready-for-test and ready-for-deploy tickets, a question, comments), the
  browser clock fixed. 24 more per set from a mocked API (stale tone, the panel on a stale ticket, the API-down banner,
  the gate's Loading and "can't be reached", the Ward button). The "before" sets were taken at the brief's first commit;
  the extras from a scratch copy of the pre-migration `web/`. Two runs of the same code compared at 0 px. After the
  migration every pair compares at 0 px except the account page (see below). The comparison is a script that counts
  pixels whose channels differ by more than 24, since pixelmatch isn't installed here.
- **Sizes.** Built CSS 12,445 bytes raw and 3,302 gzip before (the brief's 11,871 / 3,184 was the day before; sprints
  and brief 17 grew it), 29,392 and 6,182 after: Tailwind's reset and the full `@theme static` token set. JS 512.22 kB
  (157.86 gzip) before, 548.42 kB (167.64 gzip) after: `tailwind-merge`, `clsx` and the theme store.
- **Counts.** 109 classes in 140 rules, 126 `className`s in 10 files before. After: no `.css` file but
  `styles/index.css`; 0 arbitrary colours, 0 `text-[`, 0 class built from a template literal, 0 `style=`.
  `check-base-ui` strict reads 0 / 0 (rule 5 was the stylesheet's place). `bg-red-500`, `shadow-md` and `rounded-lg`
  compile to nothing; `text-in_progress` and `group-data-panel-open:rotate-90` compile. The two custom variants compile to
  `@media (width<=1100px)` and `(width<=600px)`, the old queries.
- **Tests.** 331 (was 324): `cn` (5), the theme store and the boot script (6), the switch (2), less one. The 25
  class-name assertions became text, `title`, `aria-label` and `data-` assertions (`data-column`, `data-cell`,
  `data-long`, `data-stale` on the markup).

### Deliberate differences

- **The account page** gains a Theme row (Light / Dark / System). Its heading is 20 px where the browser's `h2` was
  21 px, a few pixels of drift in the spacing under it.
- **`hover:` needs a hover-capable device.** A tapped card on a phone no longer keeps its hover tint.
- **Markdown headings** in ticket text keep their weight and margins but not the browser's sizes (the reset removes
  them). None of the tickets on the board use a heading.

### Deviations

- **`@theme static`** (`styles/index.css`): Tailwind drops unused theme variables, and the legacy aliases in step 2
  needed them. Kept, so every token is always there; it costs a few hundred bytes.
- **The theme follows the skill's `theme.md`, not the brief's step 6** (the skill wins): `data-theme` is `light`, `dark` or
  `system`, the colour tokens are `light-dark()` pairs and `color-scheme` follows the attribute, so System follows the OS
  in CSS, with no `matchMedia` listener and no `color-scheme` meta. The brief's "dark values in one block under
  `[data-theme="dark"]`" became the pairs. `web/src/lib/theme.ts`, `web/src/ThemeSwitch.tsx`, the script in `web/index.html`.
- **`phone:` exists though the skill says use `max-sm:`**: 600 px is not Tailwind's 640 px `sm`, and the brief measured
  it. `narrow:` (1100 px) has no Tailwind equivalent at all.
- **No Playwright test is committed:** this repo has no Playwright and adding `@playwright/test` and its browser was not
  in the brief's file list. The three choices are covered by vitest (the store, the boot script run against stub
  storage, the switch's markup); a scratch Playwright script checked first visit with a dark system (light), Dark, reload,
  System with a live OS change, and Light with a dark OS, and the dark screens by pixel comparison.
- **The needs strip's radio group keeps `display: contents`.** A box of its own (`flex flex-wrap`, with and without
  `flex-1`) moved "Show all" to its own line at 390 px. Chrome keeps the role: the accessibility snapshot still shows
  `radiogroup "Needs you"` with its four radios.
- **Tokens beyond the brief's list:** `surface-hover` (the card's 8% accent tint, a `color-mix` of two tokens),
  `shadow-panel`, `font-strong` (650), the radii `chip` / `box` / `gate`, the z scale `cell` / `columns` / `top` /
  `panel`, `--default-mono-font-family: monospace`. `--top-h` and `--cell-cap` stay plain custom properties in `:root`.
- **The data-driven colours are utilities in a `Record`, not a local `--col` property:** `border-t-in_progress`,
  `bg-done/14 text-done`. Opacity tints use `color-mix` in oklab where the old CSS used srgb: no visible difference.
- **A disabled select** keeps the browser's 0.7 opacity (`disabled:opacity-70`), because the reset sets it to 1.
- **`cn()` overrides tailwind-merge's size / line-height conflict** (`web/src/lib/cn.ts`), as the todo app's did.
- **The disabled button fades to 60%** as before (`disabled:opacity-60`, only while a request runs); the dry run's rule
  says to fade the text around a control instead. Left for the redesign.
- **`npm run check`'s knip** still lists 22 unused exports in `cli/`, `server/` and `web/` (`POLL_MS`, `authClient`, ...)
  and exits 0; none are from this brief. `check-structure` stays `--warn-only`.
- **Dependencies:** `tailwindcss` and `@tailwindcss/vite` 4.3.5 as `web` devDependencies; `clsx` 2.1.1 and
  `tailwind-merge` 3.7.0 as dependencies, all pinned. `eslint-plugin-better-tailwindcss` stays at the root's 4.10.0.
- **Files outside the brief's list:** `web/src/looks.ts` and `web/src/MarkdownText.tsx` (shared class strings, the
  markdown wrapper), `package.json` (the strict gate), `web/src/components/ui/*` (utilities moved in, as the brief says).

### Handoff for dependents

- **Brief 20 (the redesign)** builds on `web/src/styles/index.css`: tokens `page`, `surface`, `surface-sunk`,
  `surface-hover`, `ink`, `ink-muted`, `line`, `accent`, `danger`, `banner-bg`, `banner-text`, `warn`, the seven status
  colours; `--text-micro` to `--text-display`; `font-strong`; radii and z names. A new token's name goes in
  `web/src/lib/cn.ts`'s lists too.
- **To wicket and lantern (names):** the family's list worked as written, with `page` for `--bg`. This board needed
  `warn`, the status colours, `surface-hover`, `shadow-panel`; wicket's `shadow-card` is here too.
- **Commands:** `npm run check` (ESLint with `better-tailwindcss`, `check-base-ui` strict); `npx eslint --fix web/src`
  sorts classes.
- **Deploy:** `node cli.ts brief-board deploy`, from the vps-deploy checkout.
