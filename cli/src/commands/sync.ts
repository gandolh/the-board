import type { SyncProject } from "@brief-board/shared";
import { UsageError } from "../errors.js";
import type { Runtime } from "../runtime.js";
import { projectsDir, readProjects } from "../sync/read.js";

/**
 * `sync [--project <name>] [--dry-run]` (brief 05): make the board match the
 * corpora. It runs only when someone runs it (decisions.md "Sync runs only by
 * hand"). It reads every project's briefs here, on this machine, and sends them
 * in one request; the server applies the rules (brief 03).
 */
export async function sync(rt: Runtime, args: string[]): Promise<void> {
  const { values, positionals } = rt.parse(args, { "dry-run": { type: "boolean" } });
  if (positionals.length > 0) throw new UsageError("sync takes no arguments: sync [--project <name>] [--dry-run]");
  const dir = projectsDir(rt.ctx.env, rt.ctx.home);
  const projects = readProjects(dir, values.project);
  if (values.project && projects.length === 0) {
    throw new UsageError(`no project "${values.project}" with a corpus/briefs/ under ${dir}`);
  }

  if (values["dry-run"]) {
    rt.out(`Would sync ${projects.length} project(s) from ${dir}:`);
    for (const project of projects) rt.out(describe(project));
    return;
  }

  const result = await rt.client().sync({ projects });
  const total = projects.reduce((n, p) => n + p.briefs.length, 0);
  rt.out(
    `Synced ${projects.length} project(s), ${total} brief(s): ${result.created} created, ${result.updated} updated, ${result.unchanged} unchanged.`,
  );
  for (const warning of result.warnings) rt.out(`warning: ${warning}`);
}

/** One project's line in a dry run: counts by state, and the open briefs by number. */
function describe({ project, briefs }: SyncProject): string {
  const count = (state: string) => briefs.filter((b) => b.state === state).length;
  const todo = briefs.filter((b) => b.state === "todo").map((b) => b.number);
  return `  ${project}: ${briefs.length} brief(s), ${count("todo")} todo, ${count("done")} done, ${count("superseded")} superseded${
    todo.length ? `; in todo: ${todo.join(", ")}` : ""
  }`;
}
