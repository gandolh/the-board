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
    <button
      type="button"
      className="flex w-full shrink-0 cursor-pointer flex-col gap-1 rounded-box bg-surface px-2.5 py-2 text-left shadow-card hover:bg-surface-hover"
      onClick={() => onOpen(ticket.key)}
      aria-label={`${ticket.key}: ${ticket.title}`}
    >
      <span className="text-meta text-ink-muted tabular-nums">{todo ? todo.slug : ticket.key}</span>
      <span className="wrap-anywhere">{ticket.title}</span>
      {run && (
        <span
          data-stale={run.stale || undefined}
          className={cn("text-meta wrap-anywhere", run.stale ? "text-warn" : "text-ink-muted")}
        >
          {run.text}
        </span>
      )}
      <span className="flex flex-wrap items-center gap-1">
        {ticket.blockedBy !== null && <BlockedBadge condition={ticket.blockedBy} />}
        {ticket.openQuestions > 0 && <QuestionBadge count={ticket.openQuestions} />}
        {ticket.tags.map((tag) => (
          <span key={tag} className={TAG}>
            {tag}
          </span>
        ))}
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

/** "Blocked by: a stronger machine": what the brief or todo waits on. Not the Blocked status. */
function BlockedBadge({ condition }: { condition: string }) {
  const text = `Blocked by: ${condition}`;
  return (
    <span
      className="max-w-full overflow-hidden rounded-chip bg-backlog px-1.5 text-meta font-strong text-ellipsis whitespace-nowrap text-surface"
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
    <span className="rounded-chip bg-accent px-1.5 text-meta font-strong text-surface" title={`${text} for the owner`}>
      {text}
    </span>
  );
}
