import { useCallback, useEffect, useState } from "react";
import type { Sprint, Ticket } from "@brief-board/shared";
import { fetchSprint, fetchSprints } from "./api";
import { Collapsible } from "./components/ui/Collapsible";
import { DetailPanel } from "./DetailPanel";
import { DoneList } from "./DonePage";
import { cn } from "./lib/cn";
import { COUNT, EMPTY, MAIN, NAV_LINK } from "./looks";
import { PageLink, TopBar } from "./TopBar";
import { usePolling } from "./usePolling";

/**
 * The closed sprints, newest first, each a heading with its dates and Done
 * count that opens to its Done tickets by project. Read only like every page:
 * the list comes from `GET /api/sprints`, polled, and a sprint's tickets from
 * `GET /api/sprints/:number` the first time it opens (a closed sprint never
 * changes). The newest starts open. A row opens the board's detail panel.
 * Starting a sprint is the CLI's, on the owner's ask; nothing here writes.
 */
export function SprintsPage() {
  const sprints = usePolling(fetchSprints);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [toggled, setToggled] = useState<ReadonlySet<number>>(new Set());

  useEffect(() => {
    document.title = "Sprints · brief-board";
  }, []);

  const toggle = useCallback((number: number) => {
    setToggled((current) => {
      const next = new Set(current);
      if (!next.delete(number)) next.add(number);
      return next;
    });
  }, []);
  const close = useCallback(() => setOpenKey(null), []);

  return (
    <div>
      <TopBar polled={sprints} sprint={sprints.data?.active}>
        <PageLink page="board" className={NAV_LINK}>
          Board
        </PageLink>
        <PageLink page="done" className={NAV_LINK}>
          Older Done
        </PageLink>
      </TopBar>

      <main className={cn(MAIN, "max-w-250")}>
        <h2 className="mt-2 mb-1 text-title font-bold">Sprints</h2>
        <p className="mb-2 text-ink-muted">
          The closed sprints, newest first, each with the tickets that were Done when it closed.
        </p>
        {sprints.data && (
          <SprintList closed={sprints.data.closed} toggled={toggled} onToggle={toggle} onOpen={setOpenKey} />
        )}
      </main>

      {openKey && <DetailPanel key={openKey} ticketKey={openKey} refreshedAt={sprints.fetchedAt} onClose={close} />}
    </div>
  );
}

/**
 * The closed sprints, newest first whatever order they come in. The newest
 * starts open; `toggled` holds the ones the owner flipped from how they started.
 */
export function SprintList({
  closed,
  toggled,
  onToggle,
  onOpen,
}: {
  closed: readonly Sprint[];
  toggled: ReadonlySet<number>;
  onToggle: (number: number) => void;
  onOpen: (key: string) => void;
}) {
  if (closed.length === 0) return <p className={EMPTY}>No sprint has closed yet.</p>;
  const newestFirst = [...closed].sort((a, b) => b.number - a.number);
  return (
    <>
      {newestFirst.map((sprint, index) => {
        const startsOpen = index === 0;
        const open = toggled.has(sprint.number) ? !startsOpen : startsOpen;
        return <SprintSection key={sprint.number} sprint={sprint} open={open} onToggle={onToggle} onOpen={onOpen} />;
      })}
    </>
  );
}

/** "2026-10-09 to 2026-11-10": a closed sprint's days, as stored. */
export function sprintDates(sprint: Pick<Sprint, "startedOn" | "endedOn">): string {
  return `${sprint.startedOn} to ${sprint.endedOn ?? "now"}`;
}

/** One closed sprint: its heading, and once open, its tickets, fetched the first time. */
function SprintSection({
  sprint,
  open,
  onToggle,
  onOpen,
}: {
  sprint: Sprint;
  open: boolean;
  onToggle: (number: number) => void;
  onOpen: (key: string) => void;
}) {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [failed, setFailed] = useState(false);
  const needed = open && tickets === null && sprint.doneCount > 0;

  useEffect(() => {
    if (!needed) return;
    const controller = new AbortController();
    fetchSprint(sprint.number, controller.signal).then(
      (detail) => {
        setTickets(detail.tickets);
        setFailed(false);
      },
      (err: Error) => {
        if (err.name !== "AbortError" && err.name !== "Unauthorized") setFailed(true);
      },
    );
    return () => controller.abort();
  }, [needed, sprint.number]);

  return (
    <Collapsible
      open={open}
      onOpenChange={() => onToggle(sprint.number)}
      label={`Sprint ${sprint.number}`}
      className="mt-3"
      heading="h3"
      headingClassName="text-heading font-bold"
      triggerClassName="flex w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-1 py-2 text-left"
      panelClassName="[&>section:first-child]:mt-1"
      trigger={
        <>
          <span className="font-strong">Sprint {sprint.number}</span>
          <span className="font-normal text-ink-muted tabular-nums">{sprintDates(sprint)}</span>
          <span className={COUNT}>{sprint.doneCount} Done</span>
        </>
      }
    >
      {sprint.doneCount === 0 ? (
        <SprintTickets tickets={[]} onOpen={onOpen} />
      ) : tickets ? (
        <SprintTickets tickets={tickets} onOpen={onOpen} />
      ) : (
        <p className={EMPTY}>
          {failed ? "The board's API didn't answer for this sprint. Close it and open it again to retry." : "Loading…"}
        </p>
      )}
    </Collapsible>
  );
}

/** A sprint's Done tickets by project, as the older Done page lists them; an empty sprint says so. */
export function SprintTickets({ tickets, onOpen }: { tickets: readonly Ticket[]; onOpen: (key: string) => void }) {
  if (tickets.length === 0) return <p className={EMPTY}>No Done tickets.</p>;
  return <DoneList tickets={tickets} tag="" onOpen={onOpen} projectHeading="h4" />;
}
