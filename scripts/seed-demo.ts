/**
 * Demo data for the board (brief 07): tickets across three made-up projects,
 * in every status, with comments of every role, all through the API.
 *
 * Point it at a dev board, never at the real one under data/:
 *
 *   BRIEF_BOARD_DB=/tmp/brief-board-demo.sqlite npm start      # one terminal
 *   node scripts/seed-demo.ts                                   # another
 *
 * It refuses to run if the board already holds any project that isn't one of
 * its own, so it cannot mix demo tickets into a real board. `BRIEF_BOARD_URL`
 * picks the board (default http://127.0.0.1:8806). Node runs this file as is.
 */
import { boardResponseSchema, type MoveRequest, type Status } from "@brief-board/shared";

const BASE = (process.env.BRIEF_BOARD_URL ?? "http://127.0.0.1:8806").replace(/\/+$/, "");
const DEMO_PROJECTS = ["lighthouse", "orchard-app", "paper-kite"];

async function call(method: string, path: string, body?: unknown): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text}`);
  return text ? JSON.parse(text) : undefined;
}

type Step = [Status, string?];

interface Demo {
  key: string;
  title: string;
  summary: string;
  tags: string[];
  steps: Step[];
  comments?: string[];
}

const DEMOS: Demo[] = [
  {
    key: "lighthouse-01",
    title: "Night mode for the map",
    summary: "Dark tiles and a toggle in the header.\n\n- follow the system setting\n- remember an override",
    tags: ["ui"],
    steps: [],
  },
  {
    key: "lighthouse-02",
    title: "Cache tiles for offline use",
    summary: "Keep the last viewed area on the device.",
    tags: ["api", "offline"],
    steps: [["in_progress", "Starting with the service worker."]],
    comments: ["The tile server sends no cache headers; adding them is part of this."],
  },
  {
    key: "lighthouse-03",
    title: "Pick a map provider",
    summary: "Two candidates, different licences.",
    tags: ["infra"],
    steps: [["in_progress"], ["blocked", "The owner decides between the two licences; both are summarised in the brief."]],
  },
  {
    key: "lighthouse-04",
    title: "Search by place name",
    summary: "A search box with suggestions as you type.",
    tags: ["ui"],
    steps: [["in_progress"], ["ready_for_test", "Open `/map`, type *Constan*, and pick a suggestion: the map should fly there."]],
  },
  {
    key: "lighthouse-05",
    title: "Weekly backup of the database",
    summary: "A cron entry and a retention of eight copies.",
    tags: ["infra"],
    steps: [["in_progress"], ["ready_for_deploy", "```\nnode cli.ts lighthouse deploy\nssh vps crontab -l | grep backup\n```"]],
  },
  {
    key: "lighthouse-06",
    title: "Fix the zoom buttons on phones",
    summary: "They overlapped the attribution.",
    tags: ["ui", "bug"],
    steps: [["in_progress"], ["done", "Moved the attribution above the buttons."]],
  },
  {
    // Five of the six roles. Confirmation and conclusion both need a move into
    // Done, and nothing leaves Done, so no ticket can carry all six.
    key: "paper-kite-21",
    title: "Import notes from the old app",
    summary: "Read the old **JSON export** and keep:\n\n1. titles\n2. tags\n3. created dates",
    tags: ["api", "import"],
    steps: [
      ["in_progress", "Starting from the export the owner attached."],
      ["blocked", "The export has two date formats. The owner says which one wins."],
      ["in_progress", "The owner said ISO dates win; the rest are converted."],
      ["ready_for_test", "Import `sample-export.json` from Settings, then open the oldest note."],
      ["in_progress", "Tested: tags with spaces came through split in two."],
      ["ready_for_deploy", "`npm run build && node cli.ts paper-kite deploy`"],
      ["done", "Shipped. Attachments are left for a later brief."],
    ],
    comments: ["A plain note between moves."],
  },
  {
    key: "paper-kite-22",
    title: "Rename the app's bundle id",
    summary: "Needs the owner's developer account.",
    tags: ["infra"],
    steps: [
      ["in_progress"],
      ["blocked", "The owner renames the bundle id in the store console."],
      ["done", "The owner renamed it on 2026-10-09; the build picks up the new id."],
    ],
  },
  {
    key: "paper-kite-23",
    title: "Empty state for a new notebook",
    summary: "",
    tags: ["ui"],
    steps: [["in_progress"]],
  },
  {
    key: "orchard-app-04",
    title: "Harvest calendar export",
    summary: "An .ics feed per orchard.",
    tags: ["api"],
    steps: [["in_progress"], ["done"]],
  },
  {
    key: "orchard-app-05",
    title: "Translate the settings page",
    summary: "Romanian first.",
    tags: ["ui", "i18n"],
    steps: [["in_progress"], ["ready_for_test", "Switch the language and read Settings."], ["done", "Tested by the owner."]],
  },
];

const board = boardResponseSchema.parse(await call("GET", "/api/board?doneDays=3650"));
const foreign = board.lanes.map((lane) => lane.project).filter((project) => !DEMO_PROJECTS.includes(project));
if (foreign.length > 0) {
  console.error(
    `Refusing: the board at ${BASE} already has real projects (${foreign.join(", ")}). ` +
      "Start a dev board with BRIEF_BOARD_DB pointing at a scratch file and seed that.",
  );
  process.exit(1);
}

const existing = new Set(board.lanes.flatMap((lane) => lane.tickets.map((ticket) => ticket.key)));

for (const demo of DEMOS) {
  if (existing.has(demo.key)) {
    console.log(`${demo.key} is already there; skipped`);
    continue;
  }
  const number = Number(demo.key.slice(demo.key.lastIndexOf("-") + 1));
  const brief = `corpus/briefs/${demo.steps.at(-1)?.[0] === "done" ? "done" : "todo"}/${String(number).padStart(2, "0")}-demo.md`;
  await call("PUT", `/api/tickets/${demo.key}`, { title: demo.title, summary: demo.summary, briefPath: brief, tags: demo.tags });
  for (const [index, [to, message]] of demo.steps.entries()) {
    const move: MoveRequest = { to, message, author: index % 2 ? "claude" : "agent" };
    await call("POST", `/api/tickets/${demo.key}/moves`, move);
    if (index === 0) for (const body of demo.comments ?? []) await call("POST", `/api/tickets/${demo.key}/comments`, { body, author: "owner" });
  }
  console.log(`seeded ${demo.key}`);
}
console.log(`Done: ${DEMOS.length} tickets on ${BASE}.`);
