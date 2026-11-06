import { HOLD_KINDS, holdKindSchema, NO_OPEN_RUN, NOT_HELD, type HoldKind } from "@brief-board/shared";
import { ApiRejected } from "../client.js";
import { UsageError } from "../errors.js";
import { ago } from "../format.js";
import type { Runtime } from "../runtime.js";

/**
 * `hold` and `drop`: what the ticket's open run started that outlives a
 * command (a port, a pid, a container, a path), so whoever stops the agent
 * knows what to clean up. Free text, checked against nothing on the machine.
 * A record, never a lock: holding what another open run holds warns and goes
 * ahead. No open run, or dropping what the run doesn't hold, is a usage
 * mistake (exit 1).
 */

function holdArgs(rt: Runtime, verb: "hold" | "drop", args: string[]): { key: string; kind: HoldKind; value: string } {
  const { values, positionals } = rt.parse(args, {});
  const usage = `${verb} <ticket> ${HOLD_KINDS.join("|")} <value>`;
  if (positionals.length !== 3) throw new UsageError(usage);
  const key = rt.ticketKey(positionals[0], values.project);
  const kind = holdKindSchema.safeParse(positionals[1]!.trim().toLowerCase());
  if (!kind.success) throw new UsageError(`"${positionals[1]}" is not a kind to ${verb}. One of: ${HOLD_KINDS.join(", ")}`);
  const value = positionals[2]!.trim();
  if (!value) throw new UsageError(usage);
  return { key, kind: kind.data, value };
}

/** The board's refusals that are the caller's mistake, as usage errors. */
async function asUsage<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (err) {
    if (err instanceof ApiRejected && (err.body.code === NO_OPEN_RUN || err.body.code === NOT_HELD)) throw new UsageError(err.body.message);
    throw err;
  }
}

/** `hold <ticket> <kind> <value>` */
export async function hold(rt: Runtime, args: string[]): Promise<void> {
  const { key, kind, value } = holdArgs(rt, "hold", args);
  const result = await asUsage(() => rt.client().hold(key, { kind, value }));
  const now = new Date();
  for (const { key: other, run } of result.clashes) {
    rt.ctx.err(
      `brief-board: warning: ${kind} ${value} is also held by the open run on ${other} (${run.author}, heard ${ago(run.lastHeardAt, now)} ago${run.stale ? ", stale" : ""}). The hold goes ahead: it is a record, not a lock.`,
    );
  }
  rt.out(result.held ? `${key}: the run holds ${kind} ${value}` : `${key}: the run already holds ${kind} ${value}`);
}

/** `drop <ticket> <kind> <value>` */
export async function drop(rt: Runtime, args: string[]): Promise<void> {
  const { key, kind, value } = holdArgs(rt, "drop", args);
  await asUsage(() => rt.client().drop(key, { kind, value }));
  rt.out(`${key}: dropped ${kind} ${value}`);
}
