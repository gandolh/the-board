import type { ReactNode } from "react";
import { useSession } from "../vendor/ward/ward-auth-react.js";
import { navigate, pathOf, type Page } from "./route";
import { clock } from "./time";
import type { Polled } from "./usePolling";

/**
 * The header the board and the older Done page share: the name, what the
 * page puts next to it (the tag filter, the link to the other page), when it
 * last heard from the API, and the account link. Under it, the banner while
 * the API isn't answering.
 */
export function TopBar({ polled, children }: { polled: Polled<unknown>; children: ReactNode }) {
  return (
    <>
      <header className="top">
        <h1 className="brand">brief-board</h1>
        {children}
        <span className="updated">{polled.fetchedAt ? `Updated ${clock(polled.fetchedAt)}` : "Loading…"}</span>
        <AccountLink />
      </header>
      {polled.failing && (
        <div className="banner" role="status">
          The board's API isn't answering.{polled.fetchedAt ? ` Showing what it said at ${clock(polled.fetchedAt)}.` : ""} Trying again every 10 seconds.
        </div>
      )}
    </>
  );
}

/**
 * The tag filter. Its options are the tags on this page's tickets, plus the
 * chosen one when none of them carry it: the choice carries from one page
 * to the other, so the owner can always see and clear it.
 */
export function TagFilter({ tags, value, onChange }: { tags: readonly string[]; value: string; onChange: (tag: string) => void }) {
  const options = value && !tags.includes(value) ? [...tags, value].sort() : tags;
  return (
    <label className="filter">
      <span>Tag</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={options.length === 0}>
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
    <PageLink page="account" className="account-link">
      {name}
    </PageLink>
  );
}
