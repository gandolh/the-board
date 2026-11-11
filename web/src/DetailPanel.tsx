import { useEffect, useState } from "react";
import {
  openRun,
  runDurationText,
  STATUS_LABELS,
  type MessageRole,
  type Status,
  type TicketDetailResponse,
} from "@brief-board/shared";
import { fetchTicket } from "./api";
import { Panel, PanelTitle } from "./components/ui/Dialog";
import { ROLE_LABELS } from "./labels";
import { cn } from "./lib/cn";
import { FACTS, SECTION, TAG } from "./looks";
import { MarkdownText } from "./MarkdownText";
import { runEnding, runLine } from "./runs";
import { when } from "./time";

/** A status's badge, as whole class strings so Tailwind sees them: its colour, and a tint of it behind. */
const STATUS_BADGE: Record<Status, string> = {
  backlog: "bg-backlog/14 text-backlog",
  todo: "bg-todo/14 text-todo",
  in_progress: "bg-in_progress/14 text-in_progress",
  blocked: "bg-danger/14 text-danger",
  ready_for_test: "bg-ready_for_test/14 text-ready_for_test",
  ready_for_deploy: "bg-ready_for_deploy/14 text-ready_for_deploy",
  done: "bg-done/14 text-done",
};

/** A comment's role badge: the colour of the status the role belongs to. */
const ROLE_BADGE: Record<MessageRole, string> = {
  block_reason: "bg-danger/14 text-danger",
  test_notes: "bg-ready_for_test/14 text-ready_for_test",
  deploy_steps: "bg-ready_for_deploy/14 text-ready_for_deploy",
  confirmation: "bg-in_progress/14 text-in_progress",
  conclusion: "bg-done/14 text-done",
  comment: "bg-todo/14 text-todo",
};

const ROLE_BADGE_BASE = "rounded-chip px-1.5 font-strong";

const roleBadge = (role: MessageRole | null) => {
  const tint = ROLE_BADGE[role ?? "comment"];
  return cn(ROLE_BADGE_BASE, tint);
};

/** The line above a comment: who, what and when. */
const HEAD = "mb-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-meta";

/**
 * A ticket's detail, in a side panel. Read-only: the only buttons copy text
 * (the owner pastes a key into a new session) or close the panel. A todo's
 * ticket names its todo file where a brief's names the brief, and says how it
 * leaves Backlog. It reloads
 * whenever the board does, so it never shows an older state than the cards.
 *
 * A non-modal Base UI dialog, mounted while a ticket is open: the board stays
 * usable beside it, and only Escape or the close button dismiss it, so a click
 * on another card switches the ticket. App keys it by ticket, so each ticket
 * opens fresh: focus goes to the close button, and back to its card on close.
 */
export function DetailPanel({
  ticketKey,
  refreshedAt,
  onClose,
}: {
  ticketKey: string;
  refreshedAt: Date | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<TicketDetailResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchTicket(ticketKey, controller.signal)
      .then((next) => {
        setDetail(next);
        setFailed(false);
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") setFailed(true);
      });
    return () => controller.abort();
  }, [ticketKey, refreshedAt]);

  const shown = detail?.ticket.key === ticketKey ? detail : null;
  const open = shown ? openRun(shown.ticket) : null;
  const run =
    shown && (open || shown.ticket.status === "in_progress") ? runLine(open, refreshedAt ?? new Date()) : null;
  const ended = shown?.runs.filter((candidate) => candidate.endedAt !== null) ?? [];
  // Open questions first: those are the ones waiting for the owner.
  const questions = shown
    ? [...shown.questions.filter((q) => q.answeredAt === null), ...shown.questions.filter((q) => q.answeredAt !== null)]
    : [];

  return (
    <Panel
      label={`Ticket ${ticketKey}`}
      onClose={onClose}
      top={
        <span className="text-ink-muted tabular-nums">
          {ticketKey} <CopyButton text={ticketKey} label="Copy key" />
        </span>
      }
    >
      {!shown ? (
        <p className="my-3.5 text-ink-muted">{failed ? "Couldn't load this ticket." : "Loading…"}</p>
      ) : (
        <div>
          <PanelTitle className="mt-2 mb-3 text-display font-bold wrap-anywhere">{shown.ticket.title}</PanelTitle>
          <dl className={FACTS}>
            <dt>Status</dt>
            <dd>
              <span
                className={cn(
                  "rounded-chip px-1.5 py-px text-meta font-strong uppercase",
                  STATUS_BADGE[shown.ticket.status],
                )}
              >
                {STATUS_LABELS[shown.ticket.status]}
              </span>
              {shown.ticket.hidden && <span className="text-ink-muted"> · hidden (superseded)</span>}
            </dd>
            {run && (
              <>
                <dt>Run</dt>
                <dd className={run.stale ? "text-warn" : undefined}>{run.text}</dd>
              </>
            )}
            <dt>Project</dt>
            <dd>{shown.ticket.project}</dd>
            <dt>Tags</dt>
            <dd>
              {shown.ticket.tags.length === 0 ? (
                <span className="text-ink-muted">none</span>
              ) : (
                shown.ticket.tags.map((tag) => (
                  <span key={tag} className={TAG}>
                    {tag}
                  </span>
                ))
              )}
            </dd>
            {shown.ticket.blockedBy !== null && (
              <>
                <dt>Blocked by</dt>
                <dd>{shown.ticket.blockedBy}</dd>
              </>
            )}
            <dt>{shown.ticket.number === null ? "Todo" : "Brief"}</dt>
            <dd>
              <code className="wrap-anywhere">{shown.ticket.briefPath}</code>{" "}
              <CopyButton text={shown.ticket.briefPath} label="Copy path" />
            </dd>
          </dl>
          {shown.ticket.status === "backlog" &&
            (shown.ticket.number === null ? (
              <p className="my-3.5 text-ink-muted">
                Sync keeps this ticket to its todo. It leaves Backlog when the todo is promoted to a brief.
              </p>
            ) : (
              <p className="my-3.5 text-ink-muted">
                Sync keeps this ticket to its brief in blocked/. It leaves Backlog when the brief goes back to todo/.
              </p>
            ))}

          <h3 className={SECTION}>Summary</h3>
          {shown.ticket.summary.trim() ? (
            <MarkdownText>{shown.ticket.summary}</MarkdownText>
          ) : (
            <p className="my-3.5 text-ink-muted">No summary.</p>
          )}

          {questions.length > 0 && (
            <>
              <h3 className={SECTION}>Questions</h3>
              <ol>
                {questions.map((question) => (
                  <li key={question.number} className="border-t border-line py-2.5">
                    <div className={HEAD}>
                      <span
                        className={cn(
                          ROLE_BADGE_BASE,
                          question.answeredAt === null ? "bg-accent/14 text-accent" : "bg-done/14 text-done",
                        )}
                      >
                        {question.answeredAt === null ? "Open" : "Answered"}
                      </span>
                      <span className="font-strong">#{question.number}</span>
                      <span className="text-ink-muted">{question.author}</span>
                      <time className="text-ink-muted" dateTime={question.askedAt}>
                        {when(question.askedAt)}
                      </time>
                    </div>
                    <MarkdownText>{question.text}</MarkdownText>
                    {question.answer !== null && (
                      <div className="mt-1.5 border-l-2 border-line pl-2.5">
                        <div className={cn(HEAD, "text-ink-muted")}>
                          Answer from {question.answeredBy}, {question.answeredAt ? when(question.answeredAt) : ""}
                        </div>
                        <MarkdownText>{question.answer}</MarkdownText>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </>
          )}

          <h3 className={SECTION}>Comments</h3>
          {shown.comments.length === 0 ? (
            <p className="my-3.5 text-ink-muted">No comments.</p>
          ) : (
            <ol>
              {shown.comments.map((comment) => (
                <li key={comment.id} className="border-t border-line py-2.5">
                  <div className={HEAD}>
                    <span className={roleBadge(comment.role)}>{ROLE_LABELS[comment.role ?? "comment"]}</span>
                    <span className="font-strong">{comment.author}</span>
                    {comment.move && (
                      <span className="text-ink-muted">
                        {STATUS_LABELS[comment.move.from]} → {STATUS_LABELS[comment.move.to]}
                      </span>
                    )}
                    <time className="text-ink-muted" dateTime={comment.createdAt}>
                      {when(comment.createdAt)}
                    </time>
                  </div>
                  <MarkdownText>{comment.body}</MarkdownText>
                </li>
              ))}
            </ol>
          )}

          {ended.length > 0 && (
            <>
              <h3 className={SECTION}>Earlier runs</h3>
              <ol>
                {ended.map((earlier) => (
                  <li key={earlier.id} className="py-1 text-small">
                    <span>
                      {earlier.author}: {runEnding(earlier)}, {runDurationText(earlier, refreshedAt ?? new Date())}
                    </span>
                    <span className="text-ink-muted">
                      , {when(earlier.startedAt)} to {earlier.endedAt === null ? "" : when(earlier.endedAt)}
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}

          <h3 className={SECTION}>History</h3>
          <ol>
            {shown.history.map((event, index) => (
              <li key={index} className="py-1 text-small">
                <span>
                  {event.from
                    ? `${STATUS_LABELS[event.from]} → ${STATUS_LABELS[event.to]}`
                    : `Created in ${STATUS_LABELS[event.to]}`}
                </span>
                <span className="text-ink-muted">
                  {" "}
                  by {event.author}
                  {event.via === "sync" ? " (sync)" : ""}, {when(event.at)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Panel>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(id);
  }, [copied]);
  return (
    <button
      type="button"
      className="cursor-pointer rounded-chip border border-line bg-surface px-1.5 text-meta"
      onClick={() => void navigator.clipboard.writeText(text).then(() => setCopied(true))}
      aria-label={label}
      title={label}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
