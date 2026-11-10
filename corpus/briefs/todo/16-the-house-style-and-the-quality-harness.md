# Task 16: The house style and the quality harness

**Depends on:**

- In brief-board: nothing. This brief runs first.
- In the owner's skills library:
  - brief 27, *A house style, and a quality harness that enforces it*: the vendored `house-style` copy at `v1.0.0`, the `house-style` skill, and the plugin's `Stop` and `PostToolUse` hooks;
  - brief 15, *Enforce the base-ui and code-structure skills in every repo*: how the convention checkers are wired and when they run `--warn-only`.
- The owner's grilling of 2026-11-10, questions Q1, Q5-Q14 and Q45-Q51 of the skills library's open questions.

**Runs before:** 17, 18 and 19. The reformat touches about 35 TypeScript files, and those three briefs rewrite or move most of them. Formatting first gives one clean reformat commit, and the formatter hook keeps every later diff formatted.

**Before you start:** run `brief-board guide` ([corpus/CLAUDE.md](../../CLAUDE.md)).

## Context

On 2026-11-09 the owner made three calls for every web app they own: Base UI 1.9.0 everywhere, the whole app on Tailwind v4, and the researched conventions enforced in each repo. The skills library's brief 27 measured the house style, the one the owner and their agents already write, and found it consistent but unenforced: nothing formats it and the linter is thin. Its answer is a two-layer harness:

- **The repo's gate:** `npm run check` and its fast subset `npm run check:fast`. They hold for a human, any agent and the deploy.
- **The Claude Code layer:**
  - the plugin's `Stop` hook runs `check:fast`, and exits 2 on a failure;
  - its `PostToolUse` hook formats each saved file;
  - `.claude/rules/web.md` and `.claude/rules/server.md` are scoped by `paths:`;
  - a short root `CLAUDE.md` holds the commands.

This brief adopts both layers in brief-board. Briefs 17-19 then turn on their own checks inside it.

### What brief-board has today (read 2026-11-10)

- **Four workspaces and a script folder:** `shared`, `server`, `web`, `cli` (root `package.json:5-10`), and `scripts/seed-demo.ts`. Node `>=24` (`package.json:13`).
- **`tsconfig.base.json`** (22 lines) already has `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `isolatedModules`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, and `NodeNext` for `module` and `moduleResolution`.
  - `web/tsconfig.json` overrides those to `ESNext` and `bundler`, with `types: ["vite/client"]` and `noEmit`.
  - The root `tsconfig.json` has `files: []` and references `shared`, `server` and `cli`, not `web`.
- **`eslint.config.js`** (27 lines): `@eslint/js` recommended, `typescript-eslint` recommended (untyped, 8.69.0), `eslint-plugin-react-hooks` 7.1.1 recommended on `web/src/**`, and `_`-prefixed unused names. `**/vendor/**`, `dist` and `data` are ignored. Recommended already makes `no-explicit-any` and `ban-ts-comment` errors.
- **No formatter.** No Prettier config, no `format` script.
- **Scripts** (root `package.json:15-21`): `typecheck` is `tsc -b && tsc -p web --noEmit`, two runs; `lint` is `eslint .`; `test` is `vitest run`; there is **no `pretest` and no `check`**.
- **`npm test` fails on a fresh clone.** Measured on 2026-11-10 with `shared/dist` removed: 8 of 15 test files fail to load (`Failed to resolve entry for package "@brief-board/shared"`), and 65 of 283 tests run. The tests import `shared` through its built `dist/`, and nothing builds it first. `npm run dev` builds it (`tsc -b shared`); `npm test` does not.
- **No root `CLAUDE.md`, no `.claude/`.** The only `CLAUDE.md` is [corpus/CLAUDE.md](../../CLAUDE.md), which Claude Code loads only once an agent reads a file under `corpus/`. So an agent that never opens the corpus sees no commands and none of the hard rules (no secrets, no CI, no pushes, deploys are owner steps). [wiki/architecture.md](../../wiki/architecture.md) ("What other repos carry") already says a repo's brief-board section goes in the root `CLAUDE.md` when the repo has one.
- **`.npmrc`** has `save-exact=true`. Every `package.json` in the repo pins exactly (checked against `package-lock.json` on 2026-11-10: 0 non-exact specs in the five manifests).
- **The Docker image** (`infrastructure/Dockerfile`): the `deps` stage runs a full `npm ci` (dev dependencies included) in `node:24-alpine` with only `python3 make g++` added. **There is no `git`.** `npx tsc -b server` then runs in the `builder` stage, so a tsconfig change reaches the image build.
- **`.dockerignore`** leaves out `corpus`, `docs`, `scripts`, `web/src`, `web/vendor`, `cli/src` and `cli/test`, so none of the new root config files matters to the image.

### Measured on 2026-11-10

Taken on a scratch copy of the repo with `npm ci --ignore-scripts` (plus `npm rebuild better-sqlite3`), on Node 22.23.4 (the repo asks for 24), Prettier 3.8.1, TypeScript 6.0.2 (the repo has 6.0.3), `eslint-plugin-n` 18.5.0, `eslint-plugin-import-x` 4.18.1, `@vitest/eslint-plugin` 1.6.28 and knip 6.44.2. Baseline: `tsc -b` clean, `tsc -p web --noEmit` clean, `eslint .` clean, 283 tests pass in 15 files.

**Prettier churn.** `prettier --print-width <N> --trailing-comma all --write` over the 74 TypeScript and JavaScript files (9,366 lines: `git ls-files` minus `vendor`), with `server/vendor/`, `web/vendor/` and `package-lock.json` ignored, then `git diff --numstat`. A file's changed lines are the larger of its added and removed counts, summed:

| `printWidth` | Lines changed | % of 9,366 | Files changed |
|---|---|---|---|
| 100 | 2,417 | 25.8% | 60 |
| 110 | 1,752 | 18.7% | 54 |
| 120 | 1,088 | 11.6% | 43 |
| **130** | **681** | **7.3%** | **35** |
| 140 | 340 | 3.6% | 27 |
| **150** | **176** | **1.9%** | **20** |
| 160 | 194 | 2.1% | 25 |
| 180 | 306 | 3.3% | 27 |

brief-board's lines run wider than the other repos': 713 lines are over 100 characters and 294 over 120 (`awk 'length>100'` over the same 74 files). At 120 the churn is 11.6%, where the skills library measured 1.4-2.5% for Almanac, Satchel and wicket on 2026-11-09. brief-board's least churn is 150, but the owner's estate width is 120 (Q8, Q51), so 1,088 lines in 43 files is the one-off cost. Two files carry the most at 130: `server/src/app.test.ts`, which brief 19 splits, and `server/src/store.ts`, which brief 19 moves whole.

The other file types, at the same settings:

- **CSS:** `web/src/styles.css` changes 87 added and 28 removed lines (a long `font-family` list and 12 one-line rule blocks). Brief 18 deletes the file.
- **YAML:** `infrastructure/docker-compose.yml`, 5 added and 1 removed.
- **JSON and `web/index.html`:** no change.
- **Markdown:** 26 files, 220 lines, among them `cli/src/guide.md` (20 and 8) and the done briefs under `corpus/briefs/done/`.

**TypeScript flags.** `verbatimModuleSyntax` and `erasableSyntaxOnly` added to `tsconfig.base.json`, then `tsc -b` and `tsc -p web --noEmit`:

- **`erasableSyntaxOnly`: 9 errors** (TS1294), all parameter properties: `server/src/store.ts:104, 106, 108` (the `Store` constructor), `cli/src/client.ts:34, 35, 59, 60` (`ApiRejected`, `BoardClient`), `cli/src/errors.ts:16` (`Unreachable`), `cli/src/runtime.ts:19` (`Runtime`).
- **`verbatimModuleSyntax`: 0 errors.** The house already writes inline `type` imports: 32 imports carry `{ …, type X }` and 26 are `import type` (`grep -rnE`, 262 imports in all).

**The house shapes**, counted with the TypeScript parser over the same 74 files:

| Shape | Count | Where |
|---|---|---|
| `enum` | 0 | |
| `any` (the keyword) | 0 | |
| non-null `!` | **65** | 18 files: `server/src/app.ts` 4, `store.ts` 5, `db.ts` 1, `sync.ts` 1; `server/src/app.test.ts` 15, `db.test.ts` 1; `shared/src/api.test.ts` 8; `cli/src/` 18 across `cli/src/sync/parse.ts` (7), sync/read (2), commands/holds (2), commands/questions (2) and five more files; `cli/src/sync/sync.test.ts` 11; `web/src/DetailPanel.tsx:197`. Nearly all are an indexed read or a regex group that `noUncheckedIndexedAccess` types as possibly undefined: `positionals[1]!`, `match[1]!`. 30 are in production code and 35 in tests |
| `@ts-ignore` / `@ts-nocheck` / `@ts-expect-error` | 0 / 0 / 0 | |
| `TODO` / `FIXME` / `XXX` / `HACK` in a comment | 0 | `TODO_SLUG` (`shared/src/key.ts:61`) is an identifier |
| `console` | 9 | `cli/src/index.ts:16, 17` (the CLI's one output boundary: every other file gets `out` and `err` through `Context`), `server/src/index.ts:32`, `server/src/seed.ts:72, 80`, `scripts/seed-demo.ts:140, 151, 162, 164` |
| default exports | 3 | `eslint.config.js:10`, `vitest.config.ts:5`, `web/vite.config.ts:44`: all configs, which their tools require |
| namespaces | 0 | |
| parameter properties | 9 | the nine above |
| `process.env` | 7 | `server/src/index.ts:29`, `server/src/seed.ts:61, 62, 68`, `cli/src/index.ts:13`, `scripts/seed-demo.ts:16`, `web/vite.config.ts:46` |
| classes | 10 | 7 `Error` subclasses, plus `Store` (`server/src/store.ts:102`), `BoardClient` (`cli/src/client.ts:57`) and `Runtime` (`cli/src/runtime.ts:15`) |
| `void` on a call (a marked discarded promise) | 12 | `server/src/app.ts:169, 300`, and 10 in `web/src` |

**The typed and house rules**, run through one scratch config, `projectService` with `allowDefaultProject` for the root configs and `scripts/*.ts`:

| Rule | Findings | Where |
|---|---|---|
| `no-floating-promises` | 0 | |
| `no-misused-promises` | 1 | `web/src/usePolling.ts:43`: `setTimeout(tick, POLL_MS)`, where `tick` is async and catches everything |
| `await-thenable` | 0 | |
| `switch-exhaustiveness-check` | 4 | `web/src/messages.ts:22, 40, 58, 72`. All four have a `default:` over a union with more members on purpose: each message function names only the codes it words differently. Every one disappears with `considerDefaultExhaustiveForUnions: true` |
| `no-unnecessary-type-assertion` | 0 | |
| `consistent-type-imports` (inline style) | 0 | |
| `no-non-null-assertion` | 65 | above |
| `TSEnumDeclaration` ban, `no-warning-comments` | 0 / 0 | |
| `no-console` | 9 | above |
| `no-default-export` (from `eslint-plugin-import-x`) | 2 in `.ts`; the third is `eslint.config.js` | all configs |
| `no-process-env` (from `eslint-plugin-n`) | 7 | above |
| `@vitest/eslint-plugin` recommended | 4, all `no-conditional-expect` | `server/src/config.test.ts:44, 45, 46` (inside a `catch`, after `expect.unreachable()`) and `shared/src/moves.test.ts:44` (inside an `if`) |

Lint time, `eslint .` over the whole repo: untyped today 4.4 s; with the typed rules 11.7 s and 13.7 s through `projectService`, 13.0 s and 10.8 s through `project` (two runs each). No difference worth a choice. One file takes 3.0 s through `projectService` and 3.7 s through `project`.

**knip** (6.44.2) with a config that ignores `**/vendor/**` and names the entries (`server/src/index.ts`, `server/src/seed.ts`, `cli/src/index.ts`, `web/src/main.tsx`, `scripts/*.ts`): **no unused files or dependencies, and 21 unused exports.** Without the entries it also reports `scripts/seed-demo.ts` as an unused file (it is run by hand, `node scripts/seed-demo.ts`). The 21 exports: 15 in `cli/src` (`BOARD_NAME_FILE`, `conditionKey`, `groupBlocked`, `findBrief`, `renderMoves`, `readBoardUrlFrom`, `allowedMoves`, `openRunText`, `holdList`, `runEnding`, `COMMON_OPTIONS`, `slugWords`, `unlink`, `frontmatter`, `cleanCondition`), 2 in `server/src/config.ts` (`WARD_CALLBACK_PATH`, `MIN_TOKEN_LENGTH`), 4 in `web/src` (`Unauthorized` at `api.ts:27`, `AUTH_BASE_PATH`, `authClient`, `POLL_MS`).

**Gate timings**, cold, one after another: `tsc -b` 9.4 s, `tsc -p web --noEmit` 4.5 s, `prettier --check .` 4.3 s, knip 1.4 s, `vitest run` 7.9 s (4.7 s warm). Warm: `tsc -b` 0.3 s, the web typecheck 4.0 s. So `check:fast` with one changed file is about 0.3 + 4.0 + 3.0, **about 8 s**, and `check` is about 40 s plus the typed lint.

## Owner decisions

All decided 2026-11-10; the numbers are the skills library's open questions. The owner's answers are marked (owner), the rest are technical calls the owner may overrule.

1. **Vendored `house-style`** (Q6, technical call). brief-board holds a copy with a version header, refreshed by a `house-style:sync` script that finds the checkout by name, the way Ward's library is shared today. No git, `github:` or tarball dependency, so the Docker `deps` stage needs no `git` and the Dockerfile stays untouched. Steps 4-5 extend the vendored configs.
2. **Prettier at width 120** (Q8 and Q51, technical call). Double quotes, semicolons, `trailingComma: "all"` (Q9). brief-board's lines run wider than the other repos', so the one-off cost is the 120 row of the table above: **1,088 lines (11.6%) in 43 files**, in one reformat commit listed in `.git-blame-ignore-revs`. That is more than the 150 row (176 lines in 20 files), and the owner's one estate width wins over this repo's least churn.
3. **Markdown stays out of Prettier** (Q45, technical call). `.prettierignore` lists `*.md`. Two reasons here beyond the corpus's own linter: `cli/src/guide.md` is printed by `brief-board guide` to every agent (reformatting it changes what they read, and `cli/src/guide.test.ts` reads it), and `corpus/briefs/done/` is immutable.
4. **The old stylesheet stays out too, until brief 18 deletes it** (default). `.prettierignore` lists `web/src/styles.css`, so the reformat doesn't spend its changed lines on a file that goes. Brief 18 removes the line. The new `index.css` is formatted from its first commit.
5. **tsconfig** (Q11, technical call). Add `verbatimModuleSyntax` and `erasableSyntaxOnly` now: the nine parameter properties become declared fields. `exactOptionalPropertyTypes` waits for a later brief, after a count. `noUncheckedIndexedAccess` is already on (Q50). TypeScript is 6.0.3, past 5.8.
6. **Typed lint** (Q12 and Q48, technical calls). The six rules through `projectService`, with `considerDefaultExhaustiveForUnions: true` on `switch-exhaustiveness-check`, so `web/src/messages.ts`'s four deliberate partial switches stay as they are. `no-floating-promises` names `describe`, `it` and `test` in `allowForKnownSafeCalls`. If the vendored `house-style` copy ships the rule without that option, report it to the skills library.
7. **The house shapes** (Q13 and Q47, technical calls). `!` is an error in source (30) and a warning in tests (35). `no-console` is allowed in the CLIs and scripts, each file written in the config with its reason: `cli/src/index.ts`, `server/src/index.ts`, `server/src/seed.ts` and `scripts/*.ts`. `no-default-export` is off in `*.config.*`. `no-process-env` covers `server/src` outside `config.ts` and tests, as a **warning**: its four findings (`index.ts:29`, `seed.ts:61, 62, 68`) are brief 19's work, and brief 19 makes it an error. The CLI's `cli/src/index.ts:13`, `scripts/seed-demo.ts:16` and `web/vite.config.ts:46` are entry points and build config, outside the rule. Components use named exports (Q49).
8. **`check:fast`** (Q10, technical call). A typecheck plus ESLint on the changed files, built incrementally (`tsc -b`). Target 15 s (8 s measured).
9. **The Claude Code layer** (Q7, technical call). It lives in the plugin: `Stop` runs `check:fast`, `PostToolUse` formats the saved file. Nothing is committed to `.claude/settings.json`.
10. **A root `CLAUDE.md`** (Q46, technical call). A short root `CLAUDE.md` with the commands. The repo-wide **Hard rules** and **brief-board** sections move out of [corpus/CLAUDE.md](../../CLAUDE.md) into it, because they apply outside the corpus, as [wiki/architecture.md](../../wiki/architecture.md) already describes.
11. **`pretest`.** `"pretest": "tsc -b shared"`, so `npm test` works on a fresh clone. *Not a grilling question*: the measurement above settles it.
12. **Deploy** (Q1, fact). The deploy runs `npm ci` and `tsc -b`, no tests or lint, and stays as it is. `npm run check` and the `Stop` hook are the gate.

## Files you OWN

- `tsconfig.base.json`, and `web/tsconfig.json` (only to add `incremental` with a `tsBuildInfoFile`).
- `eslint.config.js`.
- New: the Prettier config, `.prettierignore`, `.git-blame-ignore-revs`, `knip.json`, the vendored `house-style` copy (with its version header) and the `house-style:sync` script.
- The root `package.json` (scripts, devDependencies) and `package-lock.json`.
- The reformat itself: whitespace-only changes to every file Prettier covers.
- The fixes the new rules ask for:
  - the nine parameter properties (`server/src/store.ts`, `cli/src/client.ts`, `cli/src/errors.ts`, `cli/src/runtime.ts`);
  - the 65 `!`, in the 18 files above;
  - `web/src/usePolling.ts:43` and the two tests with `no-conditional-expect`;
  - anything else a typed rule finds, fixed or listed in step 4.
- New: `.claude/rules/web.md`, `.claude/rules/server.md`, `CLAUDE.md`.
- [corpus/CLAUDE.md](../../CLAUDE.md): its Hard rules and brief-board sections move out.
- `scripts/conventions.json` (new, brief 15's exceptions file), if an exception is needed.
- Corpus:
  - [wiki/decisions.md](../../wiki/decisions.md): a new entry;
  - [wiki/status.md](../../wiki/status.md);
  - [log.md](../../log.md);
  - `.planned-roots`: drop `.claude` once it exists.

## Files you must NOT touch

- Behaviour. Apart from the fixes listed above, every change is formatting or configuration.
- `server/vendor/` and `web/vendor/`. They are generated copies of the Ward library, and both are ignored by ESLint, Prettier and knip.
- `cli/src/guide.md`: Prettier skips it, and it is what `brief-board guide` prints.
- `infrastructure/Dockerfile`: vendoring needs no `git` in the image.
- The layout of `server/src` and the CSS, which are briefs 19 and 18.
- The skills library and the `house-style` repo. A rule that seems wrong for brief-board is reported back, not patched locally.

## What to do

One commit per step, each with `npm run typecheck`, `npm test`, `npm run lint` and `npm run build` green.

1. **Vendor `house-style`, then measure.** Copy `house-style` with its version header and add the `house-style:sync` script, which finds the checkout by name; commit that alone. Then, on a scratch copy and never in the repo, re-run the measurements above with the owner's Node 24 and the repo's TypeScript 6.0.3, and record in the `log.md` entry:
   - the six typed rules' counts, and `projectService` against `project` lint time;
   - knip's findings with the vendored `house-style` preset;
   - the `tsc` counts with the two new flags;
   - `@vitest/eslint-plugin` recommended's count;
   - the churn at the chosen width.

   Any rule that finds more than about 20 real problems, or mostly false ones, goes back to the owner before it is turned on (brief 27's rule: bring it, don't loosen it). `no-non-null-assertion` is the known one; decision 7 makes it a warning in tests.
2. **Prettier, and the reformat.**
   1. Add `prettier` (pinned) and the config: `printWidth: 120`, `trailingComma: "all"`, and the rest default.
   2. Add `.prettierignore`:
      - `*.md`;
      - `web/src/styles.css` (decision 4);
      - `server/vendor/` and `web/vendor/`;
      - `package-lock.json`;
      - `dist/`, `data/`, `coverage/`.
   3. Add `"format": "prettier --write ."` and `"format:check": "prettier --check ."`, and commit this alone.
   4. Run `npm run format` and commit only that, as `style: format with Prettier`. Run it when no other brief has uncommitted work.
   5. Add that commit's full hash to `.git-blame-ignore-revs`, in its own commit.
   6. Hand the owner the one-time `git config blame.ignoreRevsFile .git-blame-ignore-revs`.
3. **tsconfig.** Add `verbatimModuleSyntax` and `erasableSyntaxOnly` to `tsconfig.base.json`, and `"pretest": "tsc -b shared"` to the root `package.json`.
   - Fix the nine parameter properties with a declared field assigned in the constructor. Behaviour, `readonly` and the error classes' `name` stay. `Store` is rewritten by brief 19, so its three get the smallest change.
   - Expect `verbatimModuleSyntax` to report nothing; confirm it.
   - Add `"incremental": true` and a `tsBuildInfoFile` under `node_modules/.tmp/` to `web/tsconfig.json`, so the web typecheck is fast on a second run.
   - `docker build` of `infrastructure/Dockerfile` must still build (`npx tsc -b server`).
4. **ESLint.** Extend the vendored house config (decision 1), passing brief-board's roots:
   - web is `web/src`;
   - server is `server/src`;
   - the CLIs and scripts are `cli/src/index.ts`, `server/src/index.ts` (later `server.ts`), `server/src/seed.ts` and `scripts/*.ts`.

   The diff in effect, against today's config:

   | Rule | Today | After | Findings today |
   |---|---|---|---|
   | the six typed rules | off | error, through `projectService` | 5 (`usePolling.ts:43`, the four switches) |
   | `switch-exhaustiveness-check` option `considerDefaultExhaustiveForUnions` | | `true` | clears the four |
   | `no-non-null-assertion` | off | error in source, warn in tests (Q47) | 65: 30 in source, 35 in tests (fix them all) |
   | `no-restricted-syntax` on `TSEnumDeclaration` | off | error | 0 |
   | `no-warning-comments` (`todo`, `fixme`), pointing at `corpus/todos/` | off | error | 0 |
   | `no-console` outside decision 7's files | off | error | 0 (all 9 calls are in those files) |
   | `no-default-export` (from `eslint-plugin-import-x`) outside `*.config.*` | off | error | 0 |
   | `no-process-env` (from `eslint-plugin-n`) on `server/src` outside `config.ts` and tests | off | **warn**; brief 19 makes it an error | 4 |
   | `@vitest/eslint-plugin` recommended on `*.test.{ts,tsx}` | off | error | 4 (fix them) |
   | `no-explicit-any`, `ban-ts-comment` | error (recommended) | unchanged | 0 |
   | `react-hooks` recommended on `web/src` | on | unchanged | 0 |
   | `better-tailwindcss` | absent | brief 18 adds it | |

   Typed linting needs `allowDefaultProject` for the files no tsconfig includes: `vitest.config.ts`, `eslint.config.js` and `scripts/*.ts`. `web/vite.config.ts` is in `web/tsconfig.json`. Fix what the typed rules find, or list each finding left, with its reason, in the outcome note.

   Fix the 65 `!` in two commits, production code first (30, errors), then tests (35, warnings under Q47, fixed where a narrowing is one line and otherwise listed), by narrowing: a check, a destructure with a guard, or `at()`. No assertion replaces another.
5. **knip and the gate.** Add `knip.json` with the workspaces and entries from the measurement above, and `scripts/seed-demo.ts` as an entry. In the root `package.json`:
   - `check` runs:
     - `typecheck`;
     - `lint`;
     - `format:check`;
     - `check:conventions`;
     - `test`.

     `check:conventions` is knip (`--include files,dependencies` strict, `exports` as a warning: the 21 above are warnings to clear later, not here) plus the two convention checkers from the vendored `house-style` copy. `check-base-ui` runs `--warn-only` until brief 18 is done, and `check-structure` `--warn-only` until brief 19 is done. dependency-cruiser joins in brief 19, where the layout it checks appears.
   - `check:fast` runs `typecheck`, then ESLint on the files changed against `HEAD` plus untracked ones (`*.ts`, `*.tsx`, `*.js`, `*.mjs` that exist). Use the vendored copy's script for the changed-file list if it ships one, or a small Node script in `scripts/`. No shell-only syntax: the owner works on Windows under WSL.
   - `lint` stays `eslint .`.

   Time `check:fast` warm with one changed file, and `check` in full. Record both.
6. **`.claude/rules/`.** Keep each file under about 40 lines. Each carries the rules an agent must hold while editing there, and points at the skill for the rest.
   - **`web.md`** (`paths: ["web/src/**"]`):
     - read the `base-ui` skill, and for UI work [wiki/board-ui.md](../../wiki/board-ui.md);
     - the board is read-only ([wiki/decisions.md](../../wiki/decisions.md), "The UI is read-only"): no control that writes to the API;
     - Base UI stays in the two files that use it until brief 17 moves it behind `web/src/components/ui/` wrappers; a trigger around a component uses `render`;
     - native controls that are already accessible, such as the tag filter's `<select>`, stay native ([wiki/decisions.md](../../wiki/decisions.md), "Base UI for the UI's widgets, styled by our own CSS");
     - Light / Dark / System, light on a first visit (brief 18 builds the switch); colours come from tokens, which switch with the theme;
     - words in the UI follow [wiki/glossary.md](../../wiki/glossary.md) ("ticket" in copy, "card" only for its drawing, "lane");
     - tests render to static markup (`renderToStaticMarkup`), so assert on roles and text.

     Brief 18 adds the Tailwind lines.
   - **`server.md`** (`paths: ["server/src/**", "shared/src/**"]`):
     - read the `code-structure` skill, and [wiki/architecture.md](../../wiki/architecture.md) and [wiki/sync.md](../../wiki/sync.md);
     - the contract is `shared/src/api.ts`, and the server sends nothing beyond it;
     - the error body is `{ code, message }`, flat, which the CLI and the board both parse;
     - the guard is the vendored `wardAuth` plugin, registered before any route, and `server/vendor/` is generated, so never edit it;
     - a ticket in Backlog belongs to sync: refuse writes on it with `sync_owned`;
     - `Store` is the only code that reads or writes ticket rows, and a write that touches more than one row runs in a transaction;
     - tests build the app with `buildApp({ dbPath: ":memory:" })` and `inject()`.

     Brief 19 adds the structure lines.
7. **`CLAUDE.md`** at the root, under about 60 lines:
   - one line on what brief-board is;
   - "read [corpus/index.md](../../index.md) first";
   - the commands:
     - `npm run dev`;
     - `npm run check` before every hand-back;
     - `npm run check:fast`;
     - one test with `npx vitest run <file>`;
     - `npm run seed -w @brief-board/server`;
   - the places that mislead:
     - `shared` is consumed through `shared/dist`, which `pretest` and `dev` build;
     - the typecheck is two runs;
     - `.env` sits at the repo root, the API on 8806 and Vite on 5178;
     - `scripts/seed-demo.ts` sends no token and gets a 401 ([wiki/status.md](../../wiki/status.md), "Open"), so seed a scratch board with `brief-board sync` instead ([docs/images/shots.md](../../../docs/images/shots.md));
   - the moved Hard rules and brief-board sections.

   [corpus/CLAUDE.md](../../CLAUDE.md) keeps everything else: layout, retrieval budget, frontmatter, briefs, source of truth, decisions and glossary, writing.

   There is no "Conventions" section. Brief 15 first planned one, and brief 27 replaced it with `.claude/rules/`.
8. **Corpus.**
   - Add the [wiki/decisions.md](../../wiki/decisions.md) entry "The house style, formatted and checked", with the width (120), the vendored config source, what was rejected and why.
   - Update [wiki/status.md](../../wiki/status.md) and [log.md](../../log.md).
   - Drop `.claude` from `.planned-roots` once it exists.
   - Run `bash corpus/lint.sh` until it is clean.

## Acceptance

- [ ] `npm run check` passes. Its run time and `check:fast`'s, warm with one changed file, are in the outcome note, and `check:fast` is under about 15 s or the owner has accepted the time.
- [ ] `npx prettier --check .` passes. The reformat is one commit that changes whitespace only (`git diff -w <hash>^ <hash>` shows nothing outside the reformat), and its hash is in `.git-blame-ignore-revs`.
- [ ] `tsconfig.base.json` has `verbatimModuleSyntax` and `erasableSyntaxOnly`. `npm run typecheck` and `docker build -f infrastructure/Dockerfile .` pass.
- [ ] `rm -rf shared/dist && npm test` passes: `pretest` builds `shared`.
- [ ] ESLint reports zero errors with every rule in step 4's table, including `no-non-null-assertion` (the 30 in source fixed; the 35 in tests fixed or each one left listed in the outcome note). The counts before and after are in the outcome note, and so is every finding left with its reason.
- [ ] A deliberate `enum`, `!`, `console.log` in `server/src/app.ts`, `// TODO` and `export default` each fail `npm run lint`. Revert them after.
- [ ] `.claude/rules/web.md` and `server.md` exist with `paths:` frontmatter. The root `CLAUDE.md` is under about 60 lines and lists `npm run check`.
- [ ] With the plugin's hooks on, an agent's edit is formatted on save, and a type error stops it at `Stop`.
- [ ] `bash corpus/lint.sh` ends clean.

## Interplay

- Brief 17 adds nothing to the gate. Brief 18 adds `better-tailwindcss`, deletes the `web/src/styles.css` line from `.prettierignore` and drops `check-base-ui`'s `--warn-only`. Brief 19 adds dependency-cruiser, drops `check-structure`'s `--warn-only`, and turns `no-process-env` (from `eslint-plugin-n`) into an error.
- The 21 unused exports knip reports are not this brief's work. Several (`COMMON_OPTIONS`, `slugWords`, `frontmatter`) may be exported for tests that knip counts as entries, so each needs a look before it is un-exported or deleted.
