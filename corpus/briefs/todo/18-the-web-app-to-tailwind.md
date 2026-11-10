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
  - Q17 (token names: the family converges, and wicket sets the names);
  - Q18 (dark mode);
  - Q19 (visual parity);
  - Q20 (the order of the migrations);
  - the new questions in decisions 3, 4 and 5.

**Before you start:** run `brief-board guide` ([corpus/CLAUDE.md](../../CLAUDE.md)).

## Context

The owner's call of 2026-11-09: Base UI is styled with Tailwind v4, and whole apps move to Tailwind, not only the Base UI parts. brief-board's web app is one plain stylesheet on tokens. This brief moves all of it to Tailwind 4.3.5 with the looks unchanged, and it is the deep version of the skills library's draft (its brief 12). Where this brief and that draft disagree, this brief was measured against the code on 2026-11-10.

### Corrections to the estate draft

- **Tokens.** `web/src/styles.css` defines **20 distinct token names**, 38 definitions: 20 in the light `:root` (lines 5-37), 18 overridden in the dark block (lines 39-60; `--top-h` and `--cell-cap` are not). The draft's 32 is not a count of anything in the file. Four more custom properties are component-local and set per class: `--col` (7 definitions, `styles.css:265-271`), `--status` (7, lines 531-537), `--role` (8, lines 591-592 and 600-605) and `--need` (5, lines 209-213). All are read: `grep -o "var(--[a-z_-]*"` counts 122 reads.
- **Dark mode is a real feature here.** The draft says "through `prefers-color-scheme: dark`", which is right and is the default of Tailwind's `dark:` variant. What the file does is not a `dark:` utility on each element but a second value for 18 tokens, so the migration keeps one place that redefines colours (decision 2). `color-scheme: light dark` is on `:root` (line 6).
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

- **The 14 px root.** `styles.css:33` sets `font-size: 14px` on `:root`. Every rem-based Tailwind default would come out 14/16 of its size, and `p-4` would be 14 px. Decision 4.
- **Default names.** Tailwind's default palette, text scale, radii and shadows would sit beside the app's own tokens and could be used by mistake, so each default namespace is cleared first (`--color-*: initial` and so on), and only the app's tokens exist.
- **`tailwind-merge` doesn't know custom colour names.** Unconfigured, `cn("text-text-muted", "text-[13px]")` may treat both as colours and drop one. `web/src/lib/cn.ts` uses `extendTailwindMerge` with the app's colour names, and has a test for exactly that case.
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

## Owner decisions (defaults this brief builds)

1. **Token names** (Q17). Default: the small-tools family's names, set by wicket's brief 11 and recorded in its log entry, put in Tailwind's namespaces (`--color-<name>`). brief-board adds only what it alone needs. Today's names, with their reads:

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

   On 2026-11-10 wicket's `styles.css` has the same names for `--bg`, `--surface`, `--surface-sunk`, `--text`, `--text-muted`, `--line`, `--accent`, `--shadow`, `--banner-bg`, `--banner-text` and `--top-h`. wicket adds `--danger` and `--ok`; brief-board adds the seven status colours, `--warn` and `--cell-cap`, and has `--blocked` where wicket has `--danger` (both `#c9372c`). If wicket's brief has renamed any of the shared ones when this runs, follow wicket's list. If it hasn't run, use today's names under `--color-*`. *New question for the grilling*: `--blocked` and `--danger` are one value, so should the family have one name?
2. **Dark mode** (Q18). Default: `prefers-color-scheme`, as today, with no `data-theme` switch. The 18 dark values stay one block in `@layer base`, redefining `--color-*` on `:root`, so every utility follows. No `dark:` utilities.
3. **Visual parity** (Q19). Default: screenshots at 1280 and 390 px in light and dark, plus the two breakpoints' edges (1101 and 1099 px, 601 and 599 px). Every difference is fixed or listed with its reason.
4. **Tailwind's scale against the 14 px root.** Default: `--spacing: 4px`, with the default text, radius, shadow and colour scales cleared, so every utility is in the stylesheet's pixels. The alternative is to move the 14 px from `:root` to `body` and keep rem-based defaults. Either changes nothing visible, because no rule here uses `rem`. *New question for the grilling*: the same one Almanac's migration raises (its root is 15 px).
5. **Where brief-board falls in the estate's order** (Q20). Default: after wicket, and before lantern. This brief depends on wicket's token names, and on nothing else.
6. **The markdown wrapper.** `DetailPanel.tsx` renders ticket text through `react-markdown`, so `.markdown` styles elements the app doesn't author (`pre`, and the first and last child's margins, lines 539-556). Default: arbitrary descendant variants on the wrapper (`[&_pre]:overflow-x-auto`, `[&>:first-child]:mt-0`), no new dependency. The alternative is `@tailwindcss/typography`, which would restyle every element. *New question for the grilling.*
7. **Preflight.** Default: Tailwind's preflight, with what the file's reset adds beyond it ported to `@layer base`. The fallback, if a screenshot shows a shift: import `theme.css` and `utilities.css` without preflight, and keep the file's resets.
8. **Motion** (rule 7). Default: parity. The chevron's 150 ms turn becomes `transition-transform duration-150 motion-reduce:transition-none`, and there are no new animations.
9. **Attributes for the data-driven classes.** Default: the `Record` of whole class strings (above). The alternative is a `data-status` attribute with `data-[status=backlog]:` variants, which `better-tailwindcss` also reads. The `Record` keeps the colour next to the component.

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
   - Emulate `colorScheme` light and dark.

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
     - `@theme` with the default namespaces cleared, the tokens mapped (decision 1) and `--spacing: 4px` (decision 4);
     - the two `@custom-variant`s (`narrow`, `phone`);
     - the dark block in `@layer base`, and `color-scheme: light dark`.
   - Keep `styles.css` for now, **as aliases only** (`--surface: var(--color-surface)`) for the rules not yet migrated.
   - Add `web/src/lib/cn.ts`, and a test that `cn("text-text-muted", "text-[13px]")` keeps both.
   - Check that `text-in_progress` and `group-data-panel-open:rotate-90` compile in this app's build.
3. **Migrate one section at a time**, in this order, deleting each section of `styles.css` as its rules go:
   1. the base: preflight plus `@layer base` for `:focus-visible`, the 14 px root and the page background (decision 7);
   2. the header, the API banner and the link to the other page (`TopBar.tsx`, `App.tsx`);
   3. the needs strip, with the `Record` for its five colours;
   4. the board: cells with the `Record` for `--col`, the long cell, the lane's trigger and chevron (`group-data-panel-open:`), cards, badges and tags;
   5. the detail panel: `web/src/components/ui/Dialog.tsx`'s markup, the facts, the markdown wrapper (decision 6), comments with the `Record`s for `--role` and `--status`, history;
   6. the narrow layout (`narrow:` variants, folded into the rules above as each is migrated);
   7. Older Done and its `phone:` layout;
   8. sign-in and the account page;
   9. `styles.css`, the aliases: delete it once nothing reads an old name (`grep -rn "var(--" web/src` shows only `--color-*` names, the `--col`, `--status`, `--role` and `--need` arbitrary properties, and Base UI's positioner variables if any).
4. **Lint.** Turn on `better-tailwindcss`'s correctness rules and its class order as errors, and fix what they find.
5. **Screenshots after.**
   - Take the same states again from the copied database and the same frozen clock.
   - Compare each pair pixel by pixel, with Playwright's comparison or pixelmatch at its default threshold.
   - Fix every difference, or list it in the outcome note with its reason.
   - Expected: hover not sticking after a tap on a phone, and any sub-pixel text shift from the 14 px root. Record the CSS sizes.
6. **Corpus.**
   - In [wiki/decisions.md](../../wiki/decisions.md), revisit **"Base UI for the UI's widgets, styled by our own CSS"**, with a dated line and a `log.md` entry. It says the widgets "keep `styles.css`" and rejected a styled kit "such as shadcn, which would bring Tailwind into a board that has none". Both change: the widgets are now styled with Tailwind, by the owner's call of 2026-11-09. shadcn stays rejected, for a reason of its own to record: Base UI is used directly, without a styled kit on top. The "native controls stay native" half stands.
   - Update [wiki/board-ui.md](../../wiki/board-ui.md), [wiki/architecture.md](../../wiki/architecture.md) where it names the stylesheet, [wiki/status.md](../../wiki/status.md) and [log.md](../../log.md).
   - Add to `.claude/rules/web.md`:
     - tokens only from `@theme`;
     - no arbitrary colours;
     - a class chosen by data is a whole string in a `Record`, never built by concatenation;
     - `narrow:` and `phone:` are the two breakpoints, and they match today's `max-width` queries;
     - light and dark both change when a colour token changes.
   - Run `bash corpus/lint.sh --index`, then `bash corpus/lint.sh`, until it is clean.
7. **The gate.** Drop `check-base-ui`'s `--warn-only` from `check:conventions`.

## Acceptance

- [ ] `find web/src -name '*.css'` prints only `web/src/styles/index.css`, and `grep -n "styles.css" .prettierignore web/src/main.tsx` prints nothing.
- [ ] `check-base-ui` passes **strict**.
- [ ] `grep -rnE "(bg|text|border|fill|stroke|ring|outline|shadow)-\[(#|rgb|hsl)" web/src` prints nothing, and ``grep -rn 'className={`' web/src`` prints nothing: no class is built from a template literal, so none is built from data.
- [ ] `index.css`'s `@theme` defines exactly the mapped tokens. The default colour, text, radius and shadow scales are cleared: `bg-red-500` in a component produces no CSS.
- [ ] A `cn` test proves `cn("text-text-muted", "text-[13px]")` keeps both classes.
- [ ] The screenshot pairs match in light and dark, with every difference listed and explained in the outcome note, alongside the before and after CSS sizes (11,871 bytes raw, 3,184 gzip, before).
- [ ] `npm run check` (with `better-tailwindcss`) and `npm run build` pass, and so do the 25 rewritten assertions.
- [ ] The decision is revisited in [wiki/decisions.md](../../wiki/decisions.md), with a `log.md` entry. `bash corpus/lint.sh` ends clean.

## Interplay

- Brief 17's wrappers (`Dialog`, `Collapsible`, `ToggleGroup`) are styled here like any other part.
- Brief 19 doesn't touch `web/`. If both are open at once, they conflict only in `package-lock.json`, so don't run them at the same time.
- wicket's brief and lantern's use the same token names, so a later shared token file stays possible. If this brief adds a name wicket should have, say so in the outcome note.
