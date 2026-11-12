# Task 22: Tags on existing tickets

**Depends on:**

- In brief-board: brief 19 (the server in the code structure) and brief 21 (sprints, the frozen closed sprint). Both are on `main`.
- The owner's ask of 2026-11-12: "For the board tickets, could you also add tags?"

**Runs before:** brief 20 (the redesign), which restyles whatever tag line exists. **Runs after:** 19, 21.

**Before you start:** run `brief-board guide` ([corpus/CLAUDE.md](../../CLAUDE.md)).

## Context

A ticket's tags can only be set when it is filed: `brief-board create <n> --tag <label>` sends `PUT /api/tickets/:key`, whose body carries `tags` (default `[]`), and the route replaces every tag with them (`Store.setTags`). No command changes the tags of a ticket that exists, so `show` prints `Tags: none` on almost every ticket. The upsert also rewrites the title, the summary and `summarySource`, so it cannot back a tag command.

What exists today:

- **The table** `ticket_tags (ticket_key, tag)` since the first migration (`server/src/db.ts`), seven migrations in all.
- **The reads** already carry tags: `ticket.tags` on every ticket, `?tag=` on `GET /api/board` and `GET /api/done`.
- **The web app** already shows tags: a chip per tag on the card (`web/src/Card.tsx`), a Tags row in the detail panel (`web/src/DetailPanel.tsx`), and the tag filter in the header. It polls every 10 s.
- **History** (`history` table, `historyEventSchema`) is status changes only: `to_status` is `NOT NULL`, `via` is `move` or `sync`, and the CLI and the web print each row as from → to.
- **The global `brief-board`** is `npm link`ed to this checkout's `cli/dist`, which `tsc -b` (in `npm run typecheck`) rebuilds. A build here puts the new CLI in front of the live server at once, and `cli/src/guide.md` is read at run time, so the guide goes live on edit.

## Owner decisions

The ask is the owner's (2026-11-12). These are the defaults this brief builds; the owner may change any.

1. **Two commands:** `brief-board tag <ticket> <tag>...` and `brief-board untag <ticket> <tag>...`. They take `--project` and `--author` like every write. They are idempotent: adding a tag the ticket has, or removing one it lacks, changes nothing and records nothing.
2. **One additive route:** `POST /api/tickets/:key/tags`, body `{ add?, remove?, author? }`, at least one tag. It answers `{ ticket, added, removed }`, the tags that really changed. No existing route or reply changes shape, so today's CLI and web app keep working.
3. **Tag changes get their own table**, `tag_events` (migration 8), and the detail reply gets a new `tagEvents` field. `history` stays status-only. `show` prints tag changes in its History section, merged by time.
4. **Tags are lower-case and hyphenated** on the new route (`^[a-z0-9]+(-[a-z0-9]+)*$`, up to 50 characters, at most 20 tags on a ticket). `PUT` keeps its looser rule, so old clients are unchanged. The project name is dropped as a tag, as `setTags` does. Removing accepts any tag the ticket has, so an old odd one can still go.
5. **The guards are the existing ones:** an unknown ticket is 404 `not_found`; a Backlog ticket is 400 `sync_owned` (Backlog belongs to sync); a closed sprint's ticket is 409 `sprint_closed`. The freeze stays as recorded in [wiki/decisions.md](../../wiki/decisions.md), so Sprint 1's Done tickets stay untagged.
6. **A tag change keeps the open run fresh**, like every other write on the ticket.
7. **Re-filing keeps tags.** `PUT` without `tags` leaves the tags alone on an update (none on a new ticket); an explicit list still replaces them, as today. `create` sends `tags` only when `--tag` is given.
8. **`list --tag <tag>`** keeps the tickets carrying it, with or without `--sprint`.
9. **The web app** needs no change: its chips and Tags row show added tags at the next poll. The redesign (brief 20) may show tag changes in the panel's history.
10. **The taxonomy** is [wiki/tags.md](../../wiki/tags.md): one kind tag per ticket and optional area tags. The server knows nothing of it.
11. **The tagging script** `scripts/tag-tickets.mjs` reads the active sprint's tickets, picks a kind from each title, path and project, and prints the plan as a table. It writes only with `--apply`; `--dry-run` (the default) changes nothing. It skips Backlog, hidden tickets and tickets that already carry a kind, and a refused ticket is a skipped row, not an abort.

## Files you OWN

- `shared/src/api.ts`, `shared/src/api.test.ts`.
- `server/src/db.ts`, `server/src/db.test.ts`, `server/src/db/store.ts`, `server/src/db/store.test.ts`, `server/src/features/tickets/`, `server/src/testing/buildTestApp.ts`.
- `cli/src/`: a new `commands/tags.ts`, `commands/read.ts`, `commands/create.ts`, `client.ts`, `format.ts`, `main.ts`, `guide.md`, `cli.test.ts`, `errors.ts` if needed.
- `scripts/tag-tickets.mjs`.
- Corpus: a new [wiki/tags.md](../../wiki/tags.md), [wiki/architecture.md](../../wiki/architecture.md), [wiki/glossary.md](../../wiki/glossary.md) (tag event), [wiki/status.md](../../wiki/status.md), [log.md](../../log.md); `docs/` pages that list the CLI's commands.

## Files you must NOT touch

- `server/vendor/`, `web/vendor/`, `vendor/house-style/`: generated.
- `web/`: brief 20's art director is reading it.
- `corpus/briefs/todo/20-*`.

## What to do

1. File this brief, and the board ticket.
2. Shared and server: the `tag_events` migration, the store method, the route, `tags` optional on `PUT`, `tagEvents` on the detail reply; inject tests for every guard and for idempotency; the migration in `db.test.ts`.
3. CLI: `tag`, `untag`, `list --tag`, `create` without `--tag`, tag changes in `show`, the usage text and the guide's lines. Tests against a real board, as `cli.test.ts` does. Against the old live server, `tag` and `untag` say the server doesn't have them yet, and every other command behaves as before.
4. The taxonomy page and the script; check the script on a scratch board, dry run and apply, and a dry run against the live board (a read).
5. The record: architecture, glossary, status, log, docs.

## Acceptance

- `npm run check` exits 0.
- A tag added with `brief-board tag` shows in `show` (Tags and History) and on the board's card; a second identical `tag` changes nothing; `untag` removes it; Backlog, closed-sprint and unknown tickets are refused with their codes.
- `create` on an existing ticket without `--tag` keeps its tags.
- `node scripts/tag-tickets.mjs` prints the plan and writes nothing; with `--apply` on a scratch board it tags each planned ticket once, and a second run plans nothing.
- **Owner steps:** from vps-deploy, `node cli.ts brief-board server`; `npm run build -w @brief-board/cli` here (the global CLI is linked to it); `node scripts/tag-tickets.mjs --dry-run`; `node scripts/tag-tickets.mjs --apply`.

## Interplay

- Brief 20 (the redesign) restyles the chips and may show `tagEvents` in the panel. This brief leaves `web/` alone.
- Agents filing briefs may pick a kind tag at `create`, from [wiki/tags.md](../../wiki/tags.md).
