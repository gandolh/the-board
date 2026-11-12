import { statusSchema, type Lane } from "@brief-board/shared";
import { ApiRejected } from "../client.js";
import { UsageError } from "../errors.js";
import { ticketDetail, ticketLine } from "../format.js";
import { statusArg, type Runtime } from "../runtime.js";

/** `show <ticket>`: everything about it, as plain text. */
export async function show(rt: Runtime, args: string[]): Promise<void> {
  const { values, positionals } = rt.parse(args, {});
  const key = rt.ticketKey(positionals[0], values.project);
  for (const line of ticketDetail(await rt.client().ticket(key))) rt.out(line);
}

const LIST_USAGE = "list [--status <s>] [--tag <tag>] [--all] [--sprint <n>]";

/**
 * `list [--status <s>] [--tag <tag>] [--all] [--sprint <n>]`: this project's
 * tickets, or every project's; with `--tag`, only those carrying it. Without `--sprint` it is the board, which shows the active
 * sprint; with it, every ticket in sprint n that is not hidden, a closed
 * sprint's included. A sprint that does not exist is a usage mistake, exit 1.
 */
export async function list(rt: Runtime, args: string[]): Promise<void> {
  const { values, positionals } = rt.parse(args, {
    status: { type: "string" },
    all: { type: "boolean" },
    sprint: { type: "string" },
    tag: { type: "string" },
  });
  if (positionals.length > 0) throw new UsageError(`list takes no arguments: ${LIST_USAGE}`);
  const status = values.status === undefined ? undefined : statusArg(values.status);
  if (values.sprint !== undefined && !/^\d+$/.test(values.sprint.trim()))
    throw new UsageError(`--sprint takes a sprint's number: ${LIST_USAGE}`);
  const sprint = values.sprint === undefined ? undefined : Number.parseInt(values.sprint.trim(), 10);
  const tag = values.tag?.trim() || undefined;
  const project = values.all ? null : rt.project(values.project);
  const lanes = sprint === undefined ? (await rt.client().board()).lanes : await sprintLanes(rt, sprint);
  let shown = 0;
  for (const lane of lanes) {
    if (project !== null && lane.project !== project) continue;
    const tickets = lane.tickets.filter(
      (ticket) => (!status || ticket.status === status) && (!tag || ticket.tags.includes(tag)),
    );
    // Board order: by column, then number, and a todo's tickets (no number) by key.
    tickets.sort(
      (a, b) =>
        statusSchema.options.indexOf(a.status) - statusSchema.options.indexOf(b.status) ||
        (a.number ?? -1) - (b.number ?? -1) ||
        a.key.localeCompare(b.key),
    );
    for (const ticket of tickets) {
      rt.out(ticketLine(ticket));
      shown++;
    }
  }
  if (shown === 0) {
    const inSprint = sprint === undefined ? "" : ` in sprint ${sprint}`;
    const tagged = tag ? ` tagged ${tag}` : "";
    rt.out(
      project
        ? `No tickets for ${project}${tagged}${status ? ` in ${status}` : ""}${inSprint}.`
        : `No tickets${tagged}${inSprint}.`,
    );
  }
}

/** Sprint `number`'s tickets as lanes, a project each in the order the board sends them. */
async function sprintLanes(rt: Runtime, number: number): Promise<Lane[]> {
  let tickets: Lane["tickets"];
  try {
    ({ tickets } = await rt.client().sprint(number));
  } catch (err) {
    if (err instanceof ApiRejected && err.status === 404) throw new UsageError(err.body.message);
    throw err;
  }
  const lanes: Lane[] = [];
  for (const ticket of tickets) {
    const last = lanes.at(-1);
    if (last?.project === ticket.project) last.tickets.push(ticket);
    else lanes.push({ project: ticket.project, tickets: [ticket] });
  }
  return lanes;
}
