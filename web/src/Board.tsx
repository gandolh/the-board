import { STATUS_LABELS, STATUSES, type Lane as LaneData, type Ticket } from "@brief-board/shared";
import { Card } from "./Card";
import { Collapsible } from "./components/ui/Collapsible";
import { cn } from "./lib/cn";

/**
 * The board: one status row, Backlog first, with the board-wide count of each status (from 1100 px
 * it is the column header for every lane, sticky at the top of the screen), and a lane per project
 * tag under it. Lanes with open tickets come first, then the rest, each group alphabetical. A lane
 * with nothing open starts collapsed. In each cell, blocked cards come after the others. From 1100 px
 * a lane is a band with seven wells hanging from it; a cell holding more than `CELL_CARDS` cards
 * stops at about that many cards' height and scrolls inside (`CELL_LONG`); one holding that many or
 * fewer is as tall as its cards. Below 1100 px the same cells stack: each non-empty status is a
 * heading with its cards, in columns 300 px wide, and the empty ones fold into one line. Nothing
 * scrolls sideways.
 */

/**
 * Each status's colour, as whole class strings so Tailwind sees them: the bar across the top of its
 * total in the status row, its name there, and the bar beside its name in a stacked lane.
 */
const STATUS_LOOK: Record<Ticket["status"], { bar: string; name: string; tick: string }> = {
  backlog: { bar: "border-t-backlog", name: "text-backlog", tick: "bg-backlog" },
  todo: { bar: "border-t-todo", name: "text-todo", tick: "bg-todo" },
  in_progress: { bar: "border-t-in_progress", name: "text-in_progress", tick: "bg-in_progress" },
  blocked: { bar: "border-t-danger", name: "text-danger", tick: "bg-danger" },
  ready_for_test: { bar: "border-t-ready_for_test", name: "text-ready_for_test", tick: "bg-ready_for_test" },
  ready_for_deploy: { bar: "border-t-ready_for_deploy", name: "text-ready_for_deploy", tick: "bg-ready_for_deploy" },
  done: { bar: "border-t-done", name: "text-done", tick: "bg-done" },
};

/**
 * A cell past `CELL_CARDS` cards stops at about five cards' height and scrolls inside, from 1100 px
 * (below it a status is a heading with its cards in the page's own flow). The scroll padding keeps a
 * card tabbed to clear of the edge, focus ring included.
 */
const CELL_LONG =
  "max-h-(--cell-cap) scroll-py-2 overflow-x-hidden overflow-y-auto [scrollbar-width:thin] narrow:max-h-none narrow:overflow-visible";

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
      <ul
        aria-label="Board totals"
        className="sticky top-0 z-columns mt-3 flex flex-wrap gap-2 bg-page pb-2 min-[1100px]:grid min-[1100px]:grid-cols-7 phone:mt-2 phone:grid phone:grid-cols-12"
      >
        {STATUSES.map((status, index) => {
          const count = counts.get(status) ?? 0;
          return (
            <li
              key={status}
              data-column={status}
              className={cn(
                "flex min-w-0 items-baseline gap-2 rounded-card border border-t-3 border-line bg-surface px-3 py-1 whitespace-nowrap shadow-card min-[1100px]:justify-between",
                "narrow:gap-1 narrow:px-2",
                "phone:flex-col-reverse phone:items-center phone:gap-0 phone:p-1",
                index < 4 ? "phone:col-span-3" : "phone:col-span-4",
                STATUS_LOOK[status].bar,
              )}
            >
              <span className={cn("text-small", STATUS_LOOK[status].name, "phone:text-meta")}>
                {STATUS_LABELS[status]}
              </span>
              <span
                className={cn(
                  "text-title tabular-nums",
                  count === 0 && "font-normal text-ink-muted",
                  "narrow:text-heading phone:text-title",
                )}
              >
                {count}
              </span>
            </li>
          );
        })}
      </ul>
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
  const empty = STATUSES.filter((status) => !lane.tickets.some((ticket) => ticket.status === status));
  return (
    <Collapsible
      open={expanded}
      onOpenChange={() => onToggle(lane.project)}
      label={`Project ${lane.project}`}
      className="mt-2 first:mt-3"
      triggerClassName="flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-t-band rounded-b-badge border border-line bg-surface px-4 text-left shadow-card hover:bg-surface-sunk phone:min-h-13"
      panelClassName="mt-1"
      trigger={
        <>
          <span className="text-title font-bold">{lane.project}</span>
          <span className="ml-2 text-body font-normal text-ink-muted">
            {open > 0 ? `${open} open · ` : ""}
            {done} done
          </span>
        </>
      }
    >
      <div className="grid grid-cols-7 items-stretch gap-2 narrow:grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] narrow:items-start narrow:gap-4 narrow:rounded-band narrow:bg-surface-sunk narrow:p-3">
        {STATUSES.map((status) => {
          const cards = cellTickets(lane.tickets, status);
          const long = cards.length > CELL_CARDS;
          return (
            <div
              key={status}
              data-cell={status}
              data-long={long || undefined}
              className={cn(
                "flex flex-col gap-2 rounded-band bg-surface-sunk p-2",
                cards.length === 0 && "min-h-11 p-0 narrow:hidden",
                "narrow:rounded-none narrow:bg-transparent narrow:p-0",
                long && CELL_LONG,
              )}
            >
              <div className="hidden items-center gap-2 narrow:flex">
                <span className={cn("h-4.5 w-1 rounded-[2px]", STATUS_LOOK[status].tick)} aria-hidden="true" />
                <h3 className="text-heading font-bold">{STATUS_LABELS[status]}</h3>
                <span className="font-bold text-ink-muted">{cards.length}</span>
              </div>
              {cards.map((ticket) => (
                <Card key={ticket.key} ticket={ticket} now={now} onOpen={onOpen} />
              ))}
            </div>
          );
        })}
        {empty.length > 0 && (
          <p className="col-span-full hidden text-ink-muted narrow:block">
            {empty.map((status) => STATUS_LABELS[status]).join(", ")}: empty
          </p>
        )}
      </div>
    </Collapsible>
  );
}
