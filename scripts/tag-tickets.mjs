// Tag the active sprint's tickets with their kind, by corpus/wiki/tags.md. A dry run by default: it prints
// the plan and changes nothing. With --apply it adds each planned tag through the board's tags route.
// It talks to the board `brief-board` reaches from this folder, with the CLI's own address and token
// lookups, so run it after building the CLI (`npm run build -w @brief-board/cli`).
//
//   node scripts/tag-tickets.mjs [--dry-run | --apply] [--project <name>] [--author <name>]
import { parseArgs } from "node:util";
import { ApiRejected, BoardClient } from "../cli/dist/client.js";
import { boardToken, boardUrl, repoRoot } from "../cli/dist/context.js";

/** The kinds, by corpus/wiki/tags.md. A ticket that carries one of these is left alone. */
const KINDS = [
  "feature",
  "fix",
  "redesign",
  "base-ui",
  "tailwind",
  "server-structure",
  "harness",
  "deps",
  "tracker",
  "docs",
  "research",
  "infra",
  "skill",
];

/** The skills library's board name: its tickets are `skill` unless a rule above that one says otherwise. */
const SKILLS_LIBRARY = "my-personal-skills";

/**
 * The rules, first match wins, tried on the title and then on the brief's file name. Each is
 * [kind, why, test(text, project)].
 */
const RULES = [
  ["tracker", "(tracker)", (text) => /\(tracker\)/i.test(text)],
  ["tracker", "an estate run's board", (text) => /^the estate\b.*\bboard$/i.test(text)],
  [
    "deps",
    "a version bump",
    (text) => /\bbase ui (to )?\d+\.\d+/i.test(text) || /\bmoves? to \d+\.\d+/i.test(text) || /\bbump\b/i.test(text),
  ],
  ["harness", "the house style / quality harness", (text) => /quality harness|house style/i.test(text)],
  ["skill", "a skill", (text) => /\bskills?\b/i.test(text)],
  ["skill", "the skills library", (_text, project) => project === SKILLS_LIBRARY],
  ["redesign", "a redesign", (text) => /\bredesign/i.test(text)],
  ["base-ui", "Base UI by the conventions", (text) => /\bbase ui\b/i.test(text)],
  ["tailwind", "Tailwind", (text) => /\btailwind\b/i.test(text)],
  ["server-structure", "the code structure", (text) => /code structure/i.test(text)],
  ["infra", "a stack or the deploy", (text) => /\b(stack|deploy|vps|container|caddy)\b/i.test(text)],
  ["docs", "docs", (text) => /\b(readme|docs|documentation)\b/i.test(text)],
  ["research", "research", (text) => /\bresearch\b/i.test(text)],
  ["fix", "a fix", (text) => /\b(fix|fixes|bug|broken|crash|wrong|misses)\b/i.test(text)],
];

/** The kind for a ticket, and why: by its title, then its brief's file name, else the default. */
function kindOf(ticket) {
  const file = (ticket.briefPath.split("/").pop() ?? "").replace(/^\d+-/, "").replace(/\.md$/, "").replace(/-/g, " ");
  for (const text of [ticket.title, file]) {
    for (const [kind, why, test] of RULES) {
      if (test(text, ticket.project)) return { kind, why: text === ticket.title ? why : `${why} (file name)` };
    }
  }
  return { kind: "feature", why: "default: no rule matched" };
}

const { values } = parseArgs({
  options: {
    "dry-run": { type: "boolean" },
    apply: { type: "boolean" },
    project: { type: "string" },
    author: { type: "string" },
  },
  strict: true,
});
if (values["dry-run"] && values.apply) {
  console.error("tag-tickets: --dry-run and --apply contradict each other; pick one");
  process.exit(1);
}
const apply = values.apply === true;
const author = values.author?.trim() || "tag-tickets";

const ctx = { env: process.env, cwd: process.cwd(), home: process.env.HOME ?? "" };
const { url, source } = boardUrl(ctx, repoRoot(ctx.cwd));
const client = new BoardClient(url, boardToken(ctx));
console.log(`Board: ${url} (from the ${source})`);
console.log(apply ? `Applying, as ${author}.` : "Dry run: nothing changes. Pass --apply to tag.");

let tickets;
try {
  const { active } = await client.sprints();
  ({ tickets } = await client.sprint(active.number));
  console.log(`Sprint ${active.number}: ${tickets.length} tickets.`);
} catch (err) {
  console.error(err.message);
  process.exit(err.exitCode ?? 1);
}

const rows = [];
const skipped = { backlog: 0, tagged: 0 };
for (const ticket of tickets) {
  if (values.project && ticket.project !== values.project) continue;
  if (ticket.status === "backlog") {
    skipped.backlog++;
    continue;
  }
  if (ticket.tags.some((tag) => KINDS.includes(tag))) {
    skipped.tagged++;
    continue;
  }
  rows.push({ ticket, ...kindOf(ticket) });
}

const cut = (text, width) => (text.length > width ? `${text.slice(0, width - 1)}…` : text).padEnd(width);
const keyWidth = Math.max(6, ...rows.map((row) => row.ticket.key.length));
console.log("");
console.log(`${"Ticket".padEnd(keyWidth)}  ${"Kind".padEnd(16)}  ${"Why".padEnd(34)}  Title`);
for (const row of rows) {
  console.log(`${row.ticket.key.padEnd(keyWidth)}  ${row.kind.padEnd(16)}  ${cut(row.why, 34)}  ${row.ticket.title}`);
}
const defaults = rows.filter((row) => row.why.startsWith("default")).length;
console.log("");
console.log(
  `${rows.length} to tag (${defaults} by default); skipped ${skipped.tagged} that carry a kind and ${skipped.backlog} in Backlog.`,
);

if (!apply) process.exit(0);

let failed = 0;
for (const row of rows) {
  try {
    const result = await client.tags(row.ticket.key, { add: [row.kind], author });
    console.log(`${row.ticket.key}: ${result.added.length ? `tagged ${row.kind}` : "already tagged"}`);
  } catch (err) {
    // A refusal is this ticket's: a closed sprint, Backlog since the read, a board older than tags.
    if (!(err instanceof ApiRejected)) {
      console.error(err.message);
      process.exit(err.exitCode ?? 1);
    }
    failed++;
    console.log(`${row.ticket.key}: skipped, ${err.body.code}: ${err.message}`);
  }
}
console.log(`Done: ${rows.length - failed} tagged, ${failed} skipped.`);
