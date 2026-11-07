# Task 13: @fastify/static moves to 10.1.9 or later

**Not before 2026-11-18.** An agent that picks this up earlier leaves it in
To Do and says so on the ticket.

## Context

Filed on 2026-11-06 with Wicket's brief of the same bump (Wicket's
`update-fastify-static` todo said brief-board pins the same version).
`npm audit` flags `glob` under `@fastify/static` 10.1.5
(GHSA-3g3m-2fjr-6pw4, moderate). The fix is 10.1.9, released 2026-11-04; the
owner chose to let it age until 2026-11-18 before taking it.

**Build it on main after the owner has deployed briefs 08-12's server and
rebuilt the local CLI**: `npm run typecheck` here rebuilds `cli/dist`, which
the global `brief-board` command runs. If that deploy hasn't happened, say
so on the ticket and wait.

## Files you OWN

- `server/package.json` (it pins `@fastify/static`) and the lockfile
- `corpus/wiki/status.md`, `corpus/log.md`

## What to do

1. Bump `@fastify/static` to the then-current 10.1.x (10.1.9 or later),
   pinned exactly, and `npm install`.
2. `npm audit`: the `glob` advisory is gone; note anything new.
3. The typecheck, lint and `npm test`; check the server still serves the
   built web page locally.
4. Commit, with the record.

## Acceptance

- `npm audit` no longer lists GHSA-3g3m-2fjr-6pw4; the tests pass.
- **Owner steps:** from vps-deploy, `node cli.ts brief-board deploy` and
  `node cli.ts brief-board server`.

## Outcome (2026-11-07)

Built on 2026-11-07, eleven days before the brief's date, at the owner's
explicit ask ("do the bump"). The deploy of briefs 08-12 had not happened
either; the build ran in a cloud session, so no local `cli/dist` changed.

- **`@fastify/static` 10.1.10**, pinned exactly in `server/package.json`:
  the then-current 10.1.x, released 2026-11-04 like 10.1.9, seven hours
  later. Neither is deprecated. The lockfile moves `glob` 13.0.6 to 14.0.4,
  `@fastify/send` 4.1.1 to 4.2.1 and `path-scurry` 2.0.2 to 3.0.0, and adds
  `@isaacs/nonrecursive-glob-match` 1.1.0 (created 2026-10-26, maintained by
  glob's author) and a nested `minimatch` 11.0.5 under `glob`.
- **`npm audit`**: GHSA-3g3m-2fjr-6pw4 is gone; 14 findings became 12. Not
  exposed before either: `app.ts` registers the plugin without
  `wildcard: false`, the only setting that walks files with `glob`.
- **New since the brief was filed, outside its files:** `zod` below 4.6.6,
  high (GHSA-mrhx-c7xc-m3w5, oversized constrained collections exhausting
  memory), direct in `shared` and `server`; `fast-uri`, moderate (four
  advisories, fixed in 3.1.9 and 4.2.3), under Fastify; `minimatch` below
  11.0.1, moderate (GHSA-g3hv-75wg-m249), through `eslint` and
  `typescript-eslint`, dev only. Not changed here.

Commits: aa9e921
Checks run: `npm run typecheck`, `npm run lint`, `npm test` (243 tests, 13 files); `npm run build`, then `npm start` on a scratch database: `/api/health` 200, `/brief-board/` serves the page, its JS asset 200 with `application/javascript` and the full 487 KB, an unknown path under the base gets the page (the not-found handler, unchanged).
Checks skipped: a browser walk of the board; the page is unchanged and only the server's static plugin moved.
Owner steps: from vps-deploy, `node cli.ts brief-board deploy` and `node cli.ts brief-board server`, with briefs 08-12's deploy (status.md, "Next (owner)" item 1).
