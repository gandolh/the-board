import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchBoard } from "./api";
import { Board, orderLanes } from "./Board";
import { DetailPanel } from "./DetailPanel";
import { clock } from "./time";
import { usePolling } from "./usePolling";

/**
 * brief-board in the browser: one board, a lane per project, six columns. It
 * only reads; the owner asks an agent to make any move (decisions.md).
 */
export function App() {
  const board = usePolling(fetchBoard);
  const [tag, setTag] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [toggled, setToggled] = useState<ReadonlySet<string>>(new Set());

  const allLanes = useMemo(() => board.data?.lanes ?? [], [board.data]);
  const blocked = allLanes.reduce((n, lane) => n + lane.tickets.filter((t) => t.status === "blocked").length, 0);
  const tags = useMemo(() => [...new Set(allLanes.flatMap((lane) => lane.tickets.flatMap((t) => t.tags)))].sort(), [allLanes]);
  const lanes = useMemo(() => {
    const filtered = tag
      ? allLanes.map((lane) => ({ ...lane, tickets: lane.tickets.filter((t) => t.tags.includes(tag)) })).filter((lane) => lane.tickets.length > 0)
      : allLanes;
    return orderLanes(filtered);
  }, [allLanes, tag]);

  useEffect(() => {
    document.title = blocked > 0 ? `(${blocked} blocked) brief-board` : "brief-board";
  }, [blocked]);

  const toggle = useCallback((project: string) => {
    setToggled((current) => {
      const next = new Set(current);
      if (!next.delete(project)) next.add(project);
      return next;
    });
  }, []);
  const close = useCallback(() => setOpenKey(null), []);

  return (
    <div className="app">
      <header className="top">
        <h1 className="brand">brief-board</h1>
        <label className="filter">
          <span>Tag</span>
          <select value={tag} onChange={(event) => setTag(event.target.value)} disabled={tags.length === 0}>
            <option value="">All tags</option>
            {tags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <span className={`blocked-count${blocked > 0 ? " has-blocked" : ""}`}>{blocked} blocked</span>
        <span className="updated">{board.fetchedAt ? `Updated ${clock(board.fetchedAt)}` : "Loading…"}</span>
      </header>

      {board.failing && (
        <div className="banner" role="status">
          The board's API isn't answering.{board.fetchedAt ? ` Showing what it said at ${clock(board.fetchedAt)}.` : ""} Trying again every 10 seconds.
        </div>
      )}

      <main>
        {board.data && lanes.length === 0 ? (
          <p className="empty">
            {tag ? `No tickets carry the tag "${tag}".` : "No tickets yet. An agent runs brief-board sync to fill the board."}
          </p>
        ) : (
          <Board lanes={lanes} now={board.fetchedAt ?? new Date()} toggled={toggled} onToggle={toggle} onOpen={setOpenKey} />
        )}
      </main>

      {openKey && <DetailPanel key={openKey} ticketKey={openKey} refreshedAt={board.fetchedAt} onClose={close} />}
    </div>
  );
}
