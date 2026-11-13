import { openRun, parseTodoKey, type Ticket } from "@brief-board/shared";
import { cn } from "./lib/cn";
import { TAG } from "./looks";
import { endedRunLine, runLine } from "./runs";
import { since, when } from "./time";

/**
 * One ticket on the board: key, title, labels, and how long it has sat in its
 * column. A todo's card shows its slug where a brief's shows its key: the lane
 * already names the project. An In Progress card shows its run, or says it
 * has none; a card elsewhere, how long its last run took. A card with open questions for the owner shows how many, in any
 * column. A card whose brief or todo is in a `blocked/` folder says what it
 * waits on, in full.
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
    <button
      type="button"
      className="flex w-full shrink-0 cursor-pointer flex-col gap-1 rounded-card border border-line bg-surface p-2 text-left shadow-card hover:border-outline hover:bg-surface-hover narrow:p-3"
      onClick={() => onOpen(ticket.key)}
      aria-label={`${ticket.key}: ${ticket.title}`}
    >
      <span className="font-mono text-meta text-ink-muted tabular-nums">{todo ? todo.slug : ticket.key}</span>
      <span className="text-body font-medium wrap-anywhere phone:text-heading">{ticket.title}</span>
      {run && (
        <span
          data-stale={run.stale || undefined}
          className={cn("text-small font-normal wrap-anywhere", run.stale ? "font-medium text-warn" : "text-ink-muted")}
        >
          {run.text}
        </span>
      )}
      {(ticket.blockedBy !== null || ticket.openQuestions > 0) && (
        <span className="mt-0.5 flex flex-col items-start gap-1">
          {ticket.blockedBy !== null && <BlockedBadge condition={ticket.blockedBy} />}
          {ticket.openQuestions > 0 && <QuestionBadge count={ticket.openQuestions} />}
        </span>
      )}
      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="flex min-w-0 flex-wrap gap-1">
          {ticket.tags.map((tag) => (
            <span key={tag} className={TAG}>
              {tag}
            </span>
          ))}
        </span>
        <span
          className="ml-auto text-meta text-ink-muted tabular-nums"
          title={`In this column since ${when(ticket.statusChangedAt)}`}
        >
          {since(ticket.statusChangedAt, now)}
        </span>
      </span>
    </button>
  );
}

/** "Blocked by: a stronger machine": what the brief or todo waits on, in full. Not the Blocked status. */
function BlockedBadge({ condition }: { condition: string }) {
  const text = `Blocked by: ${condition}`;
  return (
    <span
      className="max-w-full rounded-badge border border-danger bg-danger-wash px-2 text-small font-medium wrap-anywhere text-danger"
      title={text}
    >
      {text}
    </span>
  );
}

/** "2 questions": open questions waiting for the owner's answer. */
function QuestionBadge({ count }: { count: number }) {
  const text = `${count} ${count === 1 ? "question" : "questions"}`;
  return (
    <span
      className="rounded-badge border border-in_progress bg-question-wash px-2 text-small text-in_progress"
      title={`${text} for the owner`}
    >
      {text}
    </span>
  );
}
