# Task 19: The server in the house code structure

**Depends on:**

- In brief-board: brief 16, for the gate, `no-process-env` (from `eslint-plugin-n`, a warning until this brief) and `.claude/rules/server.md`.
- In the owner's skills library:
  - brief 03, *A code-structure skill for the Fastify + React apps*: rules 1-11, the `server-skeleton.md` reference, `zod-type-provider.md`, `migrating-a-server.md`, `check-structure.mjs`, and the dependency-cruiser and knip presets;
  - brief 16, *The Fastify servers adopt the code structure*: the-board's row (flat, `store.ts` 685 lines, "split `store.ts` by feature", which the owner declined: Q54 keeps it whole) and the method;
  - brief 15, *Enforce the base-ui and code-structure skills in every repo*: `check-structure` runs `--warn-only` until this brief is done.
- The owner's grilling of 2026-11-10:
  - Q1 (how services start: the Dockerfile's `CMD`);
  - Q23 (`server/src/features/`), Q24 (plugin options, explicit registration), Q25 (response schemas everywhere), Q27 (the test runner);
  - Q43 (the error handler), Q53 (streams exempt), Q54 (the store), Q55 (where a schema lives), Q56 (one error class, no decorator seam).

**Order:** after 16. It touches no file that 17 or 18 touch except `package-lock.json`, so it may run before them, but never at the same time as either.

**Before you start:** run `brief-board guide` ([corpus/CLAUDE.md](../../CLAUDE.md)).

## Context

The owner asked on 2026-11-09 for one researched code structure, enforced in every repo. brief-board's server is the smallest layout the estate has: eleven flat files in `server/src/`. It is already near the target in two ways:

- `buildApp(options)` in `server/src/app.ts` never listens, and `server/src/index.ts` does;
- `server/src/config.ts` parses the environment once with zod, and `shared/src/api.ts` already holds **a response schema for every route** (16 `*ResponseSchema`s).

What is missing:

- the `server.ts` name, and two stray readers of the environment;
- feature folders: `app.ts` is 539 lines with all 16 routes in it, and `app.test.ts` is 1,336 (`store.ts`, 685 lines, stays whole in `db/`);
- route schemas wired in: today 13 handler calls of a local `parse()` plus `keyOf()` do the validation by hand, and nothing validates or filters a reply;
- `fastify-plugin` on the cross-cutting parts, `close-with-grace`, timeouts and `trustProxy`.

### The versions (verified 2026-11-10)

- **zod 4.5.4**, pinned in `shared/package.json` and `server/package.json`. The root lockfile also holds **zod 4.6.5**, hoisted for `eslint-plugin-react-hooks` (range `^3.25.0 || ^4.0.0`). `infrastructure/Dockerfile` says so in a comment (`infrastructure/Dockerfile:85-87`).
- **fastify 5.12.7** (latest 5.12.8; the provider needs `^5.5.0`), `@fastify/static` 10.1.10.
- **`@fastify/type-provider-zod` 1.0.3** needs zod `>=4.2.0`, and declares `@fastify/swagger >=9.5.1` and `openapi-types ^12.1.3` as required peers. `fastify-plugin` 6.0.1, `close-with-grace` 2.5.0.
- **A second zod copy, measured.** On a scratch install of the server's production dependencies (`npm ci --omit=dev -w @brief-board/server --include-workspace-root`, then the five new packages), the provider resolves **zod 4.6.5 at the root** while the schemas are built by 4.5.4 in `server/` and `shared/`. Two copies of zod meeting in one reply is what the provider's `instanceof` and registry checks assume never happens. The install grew from 57,904 kB to 69,192 kB (9 packages).
- **The fix, measured.** zod 4.6.7 (the latest on 2026-11-10) in `shared` and `server`, plus `"zod": "4.6.7"` in the root `overrides` (which already holds `shell-quote`), gives **one copy**, at the root. The same change closes the open `npm audit` high on zod below 4.6.6 (GHSA-mrhx-c7xc-m3w5; [wiki/status.md](../../wiki/status.md), "Open"). See decision 3.

### A trap in the shared schemas: checked, and clear

The provider's serializer throws on any zod `.transform()` in a response schema (reproduced on 4.5.4 for the Almanac brief: "Encountered unidirectional transform during encode"). `shared/src/key.ts:39` (`keySchema`) and `:84` (`ticketKeySchema`) are transforms. Walking every exported schema's definition tree on 2026-11-10 (the `_zod.def` of each, looking for `transform`, `pipe`, `default`, `prefault`, `catch`):

- **None of the 16 `*ResponseSchema`s and none of the schemas nested in them has one.**
- The hits are all input schemas: `ticketParamsSchema` and `questionParamsSchema` (the key transform), `boardQuerySchema` and `doneQuerySchema` (`.default`), `upsertTicketRequestSchema` (`.default([])` on `tags`). Decoding through these is fine.

So no transform-free output shape is needed. A test keeps it that way (step 5): encoding each response schema's sample must not throw.

### The move map: every file under `server/src/` (11: 8 source, 3 tests)

| Today | Lines | Target | Note |
|---|---|---|---|
| `index.ts` | 71 | `server.ts` | The entry: config → `buildApp` → `listen`, `close-with-grace` in place of the two signal handlers (`index.ts:54-65`). The `.env` read (`index.ts:21-26`) and the database-path rule (`index.ts:36`) move to `config.ts`. |
| `app.ts` | 539 | `app.ts` | Keeps `buildApp`, `AppOptions`, `API_PREFIX`, `BOARD_PATH`, `SESSION_COOKIE`, `stripApiPrefix`. The guard (`app.ts:197-258`: `wardAuth`, `isPublic`, `validateSession`, the 401 `onSend` rewrite) moves to `server/src/plugins/auth/index.ts`; the error handler (185-191) and `fail`/`parse`/`keyOf` (160-176, 297-303) to `server/src/plugins/errors.ts`; the 16 routes to features; the static files, the `/` redirect and the 404 handler (524-538) stay. `cli/src/cli.test.ts:19` imports `server/src/app.ts` by URL and calls `buildApp({ dbPath, token, now })`, so the path and that call stay. |
| `app.test.ts` | 1,336 | one test file per feature, and `plugins/` | 89 `it`s in 16 `describe`s, with one shared set of helpers (`call`, `put`, `move`, `ticketIn`, `sync`…, lines 29-99). The helpers move to `server/src/testing/buildTestApp.ts`; each `describe` goes to its feature (below). |
| `config.ts`, `config.test.ts` | 153, 53 | the same | Gains `loadEnvFile()` (from `index.ts:21-26` and `seed.ts:28-33`), `resolveDbPath()` (`index.ts:36`, `seed.ts:68-69`) and `loadSeedConfig()` (`seed.ts:61-62`). `loadConfig(env)` gets `env = process.env` as its default. `config.ts` imports `DEFAULT_STALE_HOURS` from `store.ts` (line 3): it moves to `config.ts`, which is where the setting lives. |
| `accounts.ts` | 29 | `server/src/plugins/auth/accounts.ts` | `openAccounts`, `seedUser`, `USER_ROLE`. `seed.ts` and one test import it. The guard goes to `server/src/plugins/auth/index.ts` beside it. |
| `db.ts`, `db.test.ts` | 198, 116 | the same | Opens the database and runs the `user_version` migrations; no feature owns it. |
| `store.ts` | 685 | `server/src/db/store.ts` | **Decision 2.** The `Store` class stays whole, as the data layer beside `db.ts`. Its three parameter properties (`store.ts:104, 106, 108`) are brief 16's fix and stay fixed. Rule 11's 400-line warning stays on this file (Q54). |
| `sync.ts` | 233 | `server/src/features/sync/service.ts`, plus `routes.ts` | `runSync(store, request)`; it keeps calling the one `Store`. |
| `seed.ts` | 82 | the same, at the `src/` root | A CLI: the container runs `node server/dist/seed.js` (`docs/owner-setup.md:136`). Its environment reads move to `config.ts`. |
| (new) | | `server/src/testing/buildTestApp.ts` | Skill name; there is no helper today (six tests call `buildApp` inline: `app.test.ts:39, 495, 1168, 1218, 1232, 1255`). |

**The features are route groups over the one `Store`** (each method's `this.` calls, measured with the TypeScript parser on 2026-11-10, say which store methods a feature's routes use). Line ranges are in `server/src/store.ts`:

| Feature | Store methods its routes use (lines) | Routes | Imports |
|---|---|---|---|
| `runs` | runs, holds and the run lifecycle: `toRun` … `endRun` (283-414, about 130 lines) | `GET /api/runs`, `POST …/hold`, `POST …/drop` | `server/src/db/store.ts` |
| `tickets` | `tags`, `toTicket`, `getTicket` … `history` (115-142, 416-533); `move`, `start`, `release` (540-633) | `GET` and `PUT /api/tickets/:key`, `POST …/moves`, `…/start`, `…/release`, `…/comments` | `server/src/db/store.ts` |
| `questions` | `toQuestion`, `questions`, `openQuestions`, `ask`, `answer` (144-173, 239-281) | `GET /api/questions`, `POST …/questions/:number/answer` | `server/src/db/store.ts` |
| `board` | `needs`, `board`, `olderDone`, `doneCutoff` (182-236, 640-684) | `GET /api/board`, `/api/done`, `/api/needs` | `server/src/db/store.ts` |
| `sync` | `runSync` (`sync.ts`, which becomes the feature's `service.ts`) | `POST /api/sync` | `server/src/db/store.ts` |
| `health` | | `GET /api/health` | |

Because the store stays whole (Q54), no feature imports another: each imports `server/src/db/store.ts` and `shared/`, so there is no cross-feature import and no module cycle for dependency-cruiser's `no-circular` to find. A feature's `index.ts` exports its plugin, which `app.ts` registers.

### Every reader of the environment

| Where | What | Afterwards |
|---|---|---|
| `config.ts:133` | `loadConfig(env)` | stays, with `env = process.env`: the one reader |
| `index.ts:29` | `loadConfig(process.env)` | `server.ts` calls `loadConfig()` |
| `index.ts:21-26`, and `seed.ts:28-33`'s copy | `process.loadEnvFile(<repo>/.env)` | `loadEnvFile()` in `config.ts` |
| `seed.ts:61` | `SEED_USERNAME` | `loadSeedConfig()` in `config.ts` |
| `seed.ts:62` | `SEED_PASSWORD` | the same |
| `seed.ts:68` | `BRIEF_BOARD_DB`, with its own copy of the default path (69) | `resolveDbPath()`, one rule shared with the server (`index.ts:36`) |
| `config.test.ts` | passes an `env` object | unchanged: it never touches `process.env` |
| outside `server/` | `cli/src/index.ts:13`, `scripts/seed-demo.ts:16`, `web/vite.config.ts:46` | out of scope: the CLI's entry, a doc script and a build config |

`REPO_ROOT` is computed twice (`index.ts:19`, `seed.ts:26`) from `import.meta.url`, which resolves the same from `src/` and `dist/`. It moves to `config.ts`, which stays at the root of `src/`. No file reads `NODE_ENV`; the Dockerfile sets `NODE_ENV=production` for Fastify's dependencies.

### Every route: 16, by feature, each with its schemas from `shared/`

The vendored `wardAuth` plugin's `/auth/*` routes are generated code and out of scope, as are `GET /` (the redirect) and the static files.

| Feature | Method and path (`app.ts` line) | params | querystring | body | response |
|---|---|---|---|---|---|
| health | `GET /api/health` (261) | | | | `200`: `healthResponseSchema` |
| board | `GET /api/board` (263) | | `boardQuerySchema` | | `200`: `boardResponseSchema` |
| | `GET /api/done` (270) | | `doneQuerySchema` | | `200`: `doneResponseSchema` |
| | `GET /api/needs` (282) | | `needsQuerySchema` | | `200`: `needsResponseSchema` |
| runs | `GET /api/runs` (277) | | | | `200`: `runsResponseSchema` |
| | `POST /api/tickets/:key/hold` (447) | `ticketParamsSchema` | | `holdRequestSchema` | `200`: `holdResponseSchema` |
| | `POST /api/tickets/:key/drop` (461) | `ticketParamsSchema` | | `holdRequestSchema` | `200`: `dropResponseSchema` |
| questions | `GET /api/questions` (289) | | `questionsQuerySchema` | | `200`: `questionsResponseSchema` |
| | `POST /api/tickets/:key/questions/:number/answer` (496) | `questionParamsSchema` | | `answerRequestSchema` | `200`: `answerResponseSchema` |
| tickets | `GET /api/tickets/:key` (339) | `ticketParamsSchema` | | | `200`: `ticketDetailResponseSchema` |
| | `PUT /api/tickets/:key` (354) | `ticketParamsSchema` | | `upsertTicketRequestSchema` | `200` and `201`: `upsertTicketResponseSchema` |
| | `POST /api/tickets/:key/moves` (393) | `ticketParamsSchema` | | `moveRequestSchema` | `200`: `moveResponseSchema` |
| | `POST /api/tickets/:key/start` (406) | `ticketParamsSchema` | | `startRequestSchema` | `200`: `startResponseSchema` |
| | `POST /api/tickets/:key/release` (425) | `ticketParamsSchema` | | `releaseRequestSchema` | `200`: `releaseResponseSchema` |
| | `POST /api/tickets/:key/comments` (479) | `ticketParamsSchema` | | `commentRequestSchema` | `201`: `commentResponseSchema` |
| sync | `POST /api/sync` (514, `bodyLimit` 10 MB, stays a route option) | | | `syncRequestSchema` | `200`: `syncResponseSchema` |

**Hand validation removed:** 13 `parse(schema, request.…)` calls (`app.ts:264, 271, 283, 290, 357, 396, 409, 428, 450, 464, 482, 502, 515`), `keyOf()`'s `ticketParamsSchema.safeParse` (298, called from 8 routes: 340, 355, 394, 407, 426, 448, 462, 480) and `questionParamsSchema.safeParse` (497). `JSON.parse` at `app.ts:244` reads a response body in the 401 hook, not request input, and stays.

**Error replies stay as they are** (`notFound`, `refused`, `syncOwned`, `noRunToHold`, 14 `fail(reply, …)` calls): no schema is declared for 4xx statuses, so they serialize as today.

### The error plugin

brief-board's error body is **flat**, `{ code, message, allowed? }` (`errorBodySchema`, `shared/src/api.ts:179-184`), and the CLI and the board both parse it. It stays (decision 4). The new `server/src/plugins/errors.ts`, wrapped in `fastify-plugin` and registered first, handles in this order:

1. A validation error from the provider (`hasZodFastifySchemaValidationErrors`) → 400, with the code **by what failed**, as today:
   - `params` → `invalid_key`, with today's two messages: "a ticket key is `<project>-<number>`, like atrium-03, or `<project>:<todo>` for a todo's" (`app.ts:299`) and "answer a question as `/api/tickets/<key>/questions/<number>/answer`" (`:499`);
   - `body` and `querystring` → `invalid_request`, with the message as `parse()` builds it: the first issue's path joined with `.` (or `request`), a colon, the issue's message (`app.ts:168-171`).

   The codes are asserted: `app.test.ts:158-162, 283, 445, 639-640, 751-752, 962`. Fastify validates params first, then body, then querystring, which is the order the handlers use today, so a bad key still wins over a bad body.
2. A 4xx Fastify raised itself (bad JSON, wrong content type) → its status and `invalid_request`, as `app.ts:185-191` does.
3. `isResponseSerializationError(error)` → 500 `internal`, logged with the method and URL, never shown.
4. Anything else → 500 `internal`, "the board hit an error; see its log", logged. Unchanged.

The 404 handler stays in `app.ts`.

### The `server.ts` / `app.ts` split, and the entry file

`server.ts`:

1. `loadEnvFile()` and `loadConfig()`. A `ConfigError` goes to stderr and the process exits 1, before any logger exists (as `index.ts:27-35` does).
2. `buildApp({ …, logger: true, server: { connectionTimeout, requestTimeout, keepAliveTimeout, trustProxy } })`. `AppOptions` gains `server`, passed to `Fastify()`. `rewriteUrl` stays.
3. `close-with-grace`, in place of the two signal handlers.
4. `listen({ host, port })`.

`app.ts` registers in a fixed order: the errors plugin; the provider's compilers (`setValidatorCompiler`, `setSerializerCompiler`); `server/src/plugins/auth` (the guard, still before every route); then the features in the table's order, with `health` first; then the static files, the redirect and the 404 handler.

**Renaming the entry moves the built file** from `server/dist/index.js` to `server/dist/server.js`. These name it in this repo:

- `infrastructure/Dockerfile:115`: `CMD ["node", "server/dist/index.js"]`;
- the root `package.json:19`: `start`;
- `server/package.json`: `main` (line 7), `dev` (`tsx watch src/index.ts`, line 10), `start` (line 11).

`server/package.json` has no `exports`, and nothing imports `@brief-board/server`. The container starts that file path, so the `CMD` is the one place that names it (Q1; decision 5).

### What the tests do now

- 3 server test files: `app.test.ts` (89 `it`s), `config.test.ts` (6), `db.test.ts` (2). All 283 tests run with vitest `pool: "forks"` over `*/src/**/*.test.{ts,tsx}`, which still matches nested folders.
- `cli/src/cli.test.ts` (697 lines) drives a real server through `buildApp` imported by URL.
- `app.test.ts`'s `describe`s, and where they go:

  | `describe` (line, `it`s) | Goes to |
  |---|---|
  | moves through the route (100, 1), tickets (172, 2), todos and Backlog (872, 7), blocked briefs and todos (966, 13) | `server/src/features/tickets/` |
  | runs (366, 14), holds (563, 7) | `server/src/features/runs/` |
  | questions (686, 7) | `server/src/features/questions/` |
  | the board (203, 3), older Done (228, 5), what needs the owner (797, 4) | `server/src/features/board/` |
  | sync (288, 8) | `server/src/features/sync/` |
  | error bodies (136, 4) | `server/src/plugins/errors.test.ts` |
  | the CLI's token (1209, 3), signing in (1265, 6) | `server/src/plugins/auth.test.ts` |
  | the API prefix (1192, 2), serving the board (1162, 1) | `app.test.ts`, which stays |

- New tests:
  - every `*ResponseSchema` encodes a sample reply without throwing (the trap above);
  - an extra field on a store row is stripped from a reply;
  - a reply that fails its response schema is a 500 `internal` with no detail;
  - the health route.

## Owner decisions (defaults this brief builds)

1. **`server/src/features/<name>/`** (Q23, Q24, Q25, decided 2026-11-10, technical calls). Yes, as in the tables above, with typed plugin options and a response schema on every route. Streams and binary routes would be exempt (Q53); this server has none.
2. **The store stays whole** (Q54, decided 2026-11-10, technical call). `Store` stays one class in `server/src/db/store.ts`, with the tickets, runs, questions and board methods together. The features are route groups over it, so the mutual `tickets`, `questions` and `runs` imports a split would have needed never arise. Folding or carving the store is not in this brief.
3. **zod 4.6.7 and one copy.** Default: bump `shared` and `server` to 4.6.7, pinned, and add the root `overrides` entry. It is the only way found to avoid the provider resolving a second copy, and it closes the open audit high. The Dockerfile's comment about the two copies is rewritten in the same commit. If the owner declines the bump, the provider's copy must be pinned equal to `shared`'s, by another route.
4. **The error handler** (Q43, decided 2026-11-10, technical call). One handler, keeping brief-board's flat body `{ code, message, allowed? }`, which its CLI and its board both parse. It passes Fastify's own 4xx through and never echoes a thrown message to the client. One error class stays (Q56).
5. **The entry file and the deploy** (Q1, fact). Services run in a container built from `infrastructure/Dockerfile`, which starts a file path. Rename to `server.ts`, and change the Dockerfile's `CMD`, the scripts and `main` in the same commit. The repo owns that file, and the build runs `npm ci` and `tsc -b` only, so there is no vps-deploy edit and the deploy is left alone.
6. **The test runner** (Q27, decided 2026-11-10, technical call). vitest stays, and `inject()` tests stay (the tests already use them).
7. **The accounts decorator goes** (Q56, decided 2026-11-10, technical call). `app.decorate("accounts", …)` and its `declare module "fastify"` (`app.ts:121-125, 198`) exist for one test (`app.test.ts:1268`), and decorators are not a test seam. `buildApp` takes its accounts through its options, and `buildTestApp` returns them to the test. The guard reads them from the plugin's options.
8. **The test helper's name.** `server/src/testing/buildTestApp.ts`, the skill's name, since there is no helper to rename. It builds and closes the app per test with the fixed token and clock the current tests use.
9. **Timeouts and proxy.** Defaults:
   - `connectionTimeout: 10_000`;
   - `requestTimeout: 30_000`; the longest route is `POST /api/sync`, one transaction over every project;
   - `keepAliveTimeout: 125_000`, above Caddy's default two-minute idle keep-alive to its upstreams, so the API never closes a connection Caddy is about to reuse. The Caddy snippet lives in vps-deploy, so check it for its own `keepalive`;
   - `trustProxy`: loopback plus `AUTH_TRUSTED_PROXIES`, one list, so `request.ip` in logs is the client. Ward's login lockout reads the socket itself (`server/vendor/ward/ward-auth.js:5048`), so this doesn't change it. Today `trustProxy` is unset.
10. **Logging.** Default: JSON as today, no `pino-pretty`.
11. **Fastify 5.12.8.** Default: not in this brief.

## Files you OWN

- `server/src/**`: the moves, the new plugins, the schemas wired in.
- `server/package.json` (scripts, `main`, the new dependencies pinned: `@fastify/type-provider-zod` 1.0.3, `@fastify/swagger` 9.9.3, `openapi-types` 12.1.3, `fastify-plugin` 6.0.1, `close-with-grace` 2.5.0, and `zod`), `shared/package.json` (`zod`), the root `package.json` (`overrides`, `start`, `check:conventions`) and `package-lock.json`.
- `shared/src/**`, only to add a sample-encode test for the response schemas. No schema changes.
- `infrastructure/Dockerfile`: the `CMD` line and the zod comment.
- `.dependency-cruiser.cjs` (new, from the skill's preset).
  *Update 2026-11-11: it landed with brief 16, and dependency-cruiser is already in `check:conventions`, passing with no lowered rule. This brief keeps the cross-feature check and its deliberate-violation test.*
- `eslint.config.js`: `no-process-env` (from `eslint-plugin-n`), from warning to error.
- `scripts/conventions.json`, for the roots (`server/src`, `shared/src`) and any exception the checker needs.
- `.claude/rules/server.md`: the structure lines.
- `docs/architecture.md:16`: it names `server/src/app.ts`, `store.ts` and `sync.ts`.
- `docs/owner-setup.md:136` only if the seed's path changes (it doesn't).
- Corpus:
  - [wiki/architecture.md](../../wiki/architecture.md): lines 9-10 and 103-104, the layout;
  - [wiki/sign-in.md](../../wiki/sign-in.md): lines 15 and 61 (`app.ts`, `index.ts` and `seed.ts` load the environment);
  - [wiki/sync.md](../../wiki/sync.md): line 72 (`server/src/sync.ts`);
  - [wiki/decisions.md](../../wiki/decisions.md): below;
  - [wiki/status.md](../../wiki/status.md);
  - [log.md](../../log.md).

## Files you must NOT touch

- `web/` and `cli/`. A response schema that drops a field they read is a finding: fix the schema, not the client. `cli/src/cli.test.ts` imports `server/src/app.ts` by URL: that path and `buildApp`'s call shape stay.
- `shared/` schemas and their behaviour.
- `server/vendor/`: generated.
- The deploy beyond the Dockerfile's `CMD` line and the zod comment. There is no vps-deploy edit (decision 5).
- Behaviour: status codes, error codes and messages, and every route's JSON apart from fields the comparison shows were leaks.

## What to do

Follow `migrating-a-server.md`. One commit per step; after each, `npm run check` and `npm run build` pass, and `npm start` serves `GET /api/health`.

1. **Before.**
   - Run `check-structure` strict and record its counts by rule.
   - Make a scratch database the way [docs/images/shots.md](../../../docs/images/shots.md) does (a scratch `BRIEF_BOARD_DB`, a temporary projects folder, `brief-board sync` and a few moves) and add one ticket with open questions, one with a run and holds, one blocked brief and one todo.
   - Save the JSON of every route above, with the CLI's token (a `curl` loop is enough), with fixed query parameters and the server's clock fixed through a scratch copy of the database. Save the error replies of the cases the tests name (a bad key, a bad body, a missing ticket, a sync-owned ticket).
2. **zod, and the packages.** Set zod 4.6.7 in `shared` and `server`, add the root override, and rewrite the Dockerfile's comment. Add the five packages, pinned. Check `npm ls zod` shows one copy, `docker build -f infrastructure/Dockerfile .` passes, and the image still answers its health check.
3. **`config.ts` and the split.** The three new helpers in `config.ts`. `seed.ts` uses them. `index.ts` becomes `server.ts`, with the entry-file changes (decision 5), `close-with-grace`, the timeouts and `trustProxy`. `no-process-env` now finds nothing; make it an error.
4. **The error plugin, the auth plugin and the test helper.** `server/src/plugins/errors.ts`, `server/src/plugins/auth/index.ts` (wrapped in `fastify-plugin`, so `wardAuth` stays a root hook) and `server/src/testing/buildTestApp.ts`, with `app.test.ts` moved onto the helper. The accounts decorator goes here (decision 7): the one test that read it takes the accounts from the helper. Every test passes unchanged.
5. **Feature folders.** `git mv` and split, file by file per the tables, so history follows: move `store.ts` to `server/src/db/store.ts` first, then `runs`, `tickets`, `questions`, `board`, `sync`, `health`, one commit each. Add the `index.ts` files, and `.dependency-cruiser.cjs`; check that a deliberate import of `server/src/features/runs/routes.js` from `server/src/features/board/` fails it. Move each `describe` with its feature.
6. **The type provider and the schemas, one feature per commit:** health, board, runs, questions, tickets, sync. Each commit:
   - declares params, querystring, body and response from the table;
   - removes that feature's `parse()` and `keyOf()` calls;
   - types the plugin as `FastifyPluginAsyncZod<FeatureContext>`;
   - adds the new tests that apply.

   `FeatureContext` is new here (brief-board has none): the `Store`, the clock and the config a feature needs, built once in `app.ts`.
7. **After.** Save the same JSON again and diff it against step 1's. A field that disappeared is a leak (keep it dropped and list it) or a missing schema field (add it). Put the diff's summary in the `log.md` entry. Also run the CLI against the new server (`brief-board list`, `show`, `needs`, a `start` and a `move`) and the board in a browser.
8. **Strict.** Drop `check-structure`'s `--warn-only`. (Dependency-cruiser joined `check:conventions` in brief 16, 2026-11-11.)
9. **Corpus.**
   - In [wiki/decisions.md](../../wiki/decisions.md), add an entry adopting the structure, with what was rejected (the flat layout `store.ts` grew in, autoload, TypeBox) and why. If an earlier entry names the flat layout, revisit it by heading.
   - Update the pages listed under Files you OWN, `.claude/rules/server.md`, [wiki/status.md](../../wiki/status.md) and [log.md](../../log.md).
   - Run `bash corpus/lint.sh` until it is clean.

## Acceptance

- [ ] `check-structure` passes **strict**, with any exception in `scripts/conventions.json` and its reason. Its counts before and after are in the outcome note, for the skills library's brief 16 table.
- [ ] `grep -rnE "\bparse\(|keyOf\(|\.safeParse\(" server/src --include=*.ts | grep -v "\.test\.ts"` prints nothing outside `config.ts` and `server/src/plugins/errors.ts`, and every route in the table has a `schema` with a `response`.
- [ ] `grep -rn "process\.env" server/src --include=*.ts | grep -v "\.test\.ts"` prints only `config.ts`, and ESLint's `no-process-env` (from `eslint-plugin-n`) is an error.
- [ ] `npm ls zod` shows one copy, and `npm audit --omit=dev` no longer lists zod.
- [ ] The response-schema encode test, the stripped-field test, the serialization-500 test and the health test pass, along with every existing test, with no assertion changed apart from imports.
- [ ] The before and after JSON comparison is in `log.md`, with every dropped field named.
- [ ] `npm run build` writes `server/dist/server.js`. `docker build -f infrastructure/Dockerfile .` succeeds, and the container answers its health check.
- [ ] dependency-cruiser fails on a deliberate cross-feature import and passes clean. `grep -rn "decorate(" server/src` prints nothing, and `server/src/db/store.ts` holds the whole `Store`.
- [ ] `npm run check` passes, and `bash corpus/lint.sh` ends clean.

## Interplay

- Brief 16's fix to `Store`'s three parameter properties stays: the store is not rewritten here (decision 2).
- The skills library should hear about three findings before the other servers run its brief 16: the second zod copy the provider resolves when a dev tool hoists another version, the flat error body, and that `check-structure`'s table row for brief-board counted two environment readers where there are four reads in two files.

**Outcome (2026-11-11).** Built in six commits (`58ff576` to `d75b7a8`), not deployed.

- `check-structure` before: 41 errors and 3 warnings (rule 1: 1, rule 3: 4, rule 6: 36, rule 11: 3). After, strict:
  0 errors, 2 warnings (rule 11 on `server/src/db/store.ts` and `shared/src/api.ts`), and 1 finding accepted in
  `scripts/conventions.json` (`GET /`, the redirect). `npm audit --omit=dev` no longer lists zod; `npm ls zod` shows one copy.
- The server had 19 routes, not 16: brief 21 added `sprints` (three routes, a `sprints` feature of its own).
  `SprintClosedError` is answered by the errors plugin (409 `sprint_closed`).
- Refusals are an `ApiError` thrown from a handler (`server/src/lib/api-error.ts`), sent by the errors plugin; the three
  bad-params messages are a route's `config: { badParams }`. That kept the shared 4xx helpers out of the features.
- `buildApp` gained an optional `db` (an open database), which `buildTestApp` uses to give the test its accounts: that
  replaces the `accounts` decorator. `server/src/db.ts` stayed at the root of `src/`.
- Steps 5 and 6 (feature folders, then schemas) went in one commit: each feature was written once, with its schemas.
- Capture of 100 replies before and after: 94 identical, 4 differ in key order only (`moveResponseSchema` encodes
  `endedRun` before `questions`), 2 differ in text: a missing body says "received null", not "received undefined".
  No field was dropped. The CLI reads replies by field name and shows the error's `message` for a 400, so none changes.
- Not run: `docker build` and the container's health check (no docker here), and the Caddy `keepalive` check in vps-deploy.
