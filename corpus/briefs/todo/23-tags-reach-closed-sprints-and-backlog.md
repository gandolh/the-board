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
