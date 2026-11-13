import type { ReactNode } from "react";
import type { Sprint } from "@brief-board/shared";
import { useSession } from "../vendor/ward/ward-auth-react.js";
import { cn } from "./lib/cn";
import { BRAND, FIELD } from "./looks";
import { navigate, pathOf, type Page } from "./route";
import { clock } from "./time";
import type { Polled } from "./usePolling";

/** The pages the tabs and the phone's bottom bar link to, in order. */
const TABS: { page: Page; label: string }[] = [
  { page: "board", label: "Board" },
  { page: "done", label: "Older Done" },
  { page: "sprints", label: "Sprints" },
];

/** A tag select's choices and the owner's choice, for the pages that filter. */
export interface TagChoice {
  tags: readonly string[];
  value: string;
  onChange: (tag: string) => void;
}

/**
 * The header the board's pages share: the name, the active sprint when the page knows it, how many
 * tickets are blocked when it counts them, the tabs, when it last heard from the API, the tag filter
 * when the page has one, and the account link. From 1240 px it is one 56 px row; from 720 px the tabs
 * take a second row with the tag select; under 720 px the tabs and the account link move to a bottom
 * bar (`BottomBar`). Under the header, the banner while the API isn't answering.
 */
export function TopBar({
  page,
  polled,
  sprint,
  blocked,
  tag,
}: {
  page: Page;
  polled: Polled<unknown>;
  /** The active sprint, from the page's own poll; left out where the page has none. */
  sprint?: Pick<Sprint, "number" | "startedOn"> | undefined;
  /** The board-wide count of Blocked tickets, where the page has it. */
  blocked?: number;
  tag?: TagChoice;
}) {
  return (
    <>
      <header className="border-b border-line bg-surface shadow-card">
        <div
          className={cn(
            "relative mx-auto grid max-w-360 items-center gap-x-5 px-6 phone:gap-x-3 phone:px-4",
            // Two rows from 720 px: the name, sprint and chip, the clock and the account; then the tabs and the tag select.
            "[grid-template-columns:auto_auto_auto_1fr_auto_auto] [grid-template-areas:'mark_sprint_chip_._upd_acct''tabs_tabs_tabs_._tag_tag']",
            // One row from 1240 px.
            "min-[1240px]:[grid-template-columns:auto_auto_auto_auto_1fr_auto_auto_auto] min-[1240px]:gap-x-6 min-[1240px]:[grid-template-areas:'mark_sprint_chip_tabs_._upd_tag_acct']",
            // The phone: the name and the chip, then the sprint and the clock beside the tag select.
            "mid:after:absolute mid:after:inset-x-6 mid:after:top-14 mid:after:h-px mid:after:bg-line mid:after:content-[''] phone:after:hidden",
            "phone:[grid-template-columns:auto_1fr_auto] phone:gap-y-1 phone:py-3 phone:[grid-template-areas:'mark_._chip''sprint_._tag''upd_._tag']",
          )}
        >
          <h1 className={cn("[grid-area:mark] mid:h-14 mid:content-center phone:h-auto", BRAND)}>brief-board</h1>
          <div className="whitespace-nowrap text-ink-muted tabular-nums [grid-area:sprint]">
            {sprint && <SprintName sprint={sprint} />}
          </div>
          <div className="[grid-area:chip]">{blocked !== undefined && <BlockedChip count={blocked} />}</div>
          <nav aria-label="Pages" className="[grid-area:tabs] mid:h-12 mid:content-center phone:hidden">
            <ul className="flex gap-1">
              {TABS.map((tab) => (
                <li key={tab.page}>
                  <PageLink
                    page={tab.page}
                    current={tab.page === page}
                    className={cn(
                      "relative inline-flex h-9 items-center rounded-card px-4 font-medium text-ink-muted hover:bg-surface-sunk hover:text-ink",
                      "min-[1240px]:h-14 min-[1240px]:rounded-none",
                      "aria-[current=page]:font-bold aria-[current=page]:text-ink",
                      "aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-4 aria-[current=page]:after:-bottom-1.5 aria-[current=page]:after:h-[3px] aria-[current=page]:after:rounded-[2px] aria-[current=page]:after:bg-ink aria-[current=page]:after:content-[''] min-[1240px]:aria-[current=page]:after:bottom-0",
                    )}
                  >
                    {tab.label}
                  </PageLink>
                </li>
              ))}
            </ul>
          </nav>
          <span className="text-small font-normal whitespace-nowrap text-ink-muted tabular-nums [grid-area:upd] phone:text-meta">
            {polled.fetchedAt ? `Updated ${clock(polled.fetchedAt)}` : "Loading…"}
          </span>
          {tag && (
            <div className="justify-self-end [grid-area:tag] mid:py-1.5 phone:py-0">
              <TagFilter {...tag} />
            </div>
          )}
          <div className="[grid-area:acct] phone:hidden">
            <AccountLink />
          </div>
        </div>
      </header>
      {polled.failing && (
        <div className="mx-auto mt-3 max-w-360 px-6 phone:px-4">
          <div className="rounded-card bg-banner-bg px-3 py-2 text-banner-text" role="status">
            The board's API isn't answering.
            {polled.fetchedAt ? ` Showing what it said at ${clock(polled.fetchedAt)}.` : ""} Trying again every 10
            seconds.
          </div>
        </div>
      )}
    </>
  );
}

/** "1 blocked": a pill, in the danger colours while any ticket is Blocked, quiet at zero. */
function BlockedChip({ count }: { count: number }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-pill border px-3 font-bold whitespace-nowrap tabular-nums phone:h-8",
        count > 0
          ? "border-danger bg-danger-wash text-danger"
          : "border-line bg-surface-sunk font-normal text-ink-muted",
      )}
    >
      {count} blocked
    </span>
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
function TagFilter({ tags, value, onChange }: TagChoice) {
  const options = value && !tags.includes(value) ? [...tags, value].sort() : tags;
  return (
    <label className="flex items-center gap-2 text-ink-muted">
      <span>Tag</span>
      <select
        className={cn(
          FIELD,
          "max-w-[50vw] appearance-none bg-(image:--select-chevron) bg-[right_12px_center] bg-no-repeat pr-8",
        )}
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
function PageLink({
  page,
  current,
  className,
  children,
}: {
  page: Page;
  /** The page the owner is on: marked for assistive technology, and drawn by the caller's `aria-[current=page]` classes. */
  current?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      className={className}
      href={pathOf(page)}
      aria-current={current ? "page" : undefined}
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

const ICON = {
  className: "size-5",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const PersonIcon = () => (
  <svg {...ICON}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
  </svg>
);

/** The signed-in user's name in the header, leading to the account page. */
function AccountLink() {
  const session = useSession();
  const name = session.status === "signed_in" ? session.user.username : "Account";
  return (
    <PageLink
      page="account"
      className="inline-flex min-h-10 items-center gap-2 font-medium underline underline-offset-[3px]"
    >
      <PersonIcon />
      {name}
    </PageLink>
  );
}

/** What each phone bar item draws: the board's columns, a check in a circle, a calendar, a person. */
const BAR_ICONS: Record<Page, ReactNode> = {
  board: (
    <svg {...ICON}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16M15 4v16" />
    </svg>
  ),
  done: (
    <svg {...ICON}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </svg>
  ),
  sprints: (
    <svg {...ICON}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  account: <PersonIcon />,
  login: null,
};

/**
 * Under 720 px: Board, Older Done, Sprints and the account in a bar on the bottom edge. The current
 * page has an ink bar across the top of its item.
 */
export function BottomBar({ page }: { page: Page }) {
  const session = useSession();
  const name = session.status === "signed_in" ? session.user.username : "Account";
  const items = [...TABS, { page: "account" as const, label: name }];
  return (
    <nav
      aria-label="Pages"
      className="fixed inset-x-0 bottom-0 z-top hidden border-t border-line bg-surface px-2 pb-[env(safe-area-inset-bottom)] phone:flex"
    >
      {items.map((item) => (
        <PageLink
          key={item.page}
          page={item.page}
          current={item.page === page}
          className="relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-meta font-medium text-ink-muted aria-[current=page]:font-bold aria-[current=page]:text-ink aria-[current=page]:before:absolute aria-[current=page]:before:inset-x-[22%] aria-[current=page]:before:top-0 aria-[current=page]:before:h-[3px] aria-[current=page]:before:rounded-b-[3px] aria-[current=page]:before:bg-ink aria-[current=page]:before:content-['']"
        >
          {BAR_ICONS[item.page]}
          <span className="max-w-full truncate whitespace-nowrap">{item.label}</span>
        </PageLink>
      ))}
    </nav>
  );
}
