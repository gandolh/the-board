# Task 01: Workspace scaffold

## Context

Greenfield. The repo holds only `corpus/`. Everything else waits on this
brief. The owner creates the git repo before any brief runs. Do not run
`git init`. If `git rev-parse --show-toplevel` fails, stop and tell the owner.

Read [architecture.md](../../wiki/architecture.md) for the four packages and
how the server runs, and [decisions.md](../../wiki/decisions.md) before
choosing anything that looks like it could go another way.

## Files you OWN

```
package.json  package-lock.json  .npmrc  .gitignore  README.md
tsconfig.base.json  tsconfig.json  eslint.config.js  vitest.config.ts
shared/package.json  shared/tsconfig.json  shared/src/index.ts  shared/src/index.test.ts
server/package.json  server/tsconfig.json  server/src/index.ts
web/package.json  web/tsconfig.json  web/vite.config.ts  web/index.html  web/src/main.tsx
cli/package.json  cli/tsconfig.json  cli/src/index.ts
```

## Files you must NOT touch

Anything under `corpus/`. Do not write the model, routes, commands or UI.
Briefs 02 to 07 own those.

## What to do

1. npm workspaces: `shared`, `server`, `web`, `cli`. Package names
   `@brief-board/shared`, `@brief-board/server`, `@brief-board/web`,
   `@brief-board/cli`. Pin exact versions (`save-exact=true` in `.npmrc`).
2. The house stack: Fastify and better-sqlite3 in `server`, zod in `shared`,
   Vite and React in `web`. Vitest everywhere. ESLint with typescript-eslint.
3. TypeScript strict, with `noUncheckedIndexedAccess`. Node 24 is installed.
   Compile `shared`, `server` and `cli` with `tsc -b` into each package's
   `dist/`. The CLI's `bin` entry (`brief-board`) points at
   `cli/dist/index.js` and must run with plain `node`, with no dev tools on
   PATH.
4. Placeholders only:
   - `server/src/index.ts` starts Fastify on `HOST` (default `127.0.0.1`) and
     `PORT` (default `8806`), with `GET /api/health` returning `{ "ok": true }`.
     When `web/dist` exists it serves it at `/`.
   - `web` renders the text "brief-board". `vite.config.ts` proxies `/api` to
     `http://127.0.0.1:8806` in dev.
   - `cli/src/index.ts` prints the package version for `--version`.
   - One smoke test, `shared/src/index.test.ts`, so `npm test` has something
     to run. Vitest exits 1 when it finds no tests.
5. Root scripts: `dev` (server in watch mode plus Vite), `build`, `start`
   (the built server, serving `web/dist`), `test`, `typecheck`, `lint`.
6. `.gitignore`: `node_modules/`, `dist/`, `data/`, `.env*`, `*.local`.
7. `README.md`: one paragraph on what brief-board is, and an empty
   "Owner setup" heading. Brief 08 fills that section in.

## Acceptance

- From a clean checkout, `npm install && npm run typecheck && npm run lint &&
  npm test && npm run build` all pass.
- `npm start`, then `curl http://127.0.0.1:8806/api/health` returns
  `{"ok":true}`, and `http://127.0.0.1:8806/` shows the placeholder page.
- `node cli/dist/index.js --version` prints the version.

## Outcome (2026-10-09)

Done. The repo is the owner's `gandolh/the-board`, cloned into this directory
(its `Initial commit` carried `LICENSE`, `.gitignore` and a one-line README);
no `git init` was run.

- Pins follow Ward's (`wzd_auth`), the closest house stack: TypeScript 6.0.3,
  Vitest 4.1.11, ESLint 10.9.1 with typescript-eslint 8.69.0, zod 4.5.4,
  better-sqlite3 13.0.3, Vite 8.2.2, React 19.2.8, plus `@fastify/static`
  10.1.5 as newspapper has it. Fastify is **5.12.5**, not Ward's 5.12.1:
  `npm audit` flags every 5.12.x up to 5.12.4 (five advisories).
- `concurrently` 10.0.5 pulls `shell-quote` 1.9.0 (critical advisory), and its
  own fix is a day old, so the root `package.json` overrides `shell-quote` to
  1.11.0. `npm audit`: 0 vulnerabilities.
- Each compiled package writes its `tsconfig.tsbuildinfo` into `dist/`. At the
  package root, deleting `dist/` left the build info behind and `tsc -b`
  skipped the emit, so a "clean" build produced no CLI.
- Tests are compiled with the rest (`shared/dist/index.test.js`), so `tsc -b`
  typechecks them; Vitest only reads `*/src/**`.

Verified from a clean tree (`node_modules` and every `dist/` deleted):
install, typecheck, lint, test and build all pass. `npm start` answered
`{"ok":true}` on `/api/health` and served the built page at `/`, and
`node cli/dist/index.js --version` printed `0.1.0` with only `node` on PATH.
