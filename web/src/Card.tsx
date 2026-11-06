import { openRun, parseTodoKey, type Ticket } from "@brief-board/shared";
import { runLine } from "./runs";
import { since, when } from "./time";

/**
 * One ticket on the board: key, title, labels, and how long it has sat in its
 * column. A todo's card shows its slug where a brief's shows its key: the lane
 * already names the project. An In Progress card shows its run, or says it
 * has none.
 */
export function Card({ ticket, now, onOpen }: { ticket: Ticket; now: Date; onOpen: (key: string) => void }) {
  const todo = ticket.number === null ? parseTodoKey(ticket.key) : null;
  const run = ticket.status === "in_progress" ? runLine(openRun(ticket), now) : null;
  return (
    <button type="button" className="card" onClick={() => onOpen(ticket.key)} aria-label={`${ticket.key}: ${ticket.title}`}>
      <span className="card-key">{todo ? todo.slug : ticket.key}</span>
      <span className="card-title">{ticket.title}</span>
      {run && <span className={`card-run${run.stale ? " card-run-stale" : ""}`}>{run.text}</span>}
      <span className="card-foot">
        {ticket.tags.map((tag) => (
          <span key={tag} className="tag">
            {tag}
          </span>
        ))}
        <span className="card-age" title={`In this column since ${when(ticket.statusChangedAt)}`}>
          {since(ticket.statusChangedAt, now)}
        </span>
      </span>
    </button>
  );
}
