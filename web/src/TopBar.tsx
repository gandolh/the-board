import type { ReactNode } from "react";
import type { Sprint } from "@brief-board/shared";
import { useSession } from "../vendor/ward/ward-auth-react.js";
import { cn } from "./lib/cn";
import { BRAND, NAV_LINK } from "./looks";
import { navigate, pathOf, type Page } from "./route";
import { clock } from "./time";
import type { Polled } from "./usePolling";

/**
 * The header the board's pages share: the name, the active sprint when the
 * page knows it, what the page puts next to them (the tag filter, the links
 * to the other pages), when it last heard from the API, and the account link.
 * Under it, the banner while the API isn't answering.
 */
export function TopBar({
  polled,
  sprint,
  children,
}: {
  polled: Polled<unknown>;
  /** The active sprint, from the page's own poll; left out where the page has none. */
  sprint?: Pick<Sprint, "number" | "startedOn"> | undefined;
  children: ReactNode;
}) {
  return (
    <>
      <header className="sticky top-0 z-top flex min-h-top flex-wrap items-center gap-x-5 gap-y-2 border-b border-line bg-surface px-6 py-2.5 narrow:px-4">
        <h1 className={cn("mr-2", BRAND)}>brief-board</h1>
        {sprint && <SprintName sprint={sprint} />}
        {children}
        <span className="ml-auto text-ink-muted tabular-nums">
          {polled.fetchedAt ? `Updated ${clock(polled.fetchedAt)}` : "Loading…"}
        </span>
        <AccountLink />
      </header>
      {polled.failing && (
        <div
          className="mx-6 mt-3 rounded-box bg-banner-bg px-3 py-2 text-banner-text narrow:mx-4 narrow:mt-2"
          role="status"
        >
          The board's API isn't answering.
          {polled.fetchedAt ? ` Showing what it said at ${clock(polled.fetchedAt)}.` : ""} Trying again every 10
          seconds.
        </div>
      )}
    </>
  );
}

/** The active sprint next to the name: "Sprint 2 · since 2026-11-10", the day as stored (UTC). */
export function SprintName({ sprint }: { sprint: Pick<Sprint, "number" | "startedOn"> }) {
  return (
    <span className="text-ink-muted tabular-nums">
      Sprint {sprint.number} · since <time dateTime={sprint.startedOn}>{sprint.startedOn}</time>
    </span>
  );
}

/**
 * The tag filter. Its options are the tags on this page's tickets, plus the
 * chosen one when none of them carry it: the choice carries from one page
 * to the other, so the owner can always see and clear it.
 */
export function TagFilter({
  tags,
  value,
  onChange,
}: {
  tags: readonly string[];
  value: string;
  onChange: (tag: string) => void;
}) {
  const options = value && !tags.includes(value) ? [...tags, value].sort() : tags;
  return (
    <label className="flex items-center gap-2 text-ink-muted">
      <span>Tag</span>
      <select
        className="max-w-[50vw] rounded-box border border-line bg-surface px-2 py-1 text-ink disabled:opacity-70"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={options.length === 0}
      >
        <option value="">All tags</option>
        {options.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </label>
  );
}

/** A link to another page of the board, followed without a reload unless the owner asks for a new tab. */
export function PageLink({ page, className, children }: { page: Page; className?: string; children: ReactNode }) {
  return (
    <a
      className={className}
      href={pathOf(page)}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        navigate(page);
      }}
    >
      {children}
    </a>
  );
}

/** The signed-in user's name in the header, leading to the account page. */
function AccountLink() {
  const session = useSession();
  const name = session.status === "signed_in" ? session.user.username : "Account";
  return (
    <PageLink page="account" className={NAV_LINK}>
      {name}
    </PageLink>
  );
}
