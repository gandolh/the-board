import {
  BLOCKED_BY_NOT_GIVEN,
  formatKey,
  formatTodoKey,
  openRun,
  STATUS_LABELS,
  type SyncRequest,
  type SyncResponse,
  type SyncTodo,
  type Ticket,
} from "@brief-board/shared";
import type { Store } from "./store.js";

/**
 * `POST /api/sync`. The corpus wins and the board is a view of it
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
 *   the corpus cannot say whether the owner tested or deployed. An In
 *   Progress ticket whose run is open and fresh stays too, with a warning:
 *   the run's end move decides. A stale run ends as `stale` and the ticket
 *   closes, and the comment and a warning say so.
 * - `done`, no ticket: nothing. Sync does not backfill history.
 * - `superseded`, a ticket: hide it.
 * - `blocked` (2026-11-07), a brief that waits on a condition outside the
 *   work: its ticket waits in Backlog, which no agent can start or move, with
 *   the condition kept on it. No ticket: create it there. To Do or Blocked:
 *   move it there, with a history event and a comment. In Progress: the same
 *   once its run is stale (the run ends) or gone (released); a fresh run's
 *   end move decides. Ready for test, Ready for deploy and Done stay, with
 *   their condition refreshed and a warning.
 * - `todo`, its ticket in Backlog: the brief is back from `blocked/`, so the
 *   ticket goes to To Do and loses its condition, with a comment.
 * - `done` closes a Backlog ticket as it closes a To Do one.
 * A brief's condition follows its folder: set while it is in `blocked/`,
 * cleared anywhere else. A ticket whose brief is missing from its project's
 * payload gets a warning and no change.
 *
 * Todos (2026-11-03) are sync's alone: each open todo has a ticket in Backlog,
 * made when sync first sees it, kept to the todo's title, summary and path,
 * and deleted once the todo is gone from the payload (promoted, dropped or
 * closed). A todo in `todos/blocked/` keeps its key and carries its condition.
 * Todo tickets are told apart by having no number, never by sitting in
 * Backlog, since a blocked brief's ticket sits there too. A project sent
 * without `todos`, by a CLI from before Backlog, keeps its todo tickets as
 * they are.
 *
 * Sprints (2026-11-10): sync reads and writes the active sprint's tickets
 * only, and new tickets join it. A ticket in a closed sprint is Done and
 * frozen, so sync never changes it and never brings it back: its brief in
 * `done/` is a no-op, and its brief back in `todo/` or `blocked/` (or in
 * `superseded/`) gets a warning and no change, not even to the title or
 * path. A closed sprint's ticket missing from the payload is not warned
 * about, and only the active sprint's todo tickets are removed.
 */

const SYNC_AUTHOR = "sync";
const CLOSED_BY_SYNC = "Closed by sync: the brief is in done/.";
const CLOSABLE: Ticket["status"][] = ["backlog", "todo", "in_progress", "blocked"];
const waiting = (condition: string) => `Waiting in Backlog: the brief is in blocked/ (blocked by ${condition}).`;
const UNBLOCKED_BY_SYNC = "Unblocked by sync: the brief is back in todo/.";
/** Where a brief that is in blocked/ leaves its ticket alone, apart from the condition, title and path. */
const PAST_WORK: Ticket["status"][] = ["ready_for_test", "ready_for_deploy", "done"];

export function runSync(store: Store, request: SyncRequest): SyncResponse {
  return store.db.transaction(() => {
    const result: SyncResponse = {
      created: 0,
      updated: 0,
      unchanged: 0,
      todos: { created: 0, updated: 0, unchanged: 0, removed: 0 },
      warnings: [],
    };

    const active = store.activeSprint().number;
    for (const { project, briefs, todos } of request.projects) {
      const all = store.projectTickets(project);
      const tickets = all.filter((ticket) => ticket.sprint === active);
      const frozen = new Map(all.filter((ticket) => ticket.sprint !== active).map((ticket) => [ticket.key, ticket]));
      if (todos)
        syncTodos(
          store,
          project,
          todos,
          tickets.filter((ticket) => ticket.number === null),
          frozen,
          result,
        );
      const existing = new Map(
        tickets.filter((ticket) => ticket.number !== null).map((ticket) => [ticket.number!, ticket]),
      );
      const seen = new Set<number>();

      for (const brief of briefs) {
        if (seen.has(brief.number)) {
          result.warnings.push(`${formatKey(project, brief.number)}: two briefs carry this number; the first was used`);
          continue;
        }
        seen.add(brief.number);
        const key = formatKey(project, brief.number);
        const closed = frozen.get(key);
        if (closed) {
          if (brief.state === "todo" || brief.state === "blocked" || (brief.state === "superseded" && !closed.hidden)) {
            result.warnings.push(
              `${key} is ${STATUS_LABELS[closed.status]} in sprint ${closed.sprint}, which is closed, but its brief is in ${brief.state}/; nothing changed`,
            );
          }
          result.unchanged++;
          continue;
        }
        const ticket = existing.get(brief.number);
        const blockedBy = brief.state === "blocked" ? brief.blockedBy?.trim() || BLOCKED_BY_NOT_GIVEN : null;

        if (!ticket) {
          if (brief.state === "todo" || brief.state === "blocked") {
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
              blockedBy,
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
        if (ticket.blockedBy !== blockedBy) changes.blockedBy = blockedBy;
        let changed = Object.keys(changes).length > 0;
        if (changed) store.updateTicket(key, changes);

        if (blockedBy !== null) {
          if (ticket.status === "todo" || ticket.status === "blocked") {
            store.setStatus(key, ticket.status, "backlog", SYNC_AUTHOR, "sync");
            store.addComment(key, { author: SYNC_AUTHOR, body: waiting(blockedBy), role: "comment", move: null });
            changed = true;
          } else if (ticket.status === "in_progress") {
            const run = openRun(ticket);
            if (run && !run.stale) {
              result.warnings.push(
                `${key}: its brief is in blocked/, but its run by ${run.author} is open; the run's end move decides`,
              );
            } else {
              let body = waiting(blockedBy);
              if (run) {
                store.endRun(key, "stale", "backlog");
                body += ` The run by ${run.author}, last heard ${run.lastHeardAt}, was stale and ends here.`;
                result.warnings.push(
                  `${key}: waits in Backlog; its run by ${run.author} was stale (last heard ${run.lastHeardAt}) and ends here`,
                );
              }
              store.setStatus(key, ticket.status, "backlog", SYNC_AUTHOR, "sync");
              store.addComment(key, { author: SYNC_AUTHOR, body, role: "comment", move: null });
              changed = true;
            }
          } else if (PAST_WORK.includes(ticket.status)) {
            result.warnings.push(
              `${key} is ${STATUS_LABELS[ticket.status]} on the board but its brief is in blocked/; only its condition, title and path were refreshed`,
            );
          }
        }

        if (brief.state === "todo" && ticket.status === "backlog") {
          store.setStatus(key, "backlog", "todo", SYNC_AUTHOR, "sync");
          store.addComment(key, { author: SYNC_AUTHOR, body: UNBLOCKED_BY_SYNC, role: "comment", move: null });
          changed = true;
        }

        if (brief.state === "done" && CLOSABLE.includes(ticket.status)) {
          const run = openRun(ticket);
          if (run && !run.stale) {
            result.warnings.push(
              `${key}: its brief is in done/, but its run by ${run.author} is open; the run's end move decides`,
            );
          } else {
            let body = CLOSED_BY_SYNC;
            if (run) {
              store.endRun(key, "stale");
              body += ` The run by ${run.author}, last heard ${run.lastHeardAt}, was stale and ends here.`;
              result.warnings.push(
                `${key}: closed; its run by ${run.author} was stale (last heard ${run.lastHeardAt}) and ends here`,
              );
            }
            store.setStatus(key, ticket.status, "done", SYNC_AUTHOR, "sync");
            store.addComment(key, { author: SYNC_AUTHOR, body, role: "conclusion", move: null });
            changed = true;
          }
        }

        if (changed) result.updated++;
        else result.unchanged++;
      }

      for (const [number, ticket] of existing) {
        if (!seen.has(number)) {
          result.warnings.push(`${ticket.key}: no brief with this number in ${project}'s corpus; nothing changed`);
        }
      }
    }
    return result;
  })();
}

/**
 * One project's todo tickets in the active sprint, made to match its open
 * todos. A todo's ticket always sits in Backlog, so none should be in a closed
 * sprint; one that is, is left alone with a warning rather than made twice.
 */
function syncTodos(
  store: Store,
  project: string,
  todos: SyncTodo[],
  tickets: Ticket[],
  frozen: ReadonlyMap<string, Ticket>,
  result: SyncResponse,
): void {
  const counts = result.todos;
  const existing = new Map(tickets.map((ticket) => [ticket.key, ticket]));
  const seen = new Set<string>();
  for (const todo of todos) {
    const key = formatTodoKey(project, todo.slug);
    seen.add(key);
    const closed = frozen.get(key);
    if (closed) {
      result.warnings.push(`${key} is in sprint ${closed.sprint}, which is closed; nothing changed`);
      counts.unchanged++;
      continue;
    }
    const ticket = existing.get(key);
    const blockedBy =
      todo.blockedBy === undefined || todo.blockedBy === null ? null : todo.blockedBy.trim() || BLOCKED_BY_NOT_GIVEN;
    if (!ticket) {
      store.insertTicket({
        key,
        project,
        number: null,
        title: todo.title,
        summary: todo.summary,
        summarySource: "sync",
        briefPath: todo.path,
        author: SYNC_AUTHOR,
        via: "sync",
        blockedBy,
      });
      counts.created++;
      continue;
    }
    const changes: Parameters<Store["updateTicket"]>[1] = {};
    if (ticket.title !== todo.title) changes.title = todo.title;
    if (ticket.summary !== todo.summary) changes.summary = todo.summary;
    if (ticket.briefPath !== todo.path) changes.briefPath = todo.path;
    if (ticket.blockedBy !== blockedBy) changes.blockedBy = blockedBy;
    if (Object.keys(changes).length > 0) {
      store.updateTicket(key, changes);
      counts.updated++;
    } else {
      counts.unchanged++;
    }
  }
  for (const ticket of tickets) {
    if (seen.has(ticket.key)) continue;
    store.deleteTicket(ticket.key);
    counts.removed++;
  }
}
