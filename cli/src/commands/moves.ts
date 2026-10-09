import { checkMove, type Status } from "@brief-board/shared";
import { Rejected, UsageError } from "../errors.js";
import { label, refusal } from "../format.js";
import { statusArg, type Runtime } from "../runtime.js";

/** Check the move locally first, so an agent reads the rules from the CLI, not from a 400. */
async function moveTo(rt: Runtime, key: string, to: Status, message: string | undefined, author: string): Promise<void> {
  const client = rt.client();
  const { ticket } = await client.ticket(key);
  const check = checkMove(ticket.status, to, message);
  if (!check.ok) throw new Rejected(refusal(key, ticket.status, to, check).join("\n"));
  const result = await client.move(key, { to, message, author });
  rt.out(`${key}: ${label(ticket.status)} → ${label(result.ticket.status)}`);
}

/**
 * `start <ticket> [-m <message>]`. To Do and Blocked move to In Progress (a
 * Blocked ticket needs -m, as the table says). A ticket already In Progress is
 * a resume: a new session picking the work up. That is a comment, not an error.
 */
export async function start(rt: Runtime, args: string[]): Promise<void> {
  const { values, positionals } = rt.parse(args, { message: { type: "string", short: "m" } });
  const key = rt.ticketKey(positionals[0], values.project);
  const author = rt.author(values.author);
  const { ticket } = await rt.client().ticket(key);
  if (ticket.status === "in_progress") {
    await rt.client().comment(key, { body: values.message?.trim() || "Resumed in a new session.", author });
    rt.out(`${key}: resumed (already In Progress)`);
    return;
  }
  await moveTo(rt, key, "in_progress", values.message, author);
}

/** `move <ticket> <status> [-m <message>]` */
export async function move(rt: Runtime, args: string[]): Promise<void> {
  const { values, positionals } = rt.parse(args, { message: { type: "string", short: "m" } });
  if (positionals.length < 2) throw new UsageError("move <ticket> <status> [-m <message>]");
  const key = rt.ticketKey(positionals[0], values.project);
  await moveTo(rt, key, statusArg(positionals[1]), values.message, rt.author(values.author));
}

/** `comment <ticket> -m <message>` */
export async function comment(rt: Runtime, args: string[]): Promise<void> {
  const { values, positionals } = rt.parse(args, { message: { type: "string", short: "m" } });
  const key = rt.ticketKey(positionals[0], values.project);
  if (!values.message?.trim()) throw new UsageError("comment needs -m <message>");
  await rt.client().comment(key, { body: values.message, author: rt.author(values.author) });
  rt.out(`${key}: comment added`);
}
