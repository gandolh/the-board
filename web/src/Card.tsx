import { openRun, parseTodoKey, type Ticket } from "@brief-board/shared";
import { endedRunLine, runLine } from "./runs";
import { since, when } from "./time";

/**
 * One ticket on the board: key, title, labels, and how long it has sat in its
 * column. A todo's card shows its slug where a brief's shows its key: the lane
 * already names the project. An In Progress card shows its run, or says it
 * has none; a card elsewhere, how long its last run took. A card with open questions for the owner shows how many, in any
 * column. A card whose brief or todo is in a `blocked/` folder says what it
 * waits on, cut short here and in full in the detail panel.
 */
export function Card({ ticket, now, onOpen }: { ticket: Ticket; now: Date; onOpen: (key: string) => void }) {
  const todo = ticket.number === null ? parseTodoKey(ticket.key) : null;
  // In Progress: the open run, or "no run". Elsewhere: how long the last run took, if one ran.
  const run =
    ticket.status === "in_progress"
      ? runLine(openRun(ticket), now)
      : ticket.run && ticket.run.endedAt !== null
        ? { text: endedRunLine(ticket.run, now), stale: false }
        : null;
  return (
    <button type="button" className="card" onClick={() => onOpen(ticket.key)} aria-label={`${ticket.key}: ${ticket.title}`}>
      <span className="card-key">{todo ? todo.slug : ticket.key}</span>
      <span className="card-title">{ticket.title}</span>
      {run && <span className={`card-run${run.stale ? " card-run-stale" : ""}`}>{run.text}</span>}
      <span className="card-foot">
        {ticket.blockedBy !== null && <BlockedBadge condition={ticket.blockedBy} />}
        {ticket.openQuestions > 0 && <QuestionBadge count={ticket.openQuestions} />}
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

/** "Blocked by: a stronger machine": what the brief or todo waits on. Not the Blocked status. */
function BlockedBadge({ condition }: { condition: string }) {
  const text = `Blocked by: ${condition}`;
  return (
    <span className="badge-blocked" title={text}>
      {text}
    </span>
  );
}

/** "2 questions": open questions waiting for the owner's answer. */
function QuestionBadge({ count }: { count: number }) {
  const text = `${count} ${count === 1 ? "question" : "questions"}`;
  return (
    <span className="badge-questions" title={`${text} for the owner`}>
      {text}
    </span>
  );
}
