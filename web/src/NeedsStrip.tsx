import { RadioGroup } from "./components/ui/RadioGroup";
import { groupNeeds, needCountText, type Need, type NeedKind } from "@brief-board/shared";

/**
 * What waits on the owner, above the lanes: one count per kind, in the order
 * the owner reads them ("3 questions · 1 blocked · 2 to test · 7 to deploy").
 * Each count shows only its tickets on the board, and "Show all" shows
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
    <div className="needs">
      <RadioGroup<NeedKind>
        label="Needs you"
        className="needs-group"
        optionClassName="needs-kind"
        prefix={
          <span className="needs-label" aria-hidden="true">
            Needs you
          </span>
        }
        separator={
          <span className="needs-sep" aria-hidden="true">
            ·
          </span>
        }
        options={groups.map((group) => ({
          value: group.kind,
          label: needCountText(group.kind, group.needs.length),
          className: `needs-${group.kind}`,
        }))}
        value={selected}
        onValueChange={onSelect}
      />
      {selected && (
        <button type="button" className="needs-clear" onClick={() => onSelect(null)}>
          Show all
        </button>
      )}
    </div>
  );
}

/** The keys of the tickets one kind holds, or null for no filter (none chosen, or the kind emptied since). */
export function needKeys(needs: readonly Need[], kind: NeedKind | null): ReadonlySet<string> | null {
  if (!kind) return null;
  const keys = new Set(needs.filter((need) => need.kind === kind).map((need) => need.key));
  return keys.size > 0 ? keys : null;
}
