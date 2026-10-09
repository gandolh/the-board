import { statusSchema } from "@brief-board/shared";
import { UsageError } from "../errors.js";
import { ticketDetail, ticketLine } from "../format.js";
import { statusArg, type Runtime } from "../runtime.js";

/** `show <ticket>`: everything about it, as plain text. */
export async function show(rt: Runtime, args: string[]): Promise<void> {
  const { values, positionals } = rt.parse(args, {});
  const key = rt.ticketKey(positionals[0], values.project);
  for (const line of ticketDetail(await rt.client().ticket(key))) rt.out(line);
}

/** `list [--status <s>] [--all]`: this project's tickets, or every project's. */
export async function list(rt: Runtime, args: string[]): Promise<void> {
  const { values, positionals } = rt.parse(args, { status: { type: "string" }, all: { type: "boolean" } });
  if (positionals.length > 0) throw new UsageError("list takes no arguments: list [--status <s>] [--all]");
  const status = values.status === undefined ? undefined : statusArg(values.status);
  const project = values.all ? null : rt.project(values.project);
  const { lanes } = await rt.client().board();
  let shown = 0;
  for (const lane of lanes) {
    if (project !== null && lane.project !== project) continue;
    const tickets = lane.tickets.filter((ticket) => !status || ticket.status === status);
    // Board order: by column, then number.
    tickets.sort((a, b) => statusSchema.options.indexOf(a.status) - statusSchema.options.indexOf(b.status) || a.number - b.number);
    for (const ticket of tickets) {
      rt.out(ticketLine(ticket));
      shown++;
    }
  }
  if (shown === 0) rt.out(project ? `No tickets for ${project}${status ? ` in ${status}` : ""}.` : "No tickets.");
}
