import { STATUS_LABELS, STATUSES, type Lane as LaneData, type Ticket } from "@brief-board/shared";
import { Card } from "./Card";

/**
 * The board: the six column headers once at the top, sticky, and a lane per
 * project tag under them. Lanes with open tickets come first, then the rest,
 * each group alphabetical. A lane with nothing open starts collapsed.
 */

const isOpen = (ticket: Ticket) => ticket.status !== "done";

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
  for (const lane of lanes) for (const ticket of lane.tickets) counts.set(ticket.status, (counts.get(ticket.status) ?? 0) + 1);

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
        return <Lane key={lane.project} lane={lane} expanded={expanded} now={now} onToggle={onToggle} onOpen={onOpen} />;
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
    <section className="lane" aria-label={`Project ${lane.project}`}>
      <button type="button" className="lane-head" aria-expanded={expanded} onClick={() => onToggle(lane.project)}>
        <svg className="chevron" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="lane-name">{lane.project}</span>
        <span className="lane-meta">
          {open > 0 ? `${open} open · ` : ""}
          {done} done
        </span>
      </button>
      {expanded && (
        <div className="lane-scroll">
          <div className="lane-cols">
            {STATUSES.map((status) => (
              <div key={status} className={`cell col-${status}`}>
                <div className="cell-head">{STATUS_LABELS[status]}</div>
                {lane.tickets
                  .filter((ticket) => ticket.status === status)
                  .map((ticket) => (
                    <Card key={ticket.key} ticket={ticket} now={now} onOpen={onOpen} />
                  ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
