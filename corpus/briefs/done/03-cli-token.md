# Task 03: The CLI sends a token, and the server checks it

## Context

[architecture.md](../../wiki/architecture.md) ("How agents reach the board")
already planned the VPS move as changing the address in the user-level file
and adding a token there. Nothing checks a token yet. This brief adds one
shared secret. The server reads `BRIEF_BOARD_TOKEN`, and the CLI sends it as
`Authorization: Bearer <token>` on every request. Brief 04 puts the browser
behind sign-in and keeps this token as the CLI's way past the same guard.

There is one token and no per-agent tokens: every agent runs as the owner on
the owner's machine, and `--author` already names who wrote a comment.

This brief comes before the sign-in so the CLI works after every brief. With
no token configured the server behaves as it does today.

## Files you OWN

- `server/src/app.ts` (the check), `server/src/index.ts` (reading the
  variable), `server/src/app.test.ts`
- `shared/src/api.ts`, the new error code only
- `cli/src/context.ts`, `cli/src/client.ts`, `cli/src/main.ts` (the exit
  code), `cli/src/guide.md`, `cli/src/cli.test.ts`
- `README.md`, the owner-setup lines for the token only
- `corpus/wiki/architecture.md`, `corpus/wiki/decisions.md`

## Files you must NOT touch

`web/`, `cli/src/sync/`.

## What to do

1. **Server.** `buildApp` takes `token?: string`. When it is set, every
   `/api/*` request except `GET /api/health` needs `Authorization: Bearer
   <token>`. vps-deploy's health check calls that one route without a
   token. Compare SHA-256 digests with `crypto.timingSafeEqual`, so the
   token's length leaks nothing. A missing or wrong token gets a 401 in the
   error shape, with a new code `unauthorized`. `index.ts` reads
   `BRIEF_BOARD_TOKEN` and treats an empty value as unset. It refuses to
   start with a token shorter than 32 characters, which catches a
   placeholder. Make sure nothing logs the header.
2. **CLI lookup.** Read the token from `BRIEF_BOARD_TOKEN` in the
   environment, else from `~/.config/brief-board/env`. Never read it from a
   repo's `.env`: the address may come from there, but a secret shouldn't sit
   in every repo. `client.ts` sends the header on every request when a token
   is set.
3. **A refused token.** A 401 prints one line, for example "the board
   refused the token: set BRIEF_BOARD_TOKEN in ~/.config/brief-board/env",
   and exits 3, the same as an unreachable board. Agents then follow the
   guide's "board is down" section: tell the owner once and carry on. Add the
   401 case to the exit-code line in `guide.md`. The guide test keeps it
   under 80 lines.
4. **Server tests.** With no token configured, everything stays open. With
   one configured, test a missing, a wrong and the right header on a read, a
   write and `/api/sync`, and check that health stays open.
5. **CLI tests.** The header is sent when the token comes from the
   environment and from the user file. A token in a repo `.env` is ignored.
   A 401 exits 3 with the message.
6. **Docs.** `architecture.md`: the token lookup beside the address lookup.
   README owner setup: the optional `BRIEF_BOARD_TOKEN` in both places, made
   with `openssl rand -base64 32`.
7. **Decision.** Add a `decisions.md` entry, "The CLI authenticates with one
   shared token", dated 2026-11-02. Rejected: per-agent tokens, because every
   agent is the owner's; and the CLI signing in with a local account's
   password, which means a password in a file and a session to keep alive.

## Acceptance

- `npm run typecheck && npm run lint && npm run test && npm run build` pass.
- Start the server with a scratch database and a test token in the shell
  only, never in a file. The CLI with the same token in its environment can
  `list`. Without the token it exits 3 with the message.
- `bash corpus/lint.sh` passes.

## Outcome (2026-11-02)

Built in `98395b1`. `buildApp({ token })` adds an `onRequest` guard for
`/api/*` (after the prefix strip, so `/brief-board-api/api/*` is guarded
too) with `GET`/`HEAD /api/health` open. `bearerMatches` hashes both sides
and uses `timingSafeEqual`; a refusal is a 401 `unauthorized`
(`UNAUTHORIZED` in `shared/src/api.ts`). `index.ts` treats an empty
`BRIEF_BOARD_TOKEN` as unset, exits 1 on one under 32 characters, and logs
only whether a token is set. The CLI's `boardToken` reads the environment,
then `~/.config/brief-board/env`; `BoardClient` sends the header; a 401
throws `TokenRefused` (exit 3, one line). The guide's exit-code line and
section 7 name the refused token; it is 67 lines. `cli/src/runtime.ts`
changed by one line to hand the token to the client (outside the owned
files), and `docs/getting-started.md` got the variable and the CLI file
line beside the README's.

Checks: `npm run typecheck`, `npm run lint`, `npm run build`, and the server
and CLI tests (4 files, 83 tests; 3 new on the server, 5 in the CLI). The
web suite was not run; `web/` didn't change. By hand: a 5-character token
stopped the start with exit 1; with a token from `openssl rand -base64 32`
in the shell only, health answered bare, `brief-board list --all` with the
token in its environment exited 0, without it exited 3 with the message,
and the server log held neither the token nor an `authorization` line.
