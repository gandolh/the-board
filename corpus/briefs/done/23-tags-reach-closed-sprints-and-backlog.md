# Task 23: Tags reach closed sprints and Backlog

**Depends on:**

- In brief-board: brief 22 (tags on existing tickets), on `main`, not deployed.
- The owner's answer of 2026-11-12 to brief 22's question 1: yes, Sprint 1's frozen Done tickets and the Backlog get tags too, "tags are pretty cool to understand how they were grouped by features".

**Runs before:** the deploy of briefs 22 and 23 together. **Runs after:** 22.

**Before you start:** run `brief-board guide` ([corpus/CLAUDE.md](../../CLAUDE.md)).

## Context

Brief 22 built `POST /api/tickets/:key/tags` with the guards every write has: a closed sprint's ticket is 409 `sprint_closed` (`Store.writable`), and a Backlog ticket is 400 `sync_owned` (the route). Its tagging script reads the active sprint only and skips Backlog. Its live dry run of 2026-11-12 planned 120 tickets and skipped 12 in Backlog; Sprint 1 holds 142 Done tickets that no write reaches.

Sync never sends or sets tags: it calls `insertTicket`, `updateTicket`, `setStatus` and `deleteTicket` (`server/src/features/sync/service.ts`), never `setTags`.

## Owner decisions

1. **A tag change is the one write a closed sprint's ticket takes** (the owner, 2026-11-12). Every other write keeps its 409 `sprint_closed`.
2. **A tag change is the one write a Backlog ticket takes from an agent.** Every other write keeps its 400 `sync_owned`. Sync still owns the rest of the ticket.
3. **Sync never undoes a tag.** A ticket that sync keeps (a todo's ticket it updates, a blocked brief's ticket it moves to To Do, a closed sprint's it leaves alone) keeps its tags. A promoted todo's ticket is deleted with its tags, as before: the corpus deletes the todo's file at promotion, so nothing links it to the brief's new ticket. The brief's ticket is tagged when it is filed (`create --tag`) or by the script.
4. **The script covers every sprint** (the closed ones and the active one) and Backlog. Its dry run stays read only.

## Files you OWN

- `server/src/db/store.ts`, `server/src/db/store.test.ts`, `server/src/features/tickets/`, `server/src/features/sprints/routes.test.ts`, `server/src/features/sync/service.test.ts`.
- `cli/src/guide.md` if it says otherwise; `scripts/tag-tickets.mjs`.
- Corpus: [wiki/decisions.md](../../wiki/decisions.md) (the frozen sprint and the sync-owned Backlog, under its line cap), [wiki/tags.md](../../wiki/tags.md), [wiki/glossary.md](../../wiki/glossary.md) where it says "no write", [wiki/status.md](../../wiki/status.md), [log.md](../../log.md).

## Files you must NOT touch

- `web/`, `corpus/briefs/todo/20-*`, the generated vendor folders.

## What to do

1. File this brief and its ticket.
2. Server: `changeTags` skips the frozen check; the route drops its Backlog refusal. Tests: tag and untag pass on a closed sprint's ticket and on a Backlog ticket (a todo's and a blocked brief's); every other write on both still refuses; sync keeps tags through an update, a blocked brief's return to To Do, and a closed sprint's ticket.
3. Script: every sprint and Backlog. Re-run the live dry run and record its counts.
4. The record: decisions, tags, glossary, status, log.

## Acceptance

- `npm run check` exits 0, and the CLI is rebuilt.
- The refusals other than tags stand, with tests.
- **Owner steps:** unchanged from brief 22, in the same order: from vps-deploy, `node cli.ts brief-board server`; the global CLI rebuilt from main; `node scripts/tag-tickets.mjs --dry-run`; `node scripts/tag-tickets.mjs --apply`.

## Outcome (2026-11-12)

Built in five commits (`87007c5` to `0ba29cd`), not deployed; it ships with brief 22. Ready for deploy on the board.

- **Server.** `Store.changeTags` no longer calls the frozen check, and the tags route no longer refuses Backlog. Every other write still refuses: tests on a closed sprint's ticket (the store's list of writes and the route's) and on a todo's and a blocked brief's Backlog ticket (move, start, comment, and PUT on a todo's key). The 409's message now says "nothing but a tag change writes to them".
- **Sync.** It never calls `setTags`. Tests show tags kept through an updated brief, a todo's ticket updated, a blocked brief back in To Do, a brief closed by sync, and a closed sprint's ticket. A promoted todo's ticket is deleted with its tags: the corpus deletes the todo's file at promotion, so sync can't link it to the brief's ticket. Tag the brief at `create`, or let the script pick it up.
- **Script.** Reads the active sprint and every closed one, Backlog included, and shows each row's sprint. Two more rules from reading the 274 rows: the deploy repo's tickets default to `infra`, and "unescaped", "has no", "no timeout", "overlaps", "runs into" read as `fix`. Live dry run of 2026-11-12 (reads only): 274 to tag (132 in sprint 2, 12 of them in Backlog; 142 in sprint 1), 102 by default (`feature`), 2 skipped as already tagged (briefs 22 and 23). Kinds planned: feature 102, infra 32, harness 24, redesign 23, base-ui 21, server-structure 17, deps 15, skill 13, tailwind 10, docs 10, fix 6, tracker 4, research 4.
- **Record.** [decisions.md](../../wiki/decisions.md) revisits both entries, dated, with the owner's reason; [tags.md](../../wiki/tags.md), the glossary's "Closed" and the guide's two lines say the same.

Commits: 87007c5 05c270a f4cf4ce fe8a221 0ba29cd
Checks run: `npm run check` (exit 0, 378 tests); `npm run build -w @brief-board/cli`; corpus lint; the script with `--apply` on a scratch board, tagging a closed sprint's ticket (a comment on it still 409); the live dry run (reads only); `list --tag` and `guide` from the rebuilt global CLI against the live server.
Checks skipped: the script's `--apply` on a Backlog ticket on a scratch board (the route's inject tests cover it); the container build (no docker); tagging the live board (not deployed).
Owner steps: unchanged from brief 22, in the same deploy: from vps-deploy, back up the SQLite file as for brief 21, then `node cli.ts brief-board server`; the global CLI is already rebuilt here (elsewhere `npm run build -w @brief-board/cli`); `node scripts/tag-tickets.mjs --dry-run`, reading the 102 default rows; `node scripts/tag-tickets.mjs --apply`.
