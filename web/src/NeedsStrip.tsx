import { useState } from "react";
import { RadioGroup } from "./components/ui/RadioGroup";
import { groupNeeds, needCountText, type Need, type NeedKind } from "@brief-board/shared";
import { cn } from "./lib/cn";
import { usePhone } from "./lib/usePhone";

/**
 * Each kind's look, as whole class strings so Tailwind sees them: the colour of its total in the
 * head line, and of its pill on a row. The pairs: a question is `in_progress` blue, a stale run is
 * `warn`, to test and to deploy are their statuses' colours, blocked is `danger`.
 */
const KIND_LOOK: Record<NeedKind, { total: string; pill: string; label: string }> = {
  question: { total: "text-in_progress", pill: "border-in_progress text-in_progress", label: "Question" },
  blocked: { total: "text-danger", pill: "border-danger text-danger", label: "Blocked" },
  stale_run: { total: "text-warn", pill: "border-warn text-warn", label: "Stale run" },
  ready_for_test: {
    total: "text-ready_for_test",
    pill: "border-ready_for_test text-ready_for_test",
    label: "To test",
  },
  ready_for_deploy: {
    total: "text-ready_for_deploy",
    pill: "border-ready_for_deploy text-ready_for_deploy",
    label: "To deploy",
  },
};

/** How many rows a phone shows before "Show all N". */
const PHONE_ROWS = 4;

/**
 * What waits on the owner, above the lanes, as a queue: a head line with one total per kind, in the
 * order the owner reads them ("3 questions · 1 blocked · 2 to test · 7 to deploy"), and a row per
 * need under it (a pill for its kind, the key, the title, the API's own reason). The totals are
 * a `RadioGroup`: each shows only its tickets on the board, the rows of the chosen kind are drawn
 * pressed, and "Show all" shows them all again. A row is no control of its own. On a phone the queue
 * stops at four rows until "Show all N" (a phone is told by `usePhone`). Nothing at all when nothing waits. It only reads, like the
 * rest of the board.
 */
export function NeedsStrip({
  needs,
  selected,
  onSelect,
}: {
  needs: readonly Need[];
  selected: NeedKind | null;
  onSelect: (kind: NeedKind | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const phone = usePhone();
  const groups = groupNeeds(needs);
  if (groups.length === 0) return null;
  // The rows in the same order as the totals: question first, then the rest.
  const rows = groups.flatMap((group) => group.needs);
  const shown = phone && !expanded ? rows.slice(0, PHONE_ROWS) : rows;
  return (
    <section
      aria-label="Needs you queue"
      className="overflow-hidden rounded-band border border-line bg-surface shadow-card"
    >
      <div className="flex min-h-9 flex-wrap items-center gap-x-2 px-4 phone:min-h-12 phone:py-1">
        <svg className="size-4.5 flex-none text-ink-muted" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="m6 9 6 6 6-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-title font-bold" aria-hidden="true">
          Needs you
        </span>
        <RadioGroup<NeedKind>
          label="Needs you"
          className="ml-2 flex flex-wrap items-center gap-x-1 phone:ml-0 phone:w-full phone:pl-7"
          optionClassName="cursor-pointer rounded-badge px-2 py-0.5 text-small tabular-nums hover:underline data-checked:font-bold data-checked:inset-ring-1 data-checked:inset-ring-current"
          options={groups.map((group) => ({
            value: group.kind,
            label: needCountText(group.kind, group.needs.length),
            className: KIND_LOOK[group.kind].total,
          }))}
          value={selected}
          onValueChange={onSelect}
        />
        {selected && (
          <button
            type="button"
            className="ml-auto cursor-pointer rounded-badge px-2 py-0.5 text-small font-medium text-ink-muted underline hover:bg-surface-sunk"
            onClick={() => onSelect(null)}
          >
            Show all
          </button>
        )}
      </div>
      <ul className="border-t border-line">
        {shown.map((need) => (
          <li
            key={`${need.kind}:${need.key}`}
            data-pressed={need.kind === selected || undefined}
            className={cn(
              "grid min-h-9 grid-cols-[104px_112px_minmax(0,300px)_minmax(0,1fr)] items-baseline gap-x-4 border-l-4 border-l-transparent px-4 py-1 not-first:border-t not-first:border-t-line data-pressed:border-l-ink data-pressed:bg-surface-sunk",
              "phone:grid-cols-[auto_1fr] phone:gap-y-0.5 phone:py-2",
            )}
          >
            <span
              className={cn(
                "inline-flex h-5 items-center justify-self-start rounded-pill border bg-surface px-2 text-small whitespace-nowrap",
                KIND_LOOK[need.kind].pill,
              )}
            >
              {KIND_LOOK[need.kind].label}
            </span>
            <span className="font-mono text-meta text-ink-muted phone:justify-self-start">{need.key}</span>
            <span className="font-bold phone:col-span-full phone:text-heading">{need.title}</span>
            <span className="text-small font-normal text-ink-muted phone:col-span-full">{need.reason}</span>
          </li>
        ))}
      </ul>
      {shown.length < rows.length && (
        <button
          type="button"
          className="flex min-h-11 w-full cursor-pointer items-center justify-center border-t border-line text-small font-medium text-ink hover:bg-surface-sunk"
          onClick={() => setExpanded(true)}
        >
          Show all {rows.length}
        </button>
      )}
    </section>
  );
}

/** The keys of the tickets one kind holds, or null for no filter (none chosen, or the kind emptied since). */
export function needKeys(needs: readonly Need[], kind: NeedKind | null): ReadonlySet<string> | null {
  if (!kind) return null;
  const keys = new Set(needs.filter((need) => need.kind === kind).map((need) => need.key));
  return keys.size > 0 ? keys : null;
}
