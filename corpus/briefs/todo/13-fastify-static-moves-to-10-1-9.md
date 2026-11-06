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
