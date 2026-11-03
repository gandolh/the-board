---
summary: Snapshot as of 2026-11-03, per area. Live on the VPS since 2026-11-03 (empty until the first sync). The board, CLI, sync and guide built 2026-10-09 and rolled out to every project's CLAUDE.md but vps-deploy's; Base UI under the panel and lanes 2026-10-23. Down since 2026-10-13; briefs 01-05 (2026-11-02) built it for the VPS behind sign-in (sync in group folders, the sub-path, the CLI's token, sign-in, the container and the vps-deploy stack), not deployed, with the owner's steps, which vps-deploy's npm run setup:brief-board runs (2026-11-03); ward-auth 0.7.0 with its rename route off (2026-11-03); the open sync problem after the estate restarted brief numbering; the todos.
updated: 2026-11-03
---

# Status

_2026-11-03_. **Live on the VPS** at `/brief-board/` behind sign-in. The
owner ran vps-deploy's `npm run setup:brief-board` on 2026-11-03, signed in
and linked Ward; the CLI on the owner's machine reads the live board ("No
tickets" before the first sync). Briefs 01 to 05 (2026-11-02) built it: sync
in group folders, the sub-path, the CLI's token, sign-in, and the container
with vps-deploy's `brief-board` stack. The local board it replaces was down
from 2026-10-13. Brief numbering restarted at 01 on 2026-11-02 (see
[log.md](../log.md)).

## By area

- **Shared model** (2026-10-09). Statuses, the twelve-row move table with
  `checkMove`, keys, the zod contract for every route
  ([decisions.md](decisions.md), [architecture.md](architecture.md)).
- **API server** (2026-10-09). Fastify + SQLite on 127.0.0.1:8806, moves
  enforced by the shared table, serving the built UI.
- **CLI** (2026-10-09; token 2026-11-02). Every agent command, the address
  and token lookups, resume, exit 3 when the board is down or refuses the
  token, and `guide`.
- **Sync** (2026-10-09; group folders 2026-11-02). Reads every project's
  briefs, flat or one group folder down, and corrects the
  tickets ([sync.md](sync.md)).
- **Sign-in** (2026-11-02; ward-auth 0.7.0 2026-11-03). The vendored
  ward-auth as the one guard, its rename route off: a local
  account or Sign in with Ward, read-only browser sessions, the CLI's token
  for writes ([sign-in.md](sign-in.md)).
- **Deploy** (2026-11-02). `infrastructure/` builds the `brief-board-api`
  image (checked locally: healthy, 199 MB); vps-deploy's `brief-board` stack
  serves the board at `/brief-board/` and the API at `/brief-board-api` on
  port 8806. Not deployed ([architecture.md](architecture.md), "Running it").
- **Board UI** (2026-10-09, Base UI 2026-10-23). Read-only lanes, six
  columns, the detail panel, polling; README images retaken 2026-10-31.
- **Rollout** (2026-10-09). Thirteen repos carry the brief-board section in
  their CLAUDE.md. vps-deploy was skipped because its `corpus/CLAUDE.md` had
  uncommitted work, and on 2026-11-02 it still has no section.

140 tests (2026-11-03, after ward-auth 0.7.0); typecheck, lint and build clean.

## Next (owner)

1. The first `brief-board sync` (`--dry-run` first). The VPS board started
   empty, so no old ticket shares a number with a new brief; the numbering
   question in [todos/sync-after-numbering-restart.md](../todos/sync-after-numbering-restart.md)
   comes back only if a project restarts its numbers again.
2. For local development only: add brief-board to Ward's local seed
   (`wzd_auth`, `infrastructure/local/seed.mjs`):
   `{ slug: "brief-board", name: "brief-board", repo: "brief-board", envFiles: [".env"], dev: "http://localhost:5178/brief-board/", api: "/brief-board-api" }`
   in `APPS`, and its row in that folder's README table.
3. Optional: the X-Forwarded-For check in `docs/owner-setup.md` step 5.

## Open

- Sync matches briefs to tickets by number, and every repo restarted its
  numbering at 01 in 2026-11: new briefs land on old tickets
  ([sync.md](sync.md)).
- The sync report folds closes and hides into "updated"; separate counts need
  contract fields.

## Todos

- [Sync after the estate restarted brief numbering at 01](../todos/sync-after-numbering-restart.md) (`later`)
