import { STATUS_LABELS, STATUSES, type Lane as LaneData, type Ticket } from "@brief-board/shared";
import { Card } from "./Card";
import { Collapsible } from "./components/ui/Collapsible";

/**
 * The board: the column headers once at the top, sticky, Backlog first, and a
 * lane per project tag under them. Lanes with open tickets come first, then the rest,
 * each group alphabetical. A lane with nothing open starts collapsed. In each
 * cell, blocked cards come after the others. A cell holding more than
 * `CELL_CARDS` cards stops at about that many cards' height and scrolls
 * inside (`.cell-long` in styles.css); one holding that many or fewer is as
 * tall as its cards.
 */

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
    <div className="board">
      <div className="columns-head" aria-hidden="true">
        {STATUSES.map((status) => (
          <div key={status} className={`col-head col-${status}`}>
            {STATUS_LABELS[status]} <span className="count">{counts.get(status)}</span>
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
      className="lane"
      triggerClassName="lane-head"
      panelClassName="lane-scroll"
      trigger={
        <>
          <span className="lane-name">{lane.project}</span>
          <span className="lane-meta">
            {open > 0 ? `${open} open · ` : ""}
            {done} done
          </span>
        </>
      }
    >
      <div className="lane-cols">
        {STATUSES.map((status) => {
          const cards = cellTickets(lane.tickets, status);
          return (
            <div key={status} className={`cell col-${status}${cards.length > CELL_CARDS ? " cell-long" : ""}`}>
              <div className="cell-head">{STATUS_LABELS[status]}</div>
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
