import { checkMove, type Question, type Status } from "@brief-board/shared";
import { Rejected, UsageError } from "../errors.js";
import { ago, label, refusal } from "../format.js";
import { statusArg, type Runtime } from "../runtime.js";

/** `-m`, and `--question` as often as there are questions for the owner. */
const MESSAGE_OPTIONS = {
  message: { type: "string", short: "m" },
  question: { type: "string", multiple: true },
} as const;

/** "asked question 1", "asked questions 2, 3": the numbers to quote when the owner answers. */
function asked(rt: Runtime, key: string, questions: Question[] | undefined): void {
  if (!questions?.length) return;
  rt.out(`${key}: asked question${questions.length === 1 ? "" : "s"} ${questions.map((q) => q.number).join(", ")}`);
}

/** Check the move locally first, so an agent reads the rules from the CLI, not from a 400. */
async function moveTo(rt: Runtime, key: string, to: Status, message: string | undefined, author: string, questions?: string[]): Promise<void> {
  const client = rt.client();
  const { ticket } = await client.ticket(key);
  const check = checkMove(ticket.status, to, message);
  if (!check.ok) throw new Rejected(refusal(key, ticket.status, to, check).join("\n"));
  const result = await client.move(key, { to, message, author, questions });
  rt.out(`${key}: ${label(ticket.status)} → ${label(result.ticket.status)}`);
  asked(rt, key, result.questions);
}

/**
 * `start <ticket> [-m <message>]`. To Do and Blocked move to In Progress (a
 * Blocked ticket needs -m, as the table says), and a run opens. A ticket
 * already In Progress is a resume: a new session picking the work up, a
 * comment and not an error, and the open run passes to this author. When that
 * run was fresh and someone else's, a warning names it; the start still goes
 * ahead, because a run is a record, not a lock.
 */
export async function start(rt: Runtime, args: string[]): Promise<void> {
  const { values, positionals } = rt.parse(args, MESSAGE_OPTIONS);
  const key = rt.ticketKey(positionals[0], values.project);
  const author = rt.author(values.author);
  const client = rt.client();
  const { ticket } = await client.ticket(key);
  if (ticket.status !== "in_progress") {
    const check = checkMove(ticket.status, "in_progress", values.message);
    if (!check.ok) throw new Rejected(refusal(key, ticket.status, "in_progress", check).join("\n"));
  }
  const result = await client.start(key, { message: values.message, author, questions: values.question });
  const before = result.passedFrom;
  if (before && !before.stale) {
    rt.ctx.err(
      `brief-board: warning: ${key} had an open run by ${before.author}, heard ${ago(before.lastHeardAt, new Date())} ago. It passes to ${author}; make sure ${before.author} has stopped.`,
    );
  }
  rt.out(result.resumed ? `${key}: resumed (already In Progress)` : `${key}: ${label(ticket.status)} → ${label(result.ticket.status)}`);
  asked(rt, key, result.questions);
}

/** `move <ticket> <status> [-m <message>] [--question <q>]...` */
export async function move(rt: Runtime, args: string[]): Promise<void> {
  const { values, positionals } = rt.parse(args, MESSAGE_OPTIONS);
  if (positionals.length < 2) throw new UsageError("move <ticket> <status> [-m <message>] [--question <q>]...");
  const key = rt.ticketKey(positionals[0], values.project);
  await moveTo(rt, key, statusArg(positionals[1]), values.message, rt.author(values.author), values.question);
}

/** `comment <ticket> -m <message> [--question <q>]...` */
export async function comment(rt: Runtime, args: string[]): Promise<void> {
  const { values, positionals } = rt.parse(args, MESSAGE_OPTIONS);
  const key = rt.ticketKey(positionals[0], values.project);
  if (!values.message?.trim()) throw new UsageError("comment needs -m <message>");
  const result = await rt.client().comment(key, { body: values.message, author: rt.author(values.author), questions: values.question });
  rt.out(`${key}: comment added`);
  asked(rt, key, result.questions);
}
