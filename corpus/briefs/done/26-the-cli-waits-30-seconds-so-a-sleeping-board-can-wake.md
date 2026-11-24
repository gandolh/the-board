# Brief 26: The CLI waits 30 seconds, so a sleeping board can wake

**Depends on:** nothing. **Runs after:** 25.
**Builder:** Sonnet.
**Before you start:** run `brief-board guide` (the repo's `CLAUDE.md` says so).

Filed 2026-11-24 from the estate's infra review. The owner's answer that day: the board may sleep. vps-deploy
stops a sleeping app after 15 minutes with no request and starts it on the next one (Sablier). Asleep, the API
frees about 50 MiB of the box's 3.7 GiB (`brief-board-api` used 49.6 MiB on 2026-11-24). What blocks it is the
CLI, and that is this brief; the `sleep` setting itself is vps-deploy's change, after this one.

## Context

- `cli/src/client.ts:35` gives every call 2 s (`TIMEOUT_MS = 2_000`, used at line 86). vps-deploy measured a
  Sablier cold start of 3.3 s for an app ready 2 s after starting (its memory page, 2026-11-05), so the first call
  after a sleep would fail as "the board isn't reachable" (exit 3), and the guide tells an agent to make no more
  board calls that session.
- How a sleeping route answers, from vps-deploy's code (read only): a route under a sub-path gets Sablier's
  `blocking` strategy unless it names another (vps-deploy's `sleepStrategy`, in its core synth module), which holds the
  request until the app is healthy, up to a minute, then passes it on. The `dynamic` strategy answers with a
  waiting HTML page instead; `client.ts` would read that as Unreachable (a non-JSON body) and a 5xx as "the board
  failed".
- The server has no timers (`grep setInterval|setTimeout server/src` finds none outside tests), so nothing in it
  minds being stopped.
- The CLI is on the owner's PATH through `npm link` from this repo's `cli/` (architecture.md), so a rebuilt
  `cli/dist` is live at once. Nothing deploys.

## Decisions

- The timeout becomes 30 s: ten times the measured cold start, well under Sablier's one-minute hold.
- `BoardClient` takes the timeout as an optional constructor argument, default 30 000 ms, so a test can pass a
  short one. No environment variable.
- No retry loop: with `blocking`, the first request is held until the board answers. If step 1 finds the route
  would be `dynamic`, stop and hand back instead.

## Files you OWN

- `cli/src/client.ts` and its tests (`cli/src/cli.test.ts` or a new `client.test.ts`)
- The CLI paragraph in `corpus/wiki/architecture.md` (the timeout and the reason)
- The closeout: the outcome note, `corpus/log.md`, `corpus/wiki/status.md`

## Files you must NOT touch

- The guide text (`brief-board guide`): an unreachable board still exits 3 and still means "carry on without it".
- `server/` and `infrastructure/`.
- vps-deploy: read only.

## What to do

1. **Confirm the route's strategy.** In vps-deploy, read the brief-board stack's route and `sleepStrategy`: a
   sub-path route with no strategy named is `blocking`. Write what you found in the outcome.
2. The timeout change and the constructor argument.
3. Tests: a server that answers after 300 ms passes with a 1 s timeout; one that never answers fails as
   Unreachable with a 200 ms timeout; the default is 30 000 ms.
4. Rebuild the CLI (`npm run build -w @brief-board/cli`) and run `brief-board list` against the live board once.

## Acceptance

- [ ] Step 1's finding is in the outcome.
- [ ] The tests above pass; `npm run check` exits 0; `bash corpus/lint.sh` passes.
- [ ] The rebuilt CLI reads the live board.
- [ ] End move `done`: nothing deploys.

## Owner steps

- None for this brief. The board sleeps once vps-deploy sets `sleep` on its stack, which comes after it.

## Outcome (2026-11-24)

Built as written by the controller, Done on the board (nothing deploys).

- Step 1: the CLI calls `/brief-board-api`, a sub-path route with no strategy named, so vps-deploy's
  `sleepStrategy` (in `lib/core/synth.ts`) gives it `blocking`: the first request is held until the board answers.
  No retry loop needed.
- `cli/src/client.ts`: `DEFAULT_TIMEOUT_MS = 30_000`, with the reason in its comment; `BoardClient` takes the
  timeout as an optional third argument. `runtime.ts` constructs it without one, so the CLI gets 30 s.
- `cli/src/client.test.ts` (3 tests): a board answering after 300 ms passes with 1 s; one that never answers is
  `Unreachable` with 200 ms; with no argument the request's signal is `AbortSignal.timeout(30_000)`.
- `corpus/wiki/architecture.md`: the exit-codes bullet names the 30 s and why.
- Checks: `npm run check` passed; `npm run build -w @brief-board/cli` rebuilt the linked CLI, and
  `brief-board list` read the live board.
