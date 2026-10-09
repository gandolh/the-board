import { readdirSync } from "node:fs";
import { join } from "node:path";
import { UsageError } from "../errors.js";
import type { Runtime } from "../runtime.js";
import { label } from "../format.js";

const BRIEF_DIRS = ["todo", "done", "superseded"] as const;

/** `corpus/briefs/{todo,done,superseded}/<NN>-*.md`, relative to the repo root. */
export function findBrief(root: string, number: number): string | null {
  for (const dir of BRIEF_DIRS) {
    let names: string[];
    try {
      names = readdirSync(join(root, "corpus", "briefs", dir));
    } catch {
      continue;
    }
    const match = names.find((name) => {
      const m = /^(\d+)-.+\.md$/.exec(name);
      return m !== null && Number.parseInt(m[1]!, 10) === number;
    });
    if (match) return `corpus/briefs/${dir}/${match}`;
  }
  return null;
}

/** `create <number> --title <t> --summary <s> [--tag <label>]... [--brief <path>]` */
export async function create(rt: Runtime, args: string[]): Promise<void> {
  const { values, positionals } = rt.parse(args, {
    title: { type: "string" },
    summary: { type: "string" },
    tag: { type: "string", multiple: true },
    brief: { type: "string" },
  });
  const raw = positionals[0];
  if (!raw || !/^\d+$/.test(raw)) throw new UsageError("create takes the brief number: create <number> --title <t> --summary <s>");
  if (!values.title) throw new UsageError("create needs --title");
  if (values.summary === undefined) throw new UsageError("create needs --summary");
  const number = Number.parseInt(raw, 10);
  const key = rt.ticketKey(raw, values.project);

  let briefPath = values.brief;
  if (!briefPath) {
    if (!rt.root) throw new UsageError("not inside a git repo: pass --brief <path>");
    briefPath = findBrief(rt.root, number) ?? undefined;
    if (!briefPath) throw new UsageError(`no brief numbered ${number} in corpus/briefs/: file the brief first, or pass --brief <path>`);
  }

  // The contract's PUT carries no author: a ticket's creation is recorded as
  // the board's default author.
  const { created, ticket } = await rt.client().upsert(key, {
    title: values.title,
    summary: values.summary,
    briefPath,
    tags: values.tag ?? [],
  });
  rt.out(`${created ? "Created" : "Updated"} ${ticket.key} (${label(ticket.status)}): ${ticket.title}`);
}
