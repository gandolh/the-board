import type { Ticket } from "@brief-board/shared";
import { since, when } from "./time";

/** One ticket on the board: key, title, labels, and how long it has sat in its column. */
export function Card({ ticket, now, onOpen }: { ticket: Ticket; now: Date; onOpen: (key: string) => void }) {
  return (
    <button type="button" className="card" onClick={() => onOpen(ticket.key)} aria-label={`${ticket.key}: ${ticket.title}`}>
      <span className="card-key">{ticket.key}</span>
      <span className="card-title">{ticket.title}</span>
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
