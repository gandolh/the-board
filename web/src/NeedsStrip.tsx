import { RadioGroup } from "./components/ui/RadioGroup";
import { groupNeeds, needCountText, type Need, type NeedKind } from "@brief-board/shared";

/** Each kind's colour, as whole class strings so Tailwind sees them: its text, and its tint when under the pointer or chosen. */
const KIND_LOOK: Record<NeedKind, string> = {
  question:
    "text-accent hover:bg-accent/15 data-checked:bg-accent/15 data-checked:inset-ring-1 data-checked:inset-ring-accent",
  blocked:
    "text-danger hover:bg-danger/15 data-checked:bg-danger/15 data-checked:inset-ring-1 data-checked:inset-ring-danger",
  stale_run:
    "text-warn hover:bg-warn/15 data-checked:bg-warn/15 data-checked:inset-ring-1 data-checked:inset-ring-warn",
  ready_for_test:
    "text-ready_for_test hover:bg-ready_for_test/15 data-checked:bg-ready_for_test/15 data-checked:inset-ring-1 data-checked:inset-ring-ready_for_test",
  ready_for_deploy:
    "text-ready_for_deploy hover:bg-ready_for_deploy/15 data-checked:bg-ready_for_deploy/15 data-checked:inset-ring-1 data-checked:inset-ring-ready_for_deploy",
};

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
    <div className="mx-6 mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-box bg-surface px-3 py-1.5 shadow-card">
      <RadioGroup<NeedKind>
        label="Needs you"
        className="contents"
        optionClassName="cursor-pointer rounded-chip px-1.5 py-0.5 font-semibold tabular-nums"
        prefix={
          <span className="mr-1 font-strong" aria-hidden="true">
            Needs you
          </span>
        }
        separator={
          <span className="text-ink-muted" aria-hidden="true">
            ·
          </span>
        }
        options={groups.map((group) => ({
          value: group.kind,
          label: needCountText(group.kind, group.needs.length),
          className: KIND_LOOK[group.kind],
        }))}
        value={selected}
        onValueChange={onSelect}
      />
      {selected && (
        <button
          type="button"
          className="ml-auto cursor-pointer rounded-chip px-1.5 py-0.5 text-ink-muted tabular-nums underline"
          onClick={() => onSelect(null)}
        >
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
