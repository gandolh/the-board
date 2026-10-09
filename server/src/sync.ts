import { formatKey, type SyncRequest, type SyncResponse, type Ticket } from "@brief-board/shared";
import type { Store } from "./store.js";

/**
 * `POST /api/sync` (brief 03). The corpus wins and the board is a view of it
 * (decisions.md), so sync corrects tickets to match their briefs, and it is the
 * one writer that does so without the move table. It touches only the projects
 * in the payload, and the whole run is one transaction.
 *
 * Per brief, by where it sits in its project's corpus:
 * - `todo`, no ticket: create it in To Do, its summary from the brief.
 * - `todo`, a ticket: refresh title and path, and the summary only if sync
 *   wrote it; an agent's summary stays. A Done ticket is left alone with a
 *   warning, because the board cannot tell which side is wrong.
 * - `done`, ticket in To Do, In Progress or Blocked: close it, with a history
 *   event and a comment saying why. Ready for test and Ready for deploy stay:
 *   the corpus cannot say whether the owner tested or deployed.
 * - `done`, no ticket: nothing. Sync does not backfill history.
 * - `superseded`, a ticket: hide it.
 * A ticket whose brief is missing from its project's payload gets a warning and
 * no change.
 */

const SYNC_AUTHOR = "sync";
const CLOSED_BY_SYNC = "Closed by sync: the brief is in done/.";
const CLOSABLE: Ticket["status"][] = ["todo", "in_progress", "blocked"];

export function runSync(store: Store, request: SyncRequest): SyncResponse {
  return store.db.transaction(() => {
    const result: SyncResponse = { created: 0, updated: 0, unchanged: 0, warnings: [] };

    for (const { project, briefs } of request.projects) {
      const existing = new Map(store.projectTickets(project).map((ticket) => [ticket.number, ticket]));
      const seen = new Set<number>();

      for (const brief of briefs) {
        if (seen.has(brief.number)) {
          result.warnings.push(`${formatKey(project, brief.number)}: two briefs carry this number; the first was used`);
          continue;
        }
        seen.add(brief.number);
        const key = formatKey(project, brief.number);
        const ticket = existing.get(brief.number);

        if (!ticket) {
          if (brief.state === "todo") {
            store.insertTicket({
              key,
              project,
              number: brief.number,
              title: brief.title,
              summary: brief.summary,
              summarySource: "sync",
              briefPath: brief.briefPath,
              author: SYNC_AUTHOR,
              via: "sync",
            });
            result.created++;
          }
          continue;
        }

        if (brief.state === "todo" && ticket.status === "done") {
          result.warnings.push(`${key} is Done on the board but its brief is in todo/; nothing changed`);
          continue;
        }

        // The brief exists, so its title and path are the truth; the summary
        // too, unless an agent wrote it.
        const changes: Parameters<Store["updateTicket"]>[1] = {};
        if (ticket.title !== brief.title) changes.title = brief.title;
        if (ticket.briefPath !== brief.briefPath) changes.briefPath = brief.briefPath;
        if (ticket.summarySource === "sync" && ticket.summary !== brief.summary) changes.summary = brief.summary;
        const hidden = brief.state === "superseded";
        if (ticket.hidden !== hidden) changes.hidden = hidden;
        let changed = Object.keys(changes).length > 0;
        if (changed) store.updateTicket(key, changes);

        if (brief.state === "done" && CLOSABLE.includes(ticket.status)) {
          store.setStatus(key, ticket.status, "done", SYNC_AUTHOR, "sync");
          store.addComment(key, { author: SYNC_AUTHOR, body: CLOSED_BY_SYNC, role: "conclusion", move: null });
          changed = true;
        }

        if (changed) result.updated++;
        else result.unchanged++;
      }

      for (const ticket of existing.values()) {
        if (!seen.has(ticket.number)) {
          result.warnings.push(`${ticket.key}: no brief with this number in ${project}'s corpus; nothing changed`);
        }
      }
    }
    return result;
  })();
}
