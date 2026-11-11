import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_DONE_DAYS, type Ticket } from "@brief-board/shared";
import { fetchDone } from "./api";
import { DetailPanel } from "./DetailPanel";
import { cn } from "./lib/cn";
import { COUNT, EMPTY, MAIN, NAV_LINK } from "./looks";
import { PageLink, TagFilter, TopBar } from "./TopBar";
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
      <TopBar polled={done}>
        <TagFilter tags={tags} value={tag} onChange={onTag} />
        <PageLink page="board" className={NAV_LINK}>
          Board
        </PageLink>
        <PageLink page="sprints" className={NAV_LINK}>
          Sprints
        </PageLink>
      </TopBar>

      <main className={cn(MAIN, "max-w-250")}>
        <h2 className="mt-2 mb-1 text-title font-bold">Older Done</h2>
        <p className="mb-2 text-ink-muted">
          Tickets that reached Done more than {DEFAULT_DONE_DAYS} days ago, by project, newest first.
        </p>
        {done.data && <DoneList tickets={all} tag={tag} onOpen={setOpenKey} />}
      </main>

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
    <>
      {[...groups].map(([project, inProject]) => (
        <section key={project} className="mt-5" aria-label={`Project ${project}`}>
          <Heading className="mb-1.5 text-body font-strong">
            {project} <span className={COUNT}>{inProject.length}</span>
          </Heading>
          <ul className="grid grid-cols-[max-content_minmax(0,1fr)_max-content] rounded-box bg-surface shadow-card phone:grid-cols-[minmax(0,1fr)_max-content]">
            {inProject.map((ticket) => (
              <li
                key={ticket.key}
                className="col-span-full grid grid-cols-subgrid not-first:border-t not-first:border-line first:*:rounded-t-box last:*:rounded-b-box"
              >
                <button
                  type="button"
                  className="col-span-full grid cursor-pointer grid-cols-subgrid items-baseline gap-x-4 gap-y-0.5 px-3 py-2 text-left hover:bg-surface-hover"
                  onClick={() => onOpen(ticket.key)}
                  aria-label={`${ticket.key}: ${ticket.title}`}
                >
                  <span className="text-meta whitespace-nowrap text-ink-muted tabular-nums phone:overflow-hidden phone:text-ellipsis">
                    {ticket.key}
                  </span>
                  <span className="wrap-anywhere phone:col-span-full phone:row-start-2">{ticket.title}</span>
                  <time
                    className="justify-self-end text-meta whitespace-nowrap text-ink-muted tabular-nums"
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
    </>
  );
}
