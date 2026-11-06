import { Fragment } from "react";
import { groupNeeds, needCountText, type Need, type NeedKind } from "@brief-board/shared";

/**
 * What waits on the owner, above the lanes: one count per kind, in the order
 * the owner reads them ("3 questions · 1 blocked · 2 to test · 7 to deploy").
 * Each count shows only its tickets on the board, and a second click shows
 * them all again. Nothing at all when nothing waits. It only reads, like the
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
  const groups = groupNeeds(needs);
  if (groups.length === 0) return null;
  return (
    <nav className="needs" aria-label="Needs you">
      <span className="needs-label">Needs you</span>
      {groups.map((group, index) => (
        <Fragment key={group.kind}>
          {index > 0 && (
            <span className="needs-sep" aria-hidden="true">
              ·
            </span>
          )}
          <button
            type="button"
            className={`needs-kind needs-${group.kind}`}
            aria-pressed={selected === group.kind}
            onClick={() => onSelect(selected === group.kind ? null : group.kind)}
          >
            {needCountText(group.kind, group.needs.length)}
          </button>
        </Fragment>
      ))}
      {selected && (
        <button type="button" className="needs-clear" onClick={() => onSelect(null)}>
          Show all
        </button>
      )}
    </nav>
  );
}

/** The keys of the tickets one kind holds, or null for no filter (none chosen, or the kind emptied since). */
export function needKeys(needs: readonly Need[], kind: NeedKind | null): ReadonlySet<string> | null {
  if (!kind) return null;
  const keys = new Set(needs.filter((need) => need.kind === kind).map((need) => need.key));
  return keys.size > 0 ? keys : null;
}
