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
- The error body is `{ code, message, allowed? }`, flat. The CLI and the board
  both parse it. `plugins/errors.ts` is the one handler; a handler throws
  `ApiError` (`lib/api-error.ts`) for a refusal and never sends its own 4xx.
- The guard is the vendored `wardAuth` plugin, wrapped in `plugins/auth`,
  registered before any route. `server/vendor/` is generated: never edit it.
- A ticket in Backlog belongs to sync: refuse writes on it with `sync_owned`.
- `Store` is the only code that reads or writes ticket rows, and a write that
  touches more than one row runs in a transaction.
- `Store` stays whole in `server/src/db/store.ts`: the features are route
  groups over it, so none imports another.
- A route lives in `server/src/features/<name>/routes.ts`, used through its
  `index.ts`, and declares `params`, `querystring`, `body` and `response` from
  `shared/`. A handler never parses input or its own reply. A response schema
  holds no `.transform()` or `.default()`: the type provider encodes with it.
- A route with a bad-params message of its own sets `config: { badParams }`.
- Tests build the app with `buildTestApp()` (`server/src/testing/`) and
  `inject()`; a feature test sits beside its routes.
- `server/src/server.ts` is the one file that listens, and `config.ts` the one
  that reads the environment (`loadConfig`, `loadEnvFile`, `resolveDbPath`,
  `loadSeedConfig`). The container starts `server/dist/server.js`.
- `npm run check:conventions` runs `check-structure` strict over these folders.
