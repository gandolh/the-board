import { UsageError } from "../errors.js";
import { leftoverLines, openRunLine } from "../format.js";
import type { Runtime } from "../runtime.js";

/**
 * `release <ticket> -m <message>`: end a run without a move, for an agent
 * that was stopped and can't end its own. Run by whoever stopped it. The
 * ticket stays In Progress for the owner to decide; the message says why and
 * what the agent left running, and the CLI prints what the run still held.
 */
export async function release(rt: Runtime, args: string[]): Promise<void> {
  const { values, positionals } = rt.parse(args, { message: { type: "string", short: "m" } });
  const key = rt.ticketKey(positionals[0], values.project);
  if (!values.message?.trim()) throw new UsageError('release needs -m "<why, and what the agent left running>"');
  const result = await rt.client().release(key, { message: values.message, author: rt.author(values.author) });
  rt.out(`${key}: released the run by ${result.run.author}; the ticket stays In Progress`);
  for (const line of leftoverLines(key, result.run)) rt.out(line);
}

/**
 * `runs [--project <name>]`: every open run across projects, stalest first,
 * with what each holds. The controller's view of what is being worked.
 */
export async function runs(rt: Runtime, args: string[]): Promise<void> {
  const { values, positionals } = rt.parse(args, {});
  if (positionals.length > 0) throw new UsageError("runs takes no arguments: runs [--project <name>]");
  const now = new Date();
  const open = (await rt.client().runs()).runs.filter((entry) => !values.project || entry.project === values.project);
  if (open.length === 0) {
    rt.out(values.project ? `No open runs in ${values.project}.` : "No open runs.");
    return;
  }
  for (const entry of open) rt.out(openRunLine(entry, now));
}
