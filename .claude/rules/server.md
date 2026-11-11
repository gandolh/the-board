---
paths:
  - "server/src/**"
  - "shared/src/**"
---

# The API (`server/src`, `shared/src`)

- Read the `code-structure` skill before you add or move a route, a plugin or
  a module, and [corpus/wiki/architecture.md](../../corpus/wiki/architecture.md)
  and [corpus/wiki/sync.md](../../corpus/wiki/sync.md).
- The contract is `shared/src/api.ts`. The server sends nothing beyond it.
- The error body is `{ code, message }`, flat. The CLI and the board both parse
  it.
- The guard is the vendored `wardAuth` plugin, registered before any route.
  `server/vendor/` is generated: never edit it.
- A ticket in Backlog belongs to sync: refuse writes on it with `sync_owned`.
- `Store` is the only code that reads or writes ticket rows, and a write that
  touches more than one row runs in a transaction.
- Tests build the app with `buildApp({ dbPath: ":memory:" })` and `inject()`.
- `server/src/index.ts` and `server/src/seed.ts` still read the environment
  themselves (an ESLint warning). Add no other reader.
- `npm run check:conventions` runs `check-structure` over these folders,
  `--warn-only` until the server moves into the code structure.
