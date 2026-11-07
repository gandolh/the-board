import type { Ticket } from "@brief-board/shared";
import { UsageError } from "../errors.js";
import { ticketLine } from "../format.js";
import type { Runtime } from "../runtime.js";

/** Two conditions are the same when they match trimmed, with runs of spaces as one, ignoring case. */
export function conditionKey(condition: string): string {
  return condition.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Blocked tickets grouped by condition, the groups alphabetical by their
 * first spelling, the tickets in each by key. A ticket is blocked while its
 * brief or todo is in a `blocked/` folder; hidden ones are left out.
 */
export function groupBlocked(tickets: readonly Ticket[]): { condition: string; tickets: Ticket[] }[] {
  const groups = new Map<string, { condition: string; tickets: Ticket[] }>();
  for (const ticket of tickets) {
    if (ticket.blockedBy === null || ticket.hidden) continue;
    const key = conditionKey(ticket.blockedBy);
    const group = groups.get(key) ?? { condition: ticket.blockedBy.trim(), tickets: [] };
    group.tickets.push(ticket);
    groups.set(key, group);
  }
  const byText = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base" });
  return [...groups.values()]
    .sort((a, b) => byText(a.condition, b.condition))
    .map((group) => ({ ...group, tickets: group.tickets.sort((a, b) => a.key.localeCompare(b.key)) }));
}

/**
 * `blocked [--project <name>]`: every blocked brief and todo, across
 * projects or in one, grouped by the condition it waits on. These wait in
 * Backlog for something outside the work, not on the owner this session, so
 * `needs` leaves them out. Exit 0 whether or not anything is blocked.
 */
export async function blocked(rt: Runtime, args: string[]): Promise<void> {
  const { values, positionals } = rt.parse(args, {});
  if (positionals.length > 0) throw new UsageError("blocked takes no arguments: blocked [--project <name>]");
  const { lanes } = await rt.client().board();
  const tickets = lanes.filter((lane) => !values.project || lane.project === values.project).flatMap((lane) => lane.tickets);
  const groups = groupBlocked(tickets);
  if (groups.length === 0) {
    rt.out(values.project ? `Nothing is blocked in ${values.project}.` : "Nothing is blocked.");
    return;
  }
  const count = groups.reduce((n, group) => n + group.tickets.length, 0);
  rt.out(`${count} blocked, waiting on ${groups.length} condition${groups.length === 1 ? "" : "s"}.`);
  const now = new Date();
  for (const group of groups) {
    rt.out();
    rt.out(`${group.condition} (${group.tickets.length}):`);
    for (const ticket of group.tickets) rt.out(`  ${ticketLine({ ...ticket, blockedBy: null }, now)}`);
  }
}
