import { STATUS_LABELS, STATUSES, type Lane as LaneData, type Ticket } from "@brief-board/shared";
import { Card } from "./Card";
import { Collapsible } from "./components/ui/Collapsible";
import { COUNT } from "./looks";
import { cn } from "./lib/cn";

/**
 * The board: the column headers once at the top, sticky, Backlog first, and a
 * lane per project tag under them. Lanes with open tickets come first, then the rest,
 * each group alphabetical. A lane with nothing open starts collapsed. In each
 * cell, blocked cards come after the others. A cell holding more than
 * `CELL_CARDS` cards stops at about that many cards' height and scrolls
 * inside (`CELL_LONG` below); one holding that many or fewer is as
 * tall as its cards.
 */

/** Each column's colour, as whole class strings so Tailwind sees them: the bar across the top of its head and of its cells. */
const COLUMN_BAR: Record<Ticket["status"], string> = {
  backlog: "border-t-backlog",
  todo: "border-t-todo",
  in_progress: "border-t-in_progress",
  blocked: "border-t-danger",
  ready_for_test: "border-t-ready_for_test",
  ready_for_deploy: "border-t-ready_for_deploy",
  done: "border-t-done",
};

/**
 * A cell past `CELL_CARDS` cards stops at about five cards' height and scrolls inside. The scroll
 * padding keeps a card tabbed to clear of the edge, focus ring included.
 */
const CELL_LONG =
  "max-h-(--cell-cap) scroll-py-1.5 overflow-x-hidden overflow-y-auto [scrollbar-width:thin] narrow:scroll-pt-9";

/**
 * On a narrow screen a long cell keeps its column's name in view, flush with the cell's top,
 * while its cards scroll under it. The padding and the negative margin cancel out, so at rest
 * the cell looks like any other.
 */
const STICKY_HEAD = "narrow:sticky narrow:top-[-6px] narrow:z-cell narrow:-mb-1.5 narrow:bg-surface-sunk narrow:pb-1.5";

/** How many cards a cell shows before it scrolls. */
export const CELL_CARDS = 5;

const isOpen = (ticket: Ticket) => ticket.status !== "done";

/** A cell's cards in the server's order, the ones waiting on a condition last. */
export function cellTickets(tickets: readonly Ticket[], status: Ticket["status"]): Ticket[] {
  const inCell = tickets.filter((ticket) => ticket.status === status);
  return [
    ...inCell.filter((ticket) => ticket.blockedBy === null),
    ...inCell.filter((ticket) => ticket.blockedBy !== null),
  ];
}

export function orderLanes(lanes: LaneData[]): LaneData[] {
  const byName = (a: LaneData, b: LaneData) => a.project.localeCompare(b.project, undefined, { sensitivity: "base" });
  const open = lanes.filter((lane) => lane.tickets.some(isOpen)).sort(byName);
  const rest = lanes.filter((lane) => !lane.tickets.some(isOpen)).sort(byName);
  return [...open, ...rest];
}

export function Board({
  lanes,
  now,
  toggled,
  onToggle,
  onOpen,
}: {
  lanes: LaneData[];
  now: Date;
  /** Lanes the owner has flipped from their starting state. */
  toggled: ReadonlySet<string>;
  onToggle: (project: string) => void;
  onOpen: (key: string) => void;
}) {
  const counts = new Map(STATUSES.map((status) => [status, 0]));
  for (const lane of lanes)
    for (const ticket of lane.tickets) counts.set(ticket.status, (counts.get(ticket.status) ?? 0) + 1);

  return (
    <div>
      <div
        className="sticky top-(--top-h) z-columns grid grid-cols-7 gap-2 bg-page py-2 narrow:hidden"
        aria-hidden="true"
      >
        {STATUSES.map((status) => (
          <div
            key={status}
            data-column={status}
            className={cn(
              "rounded-box border-t-3 bg-surface-sunk px-2.5 py-2 text-meta font-strong tracking-[0.02em] text-ink-muted uppercase",
              COLUMN_BAR[status],
            )}
          >
            {STATUS_LABELS[status]} <span className={COUNT}>{counts.get(status)}</span>
          </div>
        ))}
      </div>
      {lanes.map((lane) => {
        const startsOpen = lane.tickets.some(isOpen);
        const expanded = toggled.has(lane.project) ? !startsOpen : startsOpen;
        return (
          <Lane key={lane.project} lane={lane} expanded={expanded} now={now} onToggle={onToggle} onOpen={onOpen} />
        );
      })}
    </div>
  );
}

function Lane({
  lane,
  expanded,
  now,
  onToggle,
  onOpen,
}: {
  lane: LaneData;
  expanded: boolean;
  now: Date;
  onToggle: (project: string) => void;
  onOpen: (key: string) => void;
}) {
  const open = lane.tickets.filter(isOpen).length;
  const done = lane.tickets.length - open;
  return (
    <Collapsible
      open={expanded}
      onOpenChange={() => onToggle(lane.project)}
      label={`Project ${lane.project}`}
      className="mt-2"
      triggerClassName="flex w-full cursor-pointer items-center gap-2 px-1 py-2 text-left"
      panelClassName="narrow:overflow-x-auto narrow:pb-1.5"
      trigger={
        <>
          <span className="font-strong">{lane.project}</span>
          <span className="text-meta text-ink-muted">
            {open > 0 ? `${open} open · ` : ""}
            {done} done
          </span>
        </>
      }
    >
      <div className="grid grid-cols-7 gap-2 narrow:grid-cols-[repeat(7,220px)]">
        {STATUSES.map((status) => {
          const cards = cellTickets(lane.tickets, status);
          const long = cards.length > CELL_CARDS;
          return (
            <div
              key={status}
              data-cell={status}
              data-long={long || undefined}
              className={cn("flex min-h-12 flex-col gap-1.5 rounded-box bg-surface-sunk p-1.5", long && CELL_LONG)}
            >
              <div
                className={cn(
                  "hidden border-t-3 pt-1 text-micro font-strong text-ink-muted uppercase narrow:block",
                  COLUMN_BAR[status],
                  long && STICKY_HEAD,
                )}
              >
                {STATUS_LABELS[status]}
              </div>
              {cards.map((ticket) => (
                <Card key={ticket.key} ticket={ticket} now={now} onOpen={onOpen} />
              ))}
            </div>
          );
        })}
      </div>
    </Collapsible>
  );
}
