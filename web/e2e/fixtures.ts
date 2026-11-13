import type { Page, Route } from "@playwright/test";

/**
 * A made-up board for the browser tests: the data of the approved comps, word for word (almanac-6,
 * wicket-15, shelfmark-31...), served by `page.route` in place of the API, and a clock frozen at
 * 10:30:06 UTC on 11 Nov 2026. Nothing here is a real ticket.
 */
export const NOW = new Date("2026-11-11T10:30:06.000Z");
export const BASE = "/brief-board/";
const API = "**/brief-board-api/**";

const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000).toISOString();
const H = 60;

interface Spec {
  key: string;
  title: string;
  status: string;
  tags: string[];
  age: number;
  run?: { author: string; started: number; heard: number; stale?: boolean };
  questions?: number;
  blockedBy?: string;
}

function ticket(project: string, s: Spec) {
  const number = Number(s.key.split("-").pop());
  return {
    key: s.key,
    project,
    number,
    title: s.title,
    summary: "Results list with covers and shelf status.",
    summarySource: "agent",
    briefPath: `corpus/briefs/todo/${number}-${s.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`,
    tags: s.tags,
    status: s.status,
    hidden: false,
    createdAt: ago(s.age + 600),
    updatedAt: ago(s.age),
    statusChangedAt: ago(s.age),
    run: s.run
      ? {
          id: 1,
          author: s.run.author,
          message: null,
          startedAt: ago(s.run.started),
          lastHeardAt: ago(s.run.heard),
          stale: s.run.stale ?? false,
          endedAt: null,
          ended: null,
          endedTo: null,
        }
      : null,
    openQuestions: s.questions ?? 0,
    blockedBy: s.blockedBy ?? null,
    sprint: 3,
  };
}

const spec = (
  key: string,
  title: string,
  status: string,
  tags: string[],
  age: number,
  more: Partial<Spec> = {},
): Spec => ({
  key,
  title,
  status,
  tags,
  age,
  ...more,
});

export const LANES = [
  {
    project: "almanac",
    tickets: [
      spec("almanac-5", "A redesign with Hallmark", "todo", ["web", "design"], 12 * H),
      spec("almanac-6", "Reminder times for all-day events", "blocked", ["server"], 40 * H, {
        blockedBy: "Waits on the owner’s choice of default time",
        questions: 1,
      }),
      spec("almanac-4", "The server in the code structure", "ready_for_deploy", ["server"], 5 * H),
      spec("almanac-3", "The web app to Tailwind", "done", ["web"], 26 * H),
    ],
  },
  {
    project: "lantern",
    tickets: [
      spec("lantern-20", "Poster size on phones", "backlog", ["web"], 48 * H),
      spec("lantern-19", "A redesign with Hallmark", "todo", ["web", "design"], 14 * H),
      spec("lantern-18", "The server in the code structure", "done", ["server"], 18 * H),
    ],
  },
  {
    project: "shelfmark",
    tickets: [
      spec("shelfmark-35", "A redesign with Hallmark", "backlog", ["web", "design"], 48 * H),
      spec("shelfmark-34", "Lookup order keeps Google last", "todo", ["server"], 20 * H),
      spec("shelfmark-33", "Change username in the account page", "in_progress", ["web"], 2 * H, {
        run: { author: "builder-a", started: 2 * H, heard: 3 },
      }),
      spec("shelfmark-31", "Search results page", "ready_for_test", ["web"], 8 * H),
      spec("shelfmark-30", "Reading goals", "done", ["web"], 30 * H),
    ],
  },
  {
    project: "wicket",
    tickets: [
      spec("wicket-14", "A redesign with Hallmark", "todo", ["web", "design"], 9 * H),
      spec("wicket-15", "Retry a failed call once", "in_progress", ["server"], H, {
        run: { author: "builder-b", started: 30 * H, heard: 30 * H, stale: true },
      }),
      spec("wicket-13", "The server in the code structure", "done", ["server"], 48 * H),
    ],
  },
].map((lane) => ({ project: lane.project, tickets: lane.tickets.map((s) => ticket(lane.project, s)) }));

const NEEDS = [
  [
    "question",
    "almanac-6",
    "almanac",
    "Reminder times for all-day events",
    "blocked",
    "Which default reminder should a new all-day event get?",
    "builder-a",
  ],
  [
    "stale_run",
    "wicket-15",
    "wicket",
    "Retry a failed call once",
    "in_progress",
    "Run by builder-b, silent for 30 hours",
    "builder-b",
  ],
  [
    "ready_for_test",
    "shelfmark-31",
    "shelfmark",
    "Search results page",
    "ready_for_test",
    "Open the search page, search for a title and check the covers load.",
    "builder-a",
  ],
  [
    "ready_for_deploy",
    "almanac-4",
    "almanac",
    "The server in the code structure",
    "ready_for_deploy",
    "Run node cli.ts almanac server from the deploy checkout.",
    "builder-a",
  ],
].map(([kind, key, project, title, status, reason, by]) => ({
  kind,
  key,
  project,
  title,
  status,
  reason,
  by,
  since: ago(5 * H),
}));

const OLDER = [
  ticket("shelfmark", spec("shelfmark-22", "Import from a CSV file", "done", ["web"], 20 * 24 * H)),
  ticket("almanac", spec("almanac-1", "The house-style harness", "done", ["server"], 25 * 24 * H)),
  ticket("wicket", spec("wicket-9", "Fastify static moves to 10.1.9", "done", ["server"], 31 * 24 * H)),
].map((t, i) => ({
  ...t,
  statusChangedAt: ["2026-10-22T09:00:00.000Z", "2026-10-17T09:00:00.000Z", "2026-10-11T09:00:00.000Z"][i],
}));

const SPRINT = { number: 3, startedOn: "2026-11-02", endedOn: null, doneCount: 0 };
const CLOSED = [
  { number: 2, startedOn: "2026-10-20", endedOn: "2026-11-02", doneCount: 3 },
  { number: 1, startedOn: "2026-10-09", endedOn: "2026-10-20", doneCount: 0 },
];

function detail(key: string) {
  const all = [...LANES.flatMap((l) => l.tickets), ...OLDER];
  const found = all.find((t) => t.key === key) ?? all[0]!;
  const ready = key === "shelfmark-31";
  const blocked = key === "almanac-6";
  return {
    ticket: found,
    comments: ready
      ? [
          {
            id: 1,
            author: "owner",
            body: "Keep the layout as it is, change the look only.",
            role: null,
            move: null,
            createdAt: "2026-11-10T04:30:00.000Z",
          },
          {
            id: 2,
            author: "builder-a",
            body: "Done the form and the server route.\n\n- the form validates before it sends\n- the session stays signed in\n- tests cover both",
            role: "test_notes",
            move: { from: "in_progress", to: "ready_for_test" },
            createdAt: "2026-11-11T02:30:00.000Z",
          },
        ]
      : blocked
        ? [
            {
              id: 3,
              author: "builder-a",
              body: "Which default reminder should a new all-day event get?",
              role: "block_reason",
              move: { from: "in_progress", to: "blocked" },
              createdAt: "2026-11-09T18:30:00.000Z",
            },
          ]
        : [],
    history: ready
      ? [
          {
            from: "in_progress",
            to: "ready_for_test",
            author: "builder-a",
            via: "move",
            at: "2026-11-11T02:30:00.000Z",
          },
          { from: "todo", to: "in_progress", author: "builder-a", via: "move", at: "2026-11-11T00:30:00.000Z" },
        ]
      : [{ from: null, to: found.status, author: "sync", via: "sync", at: found.createdAt }],
    runs: ready
      ? [
          {
            id: 7,
            author: "builder-a",
            message: null,
            startedAt: "2026-11-11T00:30:00.000Z",
            lastHeardAt: "2026-11-11T02:30:00.000Z",
            stale: false,
            endedAt: "2026-11-11T02:30:00.000Z",
            ended: "moved",
            endedTo: "ready_for_test",
            holds: [],
          },
        ]
      : [],
    questions: ready
      ? [
          {
            number: 1,
            text: "Should the form also ask for the current password?",
            author: "builder-a",
            askedAt: "2026-11-10T14:30:00.000Z",
            answer: "Yes, ask for it.",
            answeredBy: "owner",
            answeredAt: "2026-11-10T20:30:00.000Z",
          },
        ]
      : blocked
        ? [
            {
              number: 1,
              text: "Which default reminder should a new all-day event get?",
              author: "builder-a",
              askedAt: "2026-11-09T18:30:00.000Z",
              answer: null,
              answeredBy: null,
              answeredAt: null,
            },
          ]
        : [],
  };
}

export interface StubOptions {
  /** Answer the session question as signed out, or fail the board's GETs. */
  signedOut?: boolean;
  apiDown?: boolean;
  /** An empty board. */
  empty?: boolean;
  /** Hold the session question open, so the gate's loading state stays on screen. */
  hang?: boolean;
  /** Hold the board's GETs open, so a page's loading state stays on screen. */
  hangData?: boolean;
  /** Fail the session question: the gate's "can't be reached" state. */
  sessionDown?: boolean;
}

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

/** Stub the session and every GET the board makes, and freeze the clock. Call before `page.goto`. */
export async function stubBoard(page: Page, options: StubOptions = {}): Promise<void> {
  await page.clock.setFixedTime(NOW);
  await page.route(API, async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace("/brief-board-api", "");
    if (path === "/auth/session") {
      if (options.hang) return new Promise(() => undefined);
      if (options.sessionDown) return route.abort();
      if (options.signedOut) return json(route, { user: null, session: null, ward: { enabled: true, linked: false } });
      return json(route, {
        user: { id: "u1", username: "demo", role: "owner", hasPassword: true },
        session: { origin: "local", expiresAt: NOW.getTime() + 86_400_000 },
        ward: { enabled: true, linked: false },
      });
    }
    if (options.hangData) return new Promise(() => undefined);
    if (options.apiDown && path !== "/auth/session") return route.abort();
    if (path === "/api/board")
      return json(route, { sprint: { number: 3, startedOn: "2026-11-02" }, lanes: options.empty ? [] : LANES });
    if (path === "/api/needs") return json(route, { needs: options.empty ? [] : NEEDS });
    if (path === "/api/done") return json(route, { tickets: options.empty ? [] : OLDER });
    if (path === "/api/sprints") return json(route, { active: SPRINT, closed: CLOSED });
    const sprint = /^\/api\/sprints\/(\d+)$/.exec(path);
    if (sprint)
      return json(route, { sprint: CLOSED.find((s) => s.number === Number(sprint[1])) ?? CLOSED[0], tickets: OLDER });
    const one = /^\/api\/tickets\/(.+)$/.exec(path);
    if (one) return json(route, detail(decodeURIComponent(one[1]!)));
    return json(route, { error: "unstubbed" }, 404);
  });
}
