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

/** A status's chip, as whole class strings so Tailwind sees them: its colour on the page's surface, edged in it. */
const STATUS_CHIP: Record<Status, string> = {
  backlog: "border-backlog text-backlog",
  todo: "border-todo text-todo",
  in_progress: "border-in_progress text-in_progress",
  blocked: "border-danger text-danger",
  ready_for_test: "border-ready_for_test text-ready_for_test",
  ready_for_deploy: "border-ready_for_deploy text-ready_for_deploy",
  done: "border-done text-done",
};

/** A comment's role badge: the colour of the status the role belongs to, on its wash where there is one. */
const ROLE_BADGE: Record<MessageRole, string> = {
  block_reason: "border-danger bg-danger-wash text-danger",
  test_notes: "border-ready_for_test bg-test-wash text-ready_for_test",
  deploy_steps: "border-ready_for_deploy bg-surface text-ready_for_deploy",
  confirmation: "border-in_progress bg-question-wash text-in_progress",
  conclusion: "border-done bg-done-wash text-done",
  comment: "border-line bg-surface-sunk text-ink-muted",
};

const ROLE_BADGE_BASE = "rounded-badge border px-2 text-small";

const roleBadge = (role: MessageRole | null) => {
  const tint = ROLE_BADGE[role ?? "comment"];
  return cn(ROLE_BADGE_BASE, tint);
};

/** The line above a comment: who, what and when. */
const HEAD = "mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-small font-normal";

/** One section of the panel: a rule above it, and its heading. */
const SECTION_BOX = "border-t border-line pt-4";

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
        <>
          <span className="font-mono text-small font-normal text-ink-muted tabular-nums phone:text-body">
            {ticketKey}
          </span>
          <CopyButton text={ticketKey} label="Copy key" />
        </>
      }
    >
      {!shown ? (
        <p className="text-ink-muted">{failed ? "Couldn't load this ticket." : "Loading…"}</p>
      ) : (
        <>
          <PanelTitle className="text-display wrap-anywhere">{shown.ticket.title}</PanelTitle>
          <dl
            className={cn(
              FACTS,
              "items-baseline rounded-band border border-well-edge bg-surface-sunk px-4 py-3 dark:border-line phone:grid-cols-[72px_minmax(0,1fr)]",
            )}
          >
            <dt>Status</dt>
            <dd>
              <span
                className={cn(
                  "inline-flex h-6 items-center rounded-pill border bg-surface px-3 text-small whitespace-nowrap",
                  STATUS_CHIP[shown.ticket.status],
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
            <dd className="flex flex-wrap gap-1">
              {shown.ticket.tags.length === 0 ? (
                <span className="text-ink-muted">none</span>
              ) : (
                shown.ticket.tags.map((tag) => (
                  <span key={tag} className={cn(TAG, "border border-line bg-surface")}>
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
              <code className="text-small wrap-anywhere">{shown.ticket.briefPath}</code>{" "}
              <CopyButton text={shown.ticket.briefPath} label="Copy path" small />
            </dd>
          </dl>
          {shown.ticket.status === "backlog" &&
            (shown.ticket.number === null ? (
              <p className="text-ink-muted">
                Sync keeps this ticket to its todo. It leaves Backlog when the todo is promoted to a brief.
              </p>
            ) : (
              <p className="text-ink-muted">
                Sync keeps this ticket to its brief in blocked/. It leaves Backlog when the brief goes back to todo/.
              </p>
            ))}

          <section className={SECTION_BOX}>
            <h3 className={SECTION}>Summary</h3>
            {shown.ticket.summary.trim() ? (
              <MarkdownText>{shown.ticket.summary}</MarkdownText>
            ) : (
              <p className="text-ink-muted">No summary.</p>
            )}
          </section>

          {questions.length > 0 && (
            <section className={SECTION_BOX}>
              <SectionHead count={questions.length}>Questions</SectionHead>
              <ol>
                {questions.map((question) => (
                  <li key={question.number} className="py-3 not-first:border-t not-first:border-line first:pt-1">
                    <div className={HEAD}>
                      <span
                        className={cn(
                          ROLE_BADGE_BASE,
                          question.answeredAt === null
                            ? "border-in_progress bg-question-wash text-in_progress"
                            : "border-done bg-done-wash text-done",
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
                      <div className="mt-2 border-l-2 border-outline pl-3">
                        <div className={cn(HEAD, "mb-0.5 text-ink-muted")}>
                          Answer from {question.answeredBy}, {question.answeredAt ? when(question.answeredAt) : ""}
                        </div>
                        <MarkdownText>{question.answer}</MarkdownText>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className={SECTION_BOX}>
            <SectionHead count={shown.comments.length}>Comments</SectionHead>
            {shown.comments.length === 0 ? (
              <p className="text-ink-muted">No comments.</p>
            ) : (
              <ol>
                {shown.comments.map((comment) => (
                  <li key={comment.id} className="py-3 not-first:border-t not-first:border-line first:pt-1">
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
          </section>

          {ended.length > 0 && (
            <section className={SECTION_BOX}>
              <h3 className={SECTION}>Earlier runs</h3>
              <ol>
                {ended.map((earlier) => (
                  <li key={earlier.id} className="py-1 phone:py-2">
                    <span>
                      {earlier.author}: {runEnding(earlier)}, {runDurationText(earlier, refreshedAt ?? new Date())}
                    </span>
                    <span className="text-ink-muted">
                      , {when(earlier.startedAt)} to {earlier.endedAt === null ? "" : when(earlier.endedAt)}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className={SECTION_BOX}>
            <h3 className={SECTION}>History</h3>
            <ol>
              {shown.history.map((event, index) => (
                <li key={index} className="py-1 phone:py-2">
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
          </section>
        </>
      )}
    </Panel>
  );
}

/** A section heading with how many it holds beside it. */
function SectionHead({ count, children }: { count: number; children: string }) {
  return (
    <div className="mb-2 flex items-baseline gap-2">
      <h3 className="text-heading font-bold">{children}</h3>
      <span className="text-ink-muted">{count}</span>
    </div>
  );
}

function CopyButton({ text, label, small = false }: { text: string; label: string; small?: boolean }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(id);
  }, [copied]);
  return (
    <button
      type="button"
      className={cn(
        "inline-flex cursor-pointer items-center gap-1 rounded-card border border-outline bg-surface text-small font-medium text-ink hover:bg-surface-sunk active:bg-line",
        small ? "ml-1 min-h-7 px-2" : "min-h-8 px-3 phone:min-h-10",
      )}
      onClick={() => void navigator.clipboard.writeText(text).then(() => setCopied(true))}
      aria-label={label}
      title={label}
    >
      <svg
        className="size-3.5"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
        <path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" />
      </svg>
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
