import { SPRINT_CHANGED } from "@brief-board/shared";
import { ApiRejected } from "../client.js";
import { UsageError } from "../errors.js";
import type { Runtime } from "../runtime.js";

/** "1 ticket", "41 tickets". */
export function ticketCount(n: number): string {
  return `${n} ticket${n === 1 ? "" : "s"}`;
}

const USAGE = "sprint names the active sprint; sprint start <number> starts the next one, on the owner's ask";

/**
 * `sprint`: the active sprint, the day it started and how many tickets it
 * holds, one line, read only. `sprint start <N>`: close the active sprint
 * and start sprint N, the active number plus one, moving every ticket that
 * is not Done into it. The guide says an agent runs it only when the owner
 * asks, as with sync: nothing undoes it. A stale N (someone started it
 * already) is a usage mistake, exit 1, with the board's message.
 */
export async function sprint(rt: Runtime, args: string[]): Promise<void> {
  const { positionals } = rt.parse(args, {});
  if (positionals.length === 0) return active(rt);
  const [verb, number, ...rest] = positionals;
  if (verb !== "start" || number === undefined || !/^\d+$/.test(number) || rest.length > 0) throw new UsageError(USAGE);
  return start(rt, Number.parseInt(number, 10));
}

async function active(rt: Runtime): Promise<void> {
  const client = rt.client();
  const { active } = await client.sprints();
  const { tickets } = await client.sprint(active.number);
  rt.out(`Sprint ${active.number}, since ${active.startedOn}, ${ticketCount(tickets.length)}`);
}

async function start(rt: Runtime, number: number): Promise<void> {
  try {
    const { sprint, closed, moved } = await rt.client().startSprint({ number });
    const stay = `${closed.doneCount} ${closed.doneCount === 1 ? "stays" : "stay"} in sprint ${closed.number}`;
    rt.out(`Sprint ${sprint.number} started; ${ticketCount(moved)} moved, ${stay}.`);
  } catch (err) {
    if (err instanceof ApiRejected && err.body.code === SPRINT_CHANGED) throw new UsageError(err.body.message);
    throw err;
  }
}
