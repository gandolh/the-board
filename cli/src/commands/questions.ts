import { QUESTION_NOT_OPEN } from "@brief-board/shared";
import { ApiRejected } from "../client.js";
import { UsageError } from "../errors.js";
import { openQuestionLine } from "../format.js";
import type { Runtime } from "../runtime.js";

/** Which questions on a ticket are open, as a usage error's second half. */
function openOnes(numbers: number[]): string {
  return numbers.length ? `open: ${numbers.join(", ")}` : "it has no open questions";
}

/**
 * `answer <ticket> <n> -m <answer>`: record the owner's answer to question
 * `n`, which closes it. Answering one that is closed, or a number the ticket
 * doesn't have, is a usage mistake (exit 1) that names the open ones.
 */
export async function answer(rt: Runtime, args: string[]): Promise<void> {
  const { values, positionals } = rt.parse(args, { message: { type: "string", short: "m" } });
  const usage = 'answer <ticket> <number> -m "<the owner\'s answer>"';
  if (positionals.length !== 2 || !/^\d+$/.test(positionals[1]!)) throw new UsageError(usage);
  const key = rt.ticketKey(positionals[0], values.project);
  const number = Number.parseInt(positionals[1]!, 10);
  if (!values.message?.trim()) throw new UsageError(`answer needs -m: ${usage}`);
  const client = rt.client();
  const { questions = [] } = await client.ticket(key);
  const open = questions.filter((question) => question.answeredAt === null).map((question) => question.number);
  if (!open.includes(number)) throw new UsageError(`${key} has no open question ${number}; ${openOnes(open)}`);
  try {
    await client.answer(key, number, { answer: values.message, author: rt.author(values.author) });
  } catch (err) {
    // Answered by someone else between the read and the write.
    if (err instanceof ApiRejected && err.body.code === QUESTION_NOT_OPEN) throw new UsageError(err.body.message);
    throw err;
  }
  rt.out(`${key}: question ${number} answered`);
}

/** `questions [--project <name>]`: every open question across projects, oldest first. */
export async function questions(rt: Runtime, args: string[]): Promise<void> {
  const { values, positionals } = rt.parse(args, {});
  if (positionals.length > 0) throw new UsageError("questions takes no arguments: questions [--project <name>]");
  const now = new Date();
  const open = (await rt.client().questions(values.project)).questions;
  if (open.length === 0) {
    rt.out(values.project ? `No open questions in ${values.project}.` : "No open questions.");
    return;
  }
  for (const entry of open) rt.out(openQuestionLine(entry, now));
}
