import { groupNeeds, needCountText, type NeedKind } from "@brief-board/shared";
import { UsageError } from "../errors.js";
import { ago } from "../format.js";
import type { Runtime } from "../runtime.js";

const HEADINGS: Record<NeedKind, string> = {
  question: "Questions",
  blocked: "Blocked",
  stale_run: "Stale runs",
  ready_for_test: "Ready for test",
  ready_for_deploy: "Ready for deploy",
};

/** The first line of a reason, cut to fit one line of the list. */
function firstLine(text: string): string {
  const line = text.trim().split("\n")[0]!.trim();
  return line.length > 100 ? `${line.slice(0, 99)}…` : line;
}

/**
 * `needs [--project <name>]`: everything waiting on the owner, grouped by
 * kind in the order the owner reads it, oldest first in each: open
 * questions, Blocked tickets, stale runs, Ready for test, Ready for deploy.
 * Exit 0 whether or not anything waits.
 */
export async function needs(rt: Runtime, args: string[]): Promise<void> {
  const { values, positionals } = rt.parse(args, {});
  if (positionals.length > 0) throw new UsageError("needs takes no arguments: needs [--project <name>]");
  const now = new Date();
  const groups = groupNeeds((await rt.client().needs(values.project)).needs);
  if (groups.length === 0) {
    rt.out(values.project ? `Nothing needs the owner in ${values.project}.` : "Nothing needs the owner.");
    return;
  }
  rt.out(groups.map((group) => needCountText(group.kind, group.needs.length)).join(" · "));
  for (const group of groups) {
    rt.out();
    rt.out(`${HEADINGS[group.kind]} (${group.needs.length}):`);
    for (const need of group.needs)
      rt.out(`  ${need.key.padEnd(24)} ${firstLine(need.reason)}  (${need.by}, ${ago(need.since, now)} ago)`);
  }
}
