---
summary: Snapshot as of 2026-11-02, per area. The board, CLI, sync and guide built 2026-10-09 and rolled out to every project's CLAUDE.md but vps-deploy's; Base UI under the panel and lanes 2026-10-23. Down since 2026-10-13; briefs 01-05 (2026-11-02) built it for the VPS behind sign-in (sync in group folders, the sub-path, the CLI's token, sign-in, the container and the vps-deploy stack), not deployed, with the owner's steps; the open sync problem after the estate restarted brief numbering; the todos.
updated: 2026-11-02
---

# Status

_2026-11-02_. Briefs 01 to 05, written and built on 2026-11-02, move the
board to the VPS at `/brief-board/` behind sign-in: sync in group folders,
the sub-path, the CLI's token, sign-in, and the container with vps-deploy's
`brief-board` stack. They are on local `main`, not pushed and not deployed.
The board has been down since 2026-10-13. Brief numbering restarted at 01 on
2026-11-02 (see [log.md](../log.md)).

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
- **Sign-in** (2026-11-02). ward-auth 0.3.1 as the one guard: a local
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

114 tests; typecheck, lint and build clean.

## Next (owner)

1. Add brief-board to Ward's local seed (`wzd_auth`,
   `infrastructure/local/seed.mjs`), one commit there:
   `{ slug: "brief-board", name: "brief-board", repo: "brief-board", envFiles: [".env"], dev: "http://localhost:5178/brief-board/", api: "/brief-board-api" }`
   in `APPS`, and `| brief-board | http://localhost:5178/brief-board/ | brief-board/.env |`
   in that folder's README table. Then `node seed.mjs` there writes the
   board's `WARD_OIDC_*` into its `.env`.
2. Put the board on the VPS, following `docs/owner-setup.md`: register the
   `brief-board` app and client in production Ward (`npm run oidc-client-key
   --workspace=api -- brief-board` in Ward's checkout; redirect URI
   `<production origin>/brief-board-api/auth/ward/callback`, sign-out return
   `<production origin>/brief-board/`); write `secrets/brief-board.env` in
   vps-deploy with `WARD_OIDC_CLIENT_KEY` and `BRIEF_BOARD_TOKEN`
   (`openssl rand -base64 32`), `chmod 600`; then in vps-deploy
   `node cli.ts brief-board all --dry-run` and `node cli.ts brief-board all`
   (it prints the sudo steps for `/srv/brief-board-api` and the Caddyfile);
   seed your account in the container
   (`docker compose -f infrastructure/docker-compose.yml exec -it brief-board-api node server/dist/seed.js`
   as the services account); grant your Ward account the app and link it from
   the account page.
3. Point the CLI at it: `npm link` in `cli/` (once), then
   `BRIEF_BOARD_URL=<production origin>/brief-board-api` and the same
   `BRIEF_BOARD_TOKEN` in `~/.config/brief-board/env`, `chmod 600`, and
   `brief-board list`. Until `npm link` runs, agents following their
   CLAUDE.md find no `brief-board` command.
4. Before the first `brief-board sync`, settle how sync treats the restarted
   brief numbers ([todos/sync-after-numbering-restart.md](../todos/sync-after-numbering-restart.md)).

## Open

- Sync matches briefs to tickets by number, and every repo restarted its
  numbering at 01 in 2026-11: new briefs land on old tickets
  ([sync.md](sync.md)).
- The sync report folds closes and hides into "updated"; separate counts need
  contract fields.

## Todos

- [Sync after the estate restarted brief numbering at 01](../todos/sync-after-numbering-restart.md) (`later`)
