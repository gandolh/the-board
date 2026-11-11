import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import { openRun, runDurationText, STATUS_LABELS, type TicketDetailResponse } from "@brief-board/shared";
import { fetchTicket } from "./api";
import { Panel, PanelTitle } from "./components/ui/Dialog";
import { ROLE_LABELS } from "./labels";
import { runEnding, runLine } from "./runs";
import { when } from "./time";

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
        <span className="panel-key">
          {ticketKey} <CopyButton text={ticketKey} label="Copy key" />
        </span>
      }
    >
      {!shown ? (
        <p className="muted">{failed ? "Couldn't load this ticket." : "Loading…"}</p>
      ) : (
        <div className="panel-body">
          <PanelTitle className="panel-title">{shown.ticket.title}</PanelTitle>
          <dl className="facts">
            <dt>Status</dt>
            <dd>
              <span className={`status status-${shown.ticket.status}`}>{STATUS_LABELS[shown.ticket.status]}</span>
              {shown.ticket.hidden && <span className="muted"> · hidden (superseded)</span>}
            </dd>
            {run && (
              <>
                <dt>Run</dt>
                <dd className={run.stale ? "run-stale" : undefined}>{run.text}</dd>
              </>
            )}
            <dt>Project</dt>
            <dd>{shown.ticket.project}</dd>
            <dt>Tags</dt>
            <dd>
              {shown.ticket.tags.length === 0 ? (
                <span className="muted">none</span>
              ) : (
                shown.ticket.tags.map((tag) => (
                  <span key={tag} className="tag">
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
            <dd className="brief-path">
              <code>{shown.ticket.briefPath}</code> <CopyButton text={shown.ticket.briefPath} label="Copy path" />
            </dd>
          </dl>
          {shown.ticket.status === "backlog" &&
            (shown.ticket.number === null ? (
              <p className="muted">
                Sync keeps this ticket to its todo. It leaves Backlog when the todo is promoted to a brief.
              </p>
            ) : (
              <p className="muted">
                Sync keeps this ticket to its brief in blocked/. It leaves Backlog when the brief goes back to todo/.
              </p>
            ))}

          <h3>Summary</h3>
          <div className="markdown">
            {shown.ticket.summary.trim() ? (
              <Markdown skipHtml>{shown.ticket.summary}</Markdown>
            ) : (
              <p className="muted">No summary.</p>
            )}
          </div>

          {questions.length > 0 && (
            <>
              <h3>Questions</h3>
              <ol className="comments">
                {questions.map((question) => (
                  <li key={question.number} className="comment">
                    <div className="comment-head">
                      <span className={`role ${question.answeredAt === null ? "question-open" : "question-answered"}`}>
                        {question.answeredAt === null ? "Open" : "Answered"}
                      </span>
                      <span className="comment-author">#{question.number}</span>
                      <span className="muted">{question.author}</span>
                      <time className="muted" dateTime={question.askedAt}>
                        {when(question.askedAt)}
                      </time>
                    </div>
                    <div className="markdown">
                      <Markdown skipHtml>{question.text}</Markdown>
                    </div>
                    {question.answer !== null && (
                      <div className="answer">
                        <div className="comment-head muted">
                          Answer from {question.answeredBy}, {question.answeredAt ? when(question.answeredAt) : ""}
                        </div>
                        <div className="markdown">
                          <Markdown skipHtml>{question.answer}</Markdown>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </>
          )}

          <h3>Comments</h3>
          {shown.comments.length === 0 ? (
            <p className="muted">No comments.</p>
          ) : (
            <ol className="comments">
              {shown.comments.map((comment) => (
                <li key={comment.id} className="comment">
                  <div className="comment-head">
                    <span className={`role role-${comment.role ?? "comment"}`}>
                      {ROLE_LABELS[comment.role ?? "comment"]}
                    </span>
                    <span className="comment-author">{comment.author}</span>
                    {comment.move && (
                      <span className="muted">
                        {STATUS_LABELS[comment.move.from]} → {STATUS_LABELS[comment.move.to]}
                      </span>
                    )}
                    <time className="muted" dateTime={comment.createdAt}>
                      {when(comment.createdAt)}
                    </time>
                  </div>
                  <div className="markdown">
                    <Markdown skipHtml>{comment.body}</Markdown>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {ended.length > 0 && (
            <>
              <h3>Earlier runs</h3>
              <ol className="history">
                {ended.map((earlier) => (
                  <li key={earlier.id}>
                    <span>
                      {earlier.author}: {runEnding(earlier)}, {runDurationText(earlier, refreshedAt ?? new Date())}
                    </span>
                    <span className="muted">
                      , {when(earlier.startedAt)} to {earlier.endedAt === null ? "" : when(earlier.endedAt)}
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}

          <h3>History</h3>
          <ol className="history">
            {shown.history.map((event, index) => (
              <li key={index}>
                <span>
                  {event.from
                    ? `${STATUS_LABELS[event.from]} → ${STATUS_LABELS[event.to]}`
                    : `Created in ${STATUS_LABELS[event.to]}`}
                </span>
                <span className="muted">
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
      className="copy"
      onClick={() => void navigator.clipboard.writeText(text).then(() => setCopied(true))}
      aria-label={label}
      title={label}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
