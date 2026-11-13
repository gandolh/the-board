import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_DONE_DAYS, type Ticket } from "@brief-board/shared";
import { fetchDone } from "./api";
import { DetailPanel } from "./DetailPanel";
import { COUNT, EMPTY, MAIN } from "./looks";
import { BottomBar, TopBar } from "./TopBar";
import { day, when } from "./time";
import { usePolling } from "./usePolling";

/**
 * Older Done: the Done tickets the board no longer shows, those that reached
 * Done more than `DEFAULT_DONE_DAYS` days ago. Polled like the board, read
 * only like the board, and a row opens the board's detail panel. The tag
 * filter works here as it does on the board, on the tickets this page polled.
 */
export function DonePage({ tag, onTag }: { tag: string; onTag: (tag: string) => void }) {
  const done = usePolling(fetchDone);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const all = useMemo(() => done.data?.tickets ?? [], [done.data]);
  const tags = useMemo(() => [...new Set(all.flatMap((t) => t.tags))].sort(), [all]);

  useEffect(() => {
    document.title = "Older Done · brief-board";
  }, []);

  const close = useCallback(() => setOpenKey(null), []);

  return (
    <div>
      <TopBar page="done" polled={done} tag={{ tags, value: tag, onChange: onTag }} />

      <main className={MAIN}>
        <h2 className="text-display">Older Done</h2>
        <p className="mt-1 text-ink-muted">
          Tickets that reached Done more than {DEFAULT_DONE_DAYS} days ago, by project, newest first.
        </p>
        {done.data && <DoneList tickets={all} tag={tag} onOpen={setOpenKey} />}
      </main>

      <BottomBar page="done" />
      {openKey && <DetailPanel key={openKey} ticketKey={openKey} refreshedAt={done.fetchedAt} onClose={close} />}
    </div>
  );
}

/**
 * The list itself: the tickets carrying `tag` (all of them without one), a
 * group per project in the order they come (the API's: projects
 * alphabetical, newest Done first in each), a row per ticket with its key,
 * title and the day it reached Done. With nothing to list, it says why.
 * `projectHeading` is the level of each project's heading: an `h4` where the
 * list sits under a heading of its own, as a sprint's does.
 */
export function DoneList({
  tickets: all,
  tag,
  onOpen,
  projectHeading: Heading = "h3",
}: {
  tickets: readonly Ticket[];
  tag: string;
  onOpen: (key: string) => void;
  projectHeading?: "h3" | "h4";
}) {
  const tickets = tag ? all.filter((ticket) => ticket.tags.includes(tag)) : all;
  if (tickets.length === 0) {
    return (
      <p className={EMPTY}>
        {all.length > 0
          ? `No ticket older than ${DEFAULT_DONE_DAYS} days carries the tag "${tag}".`
          : `Nothing older than ${DEFAULT_DONE_DAYS} days yet.`}
      </p>
    );
  }
  const groups = new Map<string, Ticket[]>();
  for (const ticket of tickets) {
    const group = groups.get(ticket.project);
    if (group) group.push(ticket);
    else groups.set(ticket.project, [ticket]);
  }
  return (
    <div className="mt-5 flex max-w-220 flex-col gap-4 phone:mt-4 phone:gap-3">
      {[...groups].map(([project, inProject]) => (
        <section
          key={project}
          className="overflow-hidden rounded-band border border-line bg-surface shadow-card"
          aria-label={`Project ${project}`}
        >
          <Heading className="flex items-baseline gap-3 border-b border-line px-4 py-3 text-title font-bold">
            {project} <span className={COUNT}>{inProject.length}</span>
          </Heading>
          <ul>
            {inProject.map((ticket) => (
              <li key={ticket.key} className="not-first:border-t not-first:border-line">
                <button
                  type="button"
                  className="relative flex min-h-12 w-full cursor-pointer items-baseline justify-between gap-4 px-4 py-3 text-left hover:bg-surface-sunk phone:min-h-14 phone:flex-col phone:gap-0"
                  onClick={() => onOpen(ticket.key)}
                  aria-label={`${ticket.key}: ${ticket.title}`}
                >
                  <span className="flex min-w-0 items-baseline gap-4 phone:flex-col phone:gap-0">
                    <span className="min-w-26 flex-none font-mono text-meta whitespace-nowrap text-ink-muted tabular-nums phone:min-w-0">
                      {ticket.key}
                    </span>
                    <span className="text-heading wrap-anywhere phone:text-[16px]/[22px]">{ticket.title}</span>
                  </span>
                  <time
                    className="text-small font-normal whitespace-nowrap text-ink-muted tabular-nums phone:absolute phone:top-3 phone:right-4"
                    dateTime={ticket.statusChangedAt}
                    title={`Done since ${when(ticket.statusChangedAt)}`}
                  >
                    {day(ticket.statusChangedAt)}
                  </time>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
