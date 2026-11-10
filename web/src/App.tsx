import { useCallback, useEffect, useMemo, useState } from "react";
import type { Lane as LaneData, NeedKind } from "@brief-board/shared";
import { AccountPage } from "./AccountPage";
import { fetchBoard, fetchNeeds } from "./api";
import { Board, orderLanes } from "./Board";
import { DetailPanel } from "./DetailPanel";
import { DonePage } from "./DonePage";
import { needKeys, NeedsStrip } from "./NeedsStrip";
import { usePage } from "./route";
import { SprintsPage } from "./SprintsPage";
import { PageLink, TagFilter, TopBar } from "./TopBar";
import { usePolling } from "./usePolling";

/**
 * brief-board in the browser, behind the sign-in gate (`AuthGate.tsx`): the
 * board, older Done, the closed sprints, or the account page. Nothing here writes; the owner
 * asks an agent to make any move (decisions.md). The tag filter is one
 * choice for both the board and older Done, kept while the owner moves
 * between them.
 */
export function App() {
  const page = usePage();
  const [tag, setTag] = useState("");
  if (page === "account") return <AccountPage />;
  if (page === "done") return <DonePage tag={tag} onTag={setTag} />;
  if (page === "sprints") return <SprintsPage />;
  return <BoardPage tag={tag} onTag={setTag} />;
}

type LaneTicket = LaneData["tickets"][number];

/** One board, the active sprint's: a lane per project, seven columns, and what needs the owner above them. */
function BoardPage({ tag, onTag }: { tag: string; onTag: (tag: string) => void }) {
  const board = usePolling(fetchBoard);
  const needs = usePolling(fetchNeeds);
  const [needKind, setNeedKind] = useState<NeedKind | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [toggled, setToggled] = useState<ReadonlySet<string>>(new Set());

  const allLanes = useMemo(() => board.data?.lanes ?? [], [board.data]);
  const blocked = allLanes.reduce((n, lane) => n + lane.tickets.filter((t) => t.status === "blocked").length, 0);
  const tags = useMemo(() => [...new Set(allLanes.flatMap((lane) => lane.tickets.flatMap((t) => t.tags)))].sort(), [allLanes]);
  const allNeeds = useMemo(() => needs.data?.needs ?? [], [needs.data]);
  const needFilter = useMemo(() => needKeys(allNeeds, needKind), [allNeeds, needKind]);
  const lanes = useMemo(() => {
    const keep = (t: LaneTicket) => (!tag || t.tags.includes(tag)) && (!needFilter || needFilter.has(t.key));
    const filtered =
      tag || needFilter
        ? allLanes.map((lane) => ({ ...lane, tickets: lane.tickets.filter(keep) })).filter((lane) => lane.tickets.length > 0)
        : allLanes;
    return orderLanes(filtered);
  }, [allLanes, tag, needFilter]);

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
      <TopBar polled={board} sprint={board.data?.sprint}>
        <TagFilter tags={tags} value={tag} onChange={onTag} />
        <PageLink page="done" className="nav-link">
          Older Done
        </PageLink>
        <PageLink page="sprints" className="nav-link">
          Sprints
        </PageLink>
        <span className={`blocked-count${blocked > 0 ? " has-blocked" : ""}`}>{blocked} blocked</span>
      </TopBar>

      <NeedsStrip needs={allNeeds} selected={needFilter ? needKind : null} onSelect={setNeedKind} />

      <main>
        {board.data && lanes.length === 0 ? (
          <p className="empty">
            {needFilter
              ? "None of these tickets are on the board with this filter."
              : tag
                ? `No tickets carry the tag "${tag}".`
                : "No tickets yet. An agent runs brief-board sync to fill the board."}
          </p>
        ) : (
          <Board lanes={lanes} now={board.fetchedAt ?? new Date()} toggled={toggled} onToggle={toggle} onOpen={setOpenKey} />
        )}
      </main>

      {openKey && <DetailPanel key={openKey} ticketKey={openKey} refreshedAt={board.fetchedAt} onClose={close} />}
    </div>
  );
}
