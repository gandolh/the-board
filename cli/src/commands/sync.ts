import { formatTodoKey, parseTodoKey, type Lane, type SyncProject } from "@brief-board/shared";
import { TokenRefused } from "../client.js";
import { Unreachable, UsageError } from "../errors.js";
import type { Runtime } from "../runtime.js";
import { projectsDir, readProjects } from "../sync/read.js";

/**
 * `sync [--project <name>] [--dry-run]`: make the board match the
 * corpora. It runs only when someone runs it (decisions.md "Sync runs only by
 * hand"). It reads every project's briefs and open todos here, on this
 * machine, and sends them in one request; the server applies the rules.
 */
export async function sync(rt: Runtime, args: string[]): Promise<void> {
  const { values, positionals } = rt.parse(args, { "dry-run": { type: "boolean" } });
  if (positionals.length > 0) throw new UsageError("sync takes no arguments: sync [--project <name>] [--dry-run]");
  const dir = projectsDir(rt.ctx.env, rt.ctx.home);
  const projects = readProjects(dir, values.project);
  if (values.project && projects.length === 0) {
    throw new UsageError(`no project "${values.project}" with a corpus/briefs/ under ${dir} or one group folder down`);
  }

  if (values["dry-run"]) {
    rt.out(`Would sync ${projects.length} project(s) from ${dir}:`);
    for (const project of projects) rt.out(describe(project));
    for (const line of await todoChanges(rt, projects)) rt.out(line);
    return;
  }

  const result = await rt.client().sync({ projects });
  const total = projects.reduce((n, p) => n + p.briefs.length, 0);
  rt.out(
    `Synced ${projects.length} project(s), ${total} brief(s): ${result.created} created, ${result.updated} updated, ${result.unchanged} unchanged.`,
  );
  const todos = projects.reduce((n, p) => n + (p.todos?.length ?? 0), 0);
  if (result.todos) {
    const t = result.todos;
    rt.out(`Todo tickets, for ${todos} open todo(s): ${t.created} created, ${t.updated} updated, ${t.unchanged} unchanged, ${t.removed} removed.`);
  } else {
    // A board from before Backlog drops the todos without a word.
    rt.out("warning: the board ignored the todos; it needs the update that added Backlog");
  }
  for (const warning of result.warnings) rt.out(`warning: ${warning}`);
}

/** One project's line in a dry run: counts by state, the open briefs by number, and its open todos. */
function describe({ project, briefs, todos = [] }: SyncProject): string {
  const count = (state: string) => briefs.filter((b) => b.state === state).length;
  const todo = briefs.filter((b) => b.state === "todo").map((b) => b.number);
  return `  ${project}: ${briefs.length} brief(s), ${count("todo")} todo, ${count("done")} done, ${count("superseded")} superseded${
    todo.length ? `; in todo: ${todo.join(", ")}` : ""
  }${todos.length ? `; ${todos.length} open todo(s)` : ""}`;
}

/**
 * The todo tickets a real run would create and remove, from the board as it
 * is. A dry run only reads, so a board it cannot reach leaves just the counts.
 */
async function todoChanges(rt: Runtime, projects: SyncProject[]): Promise<string[]> {
  let lanes: Lane[];
  try {
    ({ lanes } = await rt.client().board());
  } catch (err) {
    if (err instanceof Unreachable || err instanceof TokenRefused) return [`Todo tickets: not compared with the board (${err.message})`];
    throw err;
  }
  const inRun = new Set(projects.map((p) => p.project));
  const wanted = new Set(projects.flatMap((p) => (p.todos ?? []).map((todo) => formatTodoKey(p.project, todo.slug))));
  const onBoard = lanes
    .flatMap((lane) => lane.tickets)
    .filter((ticket) => ticket.status === "backlog" && inRun.has(parseTodoKey(ticket.key)?.project ?? ""))
    .map((ticket) => ticket.key);
  const create = [...wanted].filter((key) => !onBoard.includes(key));
  const remove = onBoard.filter((key) => !wanted.has(key));
  const list = (keys: string[]) => (keys.length ? keys.join(", ") : "none");
  return [`Todo tickets it would create: ${list(create)}`, `Todo tickets it would remove: ${list(remove)}`];
}
