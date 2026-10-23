import { Dialog } from "@base-ui/react/dialog";
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { STATUS_LABELS, type TicketDetailResponse } from "@brief-board/shared";
import { fetchTicket } from "./api";
import { ROLE_LABELS } from "./labels";
import { when } from "./time";

/**
 * A ticket's detail, in a side panel. Read-only: the only buttons copy text
 * (the owner pastes a key into a new session) or close the panel. It reloads
 * whenever the board does, so it never shows an older state than the cards.
 *
 * A non-modal Base UI dialog, mounted while a ticket is open: the board stays
 * usable beside it, and only Escape or the close button dismiss it, so a click
 * on another card switches the ticket. App keys it by ticket, so each ticket
 * opens fresh: focus goes to the close button, and back to its card on close.
 */
export function DetailPanel({ ticketKey, refreshedAt, onClose }: { ticketKey: string; refreshedAt: Date | null; onClose: () => void }) {
  const [detail, setDetail] = useState<TicketDetailResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

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

  return (
    <Dialog.Root
      open
      modal={false}
      disablePointerDismissal
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Popup className="panel" aria-label={`Ticket ${ticketKey}`} initialFocus={closeRef} render={<aside />}>
          <div className="panel-top">
            <span className="panel-key">
              {ticketKey} <CopyButton text={ticketKey} label="Copy key" />
            </span>
            <Dialog.Close ref={closeRef} className="icon-button" aria-label="Close">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </Dialog.Close>
          </div>

          {!shown ? (
            <p className="muted">{failed ? "Couldn't load this ticket." : "Loading…"}</p>
          ) : (
            <div className="panel-body">
              <h2 className="panel-title">{shown.ticket.title}</h2>
              <dl className="facts">
                <dt>Status</dt>
                <dd>
                  <span className={`status status-${shown.ticket.status}`}>{STATUS_LABELS[shown.ticket.status]}</span>
                  {shown.ticket.hidden && <span className="muted"> · hidden (superseded)</span>}
                </dd>
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
                <dt>Brief</dt>
                <dd className="brief-path">
                  <code>{shown.ticket.briefPath}</code> <CopyButton text={shown.ticket.briefPath} label="Copy path" />
                </dd>
              </dl>

              <h3>Summary</h3>
              <div className="markdown">
                {shown.ticket.summary.trim() ? <Markdown skipHtml>{shown.ticket.summary}</Markdown> : <p className="muted">No summary.</p>}
              </div>

              <h3>Comments</h3>
              {shown.comments.length === 0 ? (
                <p className="muted">No comments.</p>
              ) : (
                <ol className="comments">
                  {shown.comments.map((comment) => (
                    <li key={comment.id} className="comment">
                      <div className="comment-head">
                        <span className={`role role-${comment.role ?? "comment"}`}>{ROLE_LABELS[comment.role ?? "comment"]}</span>
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

              <h3>History</h3>
              <ol className="history">
                {shown.history.map((event, index) => (
                  <li key={index}>
                    <span>{event.from ? `${STATUS_LABELS[event.from]} → ${STATUS_LABELS[event.to]}` : `Created in ${STATUS_LABELS[event.to]}`}</span>
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
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
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
