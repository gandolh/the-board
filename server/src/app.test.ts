import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MOVES,
  type BoardResponse,
  type ErrorBody,
  type MoveResponse,
  type Status,
  type SyncBrief,
  type SyncResponse,
  type TicketDetailResponse,
  type UpsertTicketResponse,
} from "@brief-board/shared";
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify";
import { seedUser } from "./accounts.js";
import { buildApp, SESSION_COOKIE, stripApiPrefix } from "./app.js";

/** The CLI's token on every test app; `call` sends it, as the CLI does. */
const TOKEN = "s".repeat(44);
const BEARER = { authorization: `Bearer ${TOKEN}` };

let app: FastifyInstance;
let clock: Date;

beforeEach(async () => {
  clock = new Date("2026-10-09T12:00:00.000Z");
  app = await buildApp({ dbPath: ":memory:", now: () => clock, token: TOKEN });
});
afterEach(async () => {
  await app.close();
});

/** `app.inject` as the CLI: with the token. */
function call(options: InjectOptions): Promise<LightMyRequestResponse> {
  return app.inject({ ...options, headers: { ...BEARER, ...options.headers } });
}

const put = (key: string, fields: Partial<{ title: string; summary: string; briefPath: string; tags: string[] }> = {}) =>
  call({
    method: "PUT",
    url: `/api/tickets/${key}`,
    payload: { title: "A brief", summary: "", briefPath: "corpus/briefs/todo/01-a.md", ...fields },
  });
const move = (key: string, to: Status, message?: string) =>
  call({ method: "POST", url: `/api/tickets/${key}/moves`, payload: { to, message } });
const detail = async (key: string) => (await call({ url: `/api/tickets/${key}` })).json<TicketDetailResponse>();
const board = async (query = "") => (await call({ url: `/api/board${query}` })).json<BoardResponse>();
const sync = async (project: string, briefs: Partial<SyncBrief>[]) =>
  (
    await call({
      method: "POST",
      url: "/api/sync",
      payload: {
        projects: [
          {
            project,
            briefs: briefs.map((b) => ({
              title: `Brief ${b.number}`,
              summary: `Summary ${b.number}`,
              briefPath: `corpus/briefs/${b.state ?? "todo"}/${b.number}-x.md`,
              state: "todo",
              ...b,
            })),
          },
        ],
      },
    })
  ).json<SyncResponse>();

/** A route to each status from To Do, through the table. */
const PATH_TO: Record<Status, [Status, string?][]> = {
  todo: [],
  in_progress: [["in_progress"]],
  blocked: [["in_progress"], ["blocked", "owner decides"]],
  ready_for_test: [["in_progress"], ["ready_for_test", "try it"]],
  ready_for_deploy: [["in_progress"], ["ready_for_deploy", "npm run deploy"]],
  done: [["in_progress"], ["done"]],
};

async function ticketIn(key: string, status: Status) {
  await put(key);
  for (const [to, message] of PATH_TO[status]) expect((await move(key, to, message)).statusCode).toBe(200);
}

describe("moves through the route", () => {
  for (const [index, rule] of MOVES.entries()) {
    it(`${rule.from} → ${rule.to} works with its ${rule.role}, and keeps the message`, async () => {
      const key = `p-${index + 1}`;
      await ticketIn(key, rule.from);
      const res = await move(key, rule.to, "what happened");
      expect(res.statusCode).toBe(200);
      const body = res.json<MoveResponse>();
      expect(body.ticket.status).toBe(rule.to);
      expect(body.comment).toMatchObject({ body: "what happened", role: rule.role, move: { from: rule.from, to: rule.to } });
      const { history } = await detail(key);
      expect(history.at(-1)).toMatchObject({ from: rule.from, to: rule.to, via: "move", author: "agent" });
    });

    if (rule.message === "required") {
      it(`${rule.from} → ${rule.to} is refused without its message`, async () => {
        const key = `q-${index + 1}`;
        await ticketIn(key, rule.from);
        const res = await move(key, rule.to);
        expect(res.statusCode).toBe(400);
        const body = res.json<ErrorBody>();
        expect(body.code).toBe("message_required");
        expect(body.allowed?.length).toBeGreaterThan(0);
        expect((await detail(key)).ticket.status).toBe(rule.from);
      });
    }
  }

  it("a move with no message stores no comment", async () => {
    await put("p-90");
    const body = (await move("p-90", "in_progress")).json<MoveResponse>();
    expect(body.comment).toBeNull();
    expect((await detail("p-90")).comments).toEqual([]);
  });
});

describe("error bodies", () => {
  it("a move the table does not list is 400 move_not_allowed, with the allowed moves", async () => {
    await put("p-01");
    const res = await move("p-01", "blocked", "too early");
    expect(res.statusCode).toBe(400);
    const body = res.json<ErrorBody>();
    expect(body.code).toBe("move_not_allowed");
    expect(body.allowed).toEqual([{ from: "todo", to: "in_progress", message: "optional", role: "comment" }]);
    expect(body.message).toContain("To Do");
  });

  it("an unknown ticket is 404 not_found, for reads, moves and comments", async () => {
    for (const res of [
      await call({ url: "/api/tickets/nobody-07" }),
      await move("nobody-07", "in_progress"),
      await call({ method: "POST", url: "/api/tickets/nobody-07/comments", payload: { body: "hi" } }),
    ]) {
      expect(res.statusCode).toBe(404);
      expect(res.json<ErrorBody>().code).toBe("not_found");
    }
  });

  it("a malformed key is 400 invalid_key, and a bad body 400 invalid_request", async () => {
    expect((await call({ url: "/api/tickets/no-number" })).json<ErrorBody>().code).toBe("invalid_key");
    const res = await call({ method: "PUT", url: "/api/tickets/p-01", payload: { summary: "no title" } });
    expect(res.statusCode).toBe(400);
    expect(res.json<ErrorBody>().code).toBe("invalid_request");
  });

  it("an unknown API route is a 404 in the same shape", async () => {
    const res = await call({ url: "/api/nothing" });
    expect(res.statusCode).toBe(404);
    expect(res.json<ErrorBody>().code).toBe("not_found");
  });
});

describe("tickets", () => {
  it("creating twice leaves one ticket, updated, with its status untouched", async () => {
    const first = await put("sports-app-1", { title: "First" });
    expect(first.statusCode).toBe(201);
    expect(first.json<UpsertTicketResponse>()).toMatchObject({ created: true, ticket: { key: "sports-app-01", status: "todo" } });
    await move("sports-app-01", "in_progress");
    const second = await put("sports-app-01", { title: "Second", tags: ["ui", "sports-app", "ui"] });
    expect(second.statusCode).toBe(200);
    expect(second.json<UpsertTicketResponse>()).toMatchObject({
      created: false,
      ticket: { title: "Second", status: "in_progress", summarySource: "agent", tags: ["ui"] },
    });
    expect((await board()).lanes.flatMap((lane) => lane.tickets)).toHaveLength(1);
  });

  it("returns comments and history oldest first", async () => {
    await put("p-01");
    await move("p-01", "in_progress", "starting");
    await call({ method: "POST", url: "/api/tickets/p-01/comments", payload: { body: "a note", author: "owner" } });
    const { comments, history } = await detail("p-01");
    expect(comments.map((c) => [c.body, c.role, c.author])).toEqual([
      ["starting", "comment", "agent"],
      ["a note", null, "owner"],
    ]);
    expect(history.map((h) => [h.from, h.to])).toEqual([
      [null, "todo"],
      ["todo", "in_progress"],
    ]);
  });
});

describe("the board", () => {
  it("has one lane per project, alphabetically, and none for a project with nothing visible", async () => {
    await put("zeta-01");
    await put("Alpha-02");
    await put("beta-01");
    await sync("beta", [{ number: 1, state: "superseded" }]);
    expect((await board()).lanes.map((lane) => lane.project)).toEqual(["Alpha", "zeta"]);
  });

  it("shows Done for doneDays (14 by default), then drops it", async () => {
    await ticketIn("p-01", "done");
    expect((await board()).lanes).toHaveLength(1);
    clock = new Date(clock.getTime() + 15 * 24 * 60 * 60 * 1000);
    expect((await board()).lanes).toHaveLength(0);
    expect((await board("?doneDays=30")).lanes).toHaveLength(1);
  });

  it("filters on a tag", async () => {
    await put("p-01", { tags: ["ui"] });
    await put("p-02", { tags: ["api"] });
    const lanes = (await board("?tag=ui")).lanes;
    expect(lanes.flatMap((lane) => lane.tickets.map((t) => t.key))).toEqual(["p-01"]);
  });
});

describe("sync", () => {
  it("creates a ticket for a brief in todo/, in To Do, its summary from the brief", async () => {
    expect(await sync("atrium", [{ number: 83 }])).toMatchObject({ created: 1, updated: 0, warnings: [] });
    const { ticket, history } = await detail("atrium-83");
    expect(ticket).toMatchObject({ status: "todo", summarySource: "sync", summary: "Summary 83" });
    expect(history).toEqual([expect.objectContaining({ from: null, to: "todo", via: "sync", author: "sync" })]);
  });

  it("refreshes title and path, and the summary only if sync wrote it", async () => {
    await sync("atrium", [{ number: 1 }, { number: 2 }]);
    await put("atrium-02", { title: "Agent title", summary: "Agent summary" });
    const res = await sync("atrium", [
      { number: 1, title: "New 1", summary: "New summary 1" },
      { number: 2, title: "New 2", summary: "New summary 2" },
    ]);
    expect(res).toMatchObject({ created: 0, updated: 2 });
    expect((await detail("atrium-01")).ticket).toMatchObject({ title: "New 1", summary: "New summary 1" });
    expect((await detail("atrium-02")).ticket).toMatchObject({ title: "New 2", summary: "Agent summary", summarySource: "agent" });
    expect(await sync("atrium", [{ number: 1, title: "New 1", summary: "New summary 1" }, { number: 2, title: "New 2" }])).toMatchObject({
      unchanged: 2,
    });
  });

  it("closes To Do, In Progress and Blocked tickets whose brief is in done/, without the table", async () => {
    await ticketIn("p-01", "todo");
    await ticketIn("p-02", "in_progress");
    await ticketIn("p-03", "blocked");
    const res = await sync("p", [1, 2, 3].map((number) => ({ number, state: "done" as const })));
    expect(res.updated).toBe(3);
    for (const key of ["p-01", "p-02", "p-03"]) {
      const { ticket, comments, history } = await detail(key);
      expect(ticket.status).toBe("done");
      expect(ticket.briefPath).toContain("/done/");
      expect(history.at(-1)).toMatchObject({ to: "done", via: "sync", author: "sync" });
      expect(comments.at(-1)).toMatchObject({ body: "Closed by sync: the brief is in done/.", role: "conclusion", author: "sync" });
    }
  });

  it("leaves Ready for test and Ready for deploy alone when the brief is done", async () => {
    await ticketIn("p-01", "ready_for_test");
    await ticketIn("p-02", "ready_for_deploy");
    await sync("p", [1, 2].map((number) => ({ number, state: "done" as const })));
    expect((await detail("p-01")).ticket.status).toBe("ready_for_test");
    expect((await detail("p-02")).ticket.status).toBe("ready_for_deploy");
  });

  it("does not backfill a ticket for a brief already in done/", async () => {
    expect(await sync("p", [{ number: 5, state: "done" }])).toMatchObject({ created: 0 });
    expect((await call({ url: "/api/tickets/p-05" })).statusCode).toBe(404);
  });

  it("hides the ticket of a superseded brief", async () => {
    await sync("p", [{ number: 1 }]);
    await sync("p", [{ number: 1, state: "superseded" }]);
    expect((await detail("p-01")).ticket.hidden).toBe(true);
    expect((await board()).lanes).toEqual([]);
  });

  it("warns, and changes nothing, for a Done ticket whose brief is in todo/ and for a ticket with no brief", async () => {
    await ticketIn("p-01", "done");
    await put("p-02");
    const res = await sync("p", [{ number: 1, title: "Changed" }]);
    expect(res.warnings).toEqual([
      "p-01 is Done on the board but its brief is in todo/; nothing changed",
      "p-02: no brief with this number in p's corpus; nothing changed",
    ]);
    expect((await detail("p-01")).ticket).toMatchObject({ status: "done", title: "A brief" });
    expect((await detail("p-02")).ticket.status).toBe("todo");
  });

  it("touches only the projects in the payload", async () => {
    await put("other-01");
    expect((await sync("p", [{ number: 1 }])).warnings).toEqual([]);
    expect((await detail("other-01")).ticket.status).toBe("todo");
  });
});

describe("serving the board", () => {
  it("serves web/dist at /brief-board/ and falls back to index.html there, but not under /api", async () => {
    const dir = mkdtempSync(join(tmpdir(), "brief-board-web-"));
    writeFileSync(join(dir, "index.html"), "<title>brief-board</title>");
    mkdirSync(join(dir, "assets"));
    writeFileSync(join(dir, "assets", "app.js"), "console.log('board')");
    const served = await buildApp({ dbPath: ":memory:", webDist: dir, token: TOKEN });
    try {
      const root = await served.inject({ url: "/" });
      expect(root.statusCode).toBe(302);
      expect(root.headers.location).toBe("/brief-board/");
      expect((await served.inject({ url: "/brief-board" })).headers.location).toBe("/brief-board/");
      expect((await served.inject({ url: "/brief-board/" })).body).toContain("brief-board");
      expect((await served.inject({ url: "/brief-board/anything" })).body).toContain("<title>brief-board</title>");
      expect((await served.inject({ url: "/brief-board/assets/app.js" })).body).toContain("board");
      expect((await served.inject({ url: "/lanes/atrium" })).statusCode).toBe(404);
      const missing = await served.inject({ url: "/api/missing", headers: BEARER });
      expect(missing.statusCode).toBe(404);
      expect(missing.json<ErrorBody>().code).toBe("not_found");
      expect((await served.inject({ url: "/brief-board-api/api/missing", headers: BEARER })).json<ErrorBody>().code).toBe("not_found");
      // Signed out, the board's files still load (the login page is one of them), and the API doesn't.
      expect((await served.inject({ url: "/brief-board/login" })).statusCode).toBe(200);
      expect((await served.inject({ url: "/api/missing" })).statusCode).toBe(401);
    } finally {
      await served.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("the API prefix", () => {
  it("answers under /brief-board-api, as the browser asks, and bare, as Caddy and the CLI ask", async () => {
    expect((await app.inject({ url: "/api/health" })).json()).toEqual({ ok: true });
    expect((await app.inject({ url: "/brief-board-api/api/health" })).json()).toEqual({ ok: true });
    expect((await call({ url: "/brief-board-api/api/board?doneDays=3" })).statusCode).toBe(200);
  });

  it("strips the prefix only when a slash, a query or the end follows it", async () => {
    expect((await app.inject({ url: "/brief-board-apix/api/health" })).statusCode).toBe(404);
    expect(stripApiPrefix("/brief-board-apix/api/health")).toBe("/brief-board-apix/api/health");
    expect(stripApiPrefix("/brief-board-api/api/health")).toBe("/api/health");
    expect(stripApiPrefix("/brief-board-api")).toBe("/");
    expect(stripApiPrefix("/brief-board-api?x=1")).toBe("/?x=1");
    expect(stripApiPrefix("/api/health")).toBe("/api/health");
  });
});

describe("the CLI's token", () => {
  const TOKEN = "t".repeat(40);
  const routes = [
    { name: "a read", method: "GET" as const, url: "/api/board" },
    { name: "a write", method: "PUT" as const, url: "/api/tickets/atrium-01", payload: { title: "A", summary: "", briefPath: "corpus/briefs/todo/01-a.md" } },
    { name: "a sync", method: "POST" as const, url: "/api/sync", payload: { projects: [] } },
  ];

  it("closes the bearer path when no token is configured", async () => {
    const tokenless = await buildApp({ dbPath: ":memory:" });
    try {
      for (const route of routes) {
        expect((await tokenless.inject(route)).statusCode, `${route.name} with no header`).toBe(401);
        expect((await tokenless.inject({ ...route, headers: { authorization: "Bearer " } })).statusCode).toBe(401);
        expect((await tokenless.inject({ ...route, headers: BEARER })).statusCode, `${route.name} with some token`).toBe(401);
      }
      expect((await tokenless.inject({ url: "/api/health" })).statusCode).toBe(200);
    } finally {
      await tokenless.close();
    }
  });

  it("needs the right Bearer header on reads, writes and sync once one is configured", async () => {
    const guarded = await buildApp({ dbPath: ":memory:", token: TOKEN });
    try {
      for (const route of routes) {
        const missing = await guarded.inject(route);
        expect(missing.statusCode, `${route.name} without a token`).toBe(401);
        expect(missing.json<ErrorBody>().code).toBe("unauthorized");
        const wrong = await guarded.inject({ ...route, headers: { authorization: `Bearer ${"x".repeat(40)}` } });
        expect(wrong.statusCode, `${route.name} with a wrong token`).toBe(401);
        const short = await guarded.inject({ ...route, headers: { authorization: "Bearer t" } });
        expect(short.statusCode, `${route.name} with a shorter token`).toBe(401);
        const bare = await guarded.inject({ ...route, headers: { authorization: TOKEN } });
        expect(bare.statusCode, `${route.name} without the Bearer scheme`).toBe(401);
        const right = await guarded.inject({ ...route, headers: { authorization: `Bearer ${TOKEN}` } });
        expect(right.statusCode, `${route.name} with the token`).toBeLessThan(300);
      }
      // Behind the browser's prefix too.
      expect((await guarded.inject({ url: "/brief-board-api/api/board" })).statusCode).toBe(401);
    } finally {
      await guarded.close();
    }
  });

  it("keeps health open for the deploy's check", async () => {
    const guarded = await buildApp({ dbPath: ":memory:", token: TOKEN });
    try {
      expect((await guarded.inject({ url: "/api/health" })).json()).toEqual({ ok: true });
      expect((await guarded.inject({ url: "/brief-board-api/api/health" })).statusCode).toBe(200);
    } finally {
      await guarded.close();
    }
  });
});

describe("signing in", () => {
  const PASSWORD = "p".repeat(12);
  const signIn = async (): Promise<string> => {
    await seedUser(app.accounts, { username: "owner", password: PASSWORD });
    const res = await app.inject({ method: "POST", url: "/brief-board-api/auth/login", payload: { username: "owner", password: PASSWORD } });
    expect(res.statusCode).toBe(200);
    const header = res.headers["set-cookie"];
    const lines = header === undefined ? [] : Array.isArray(header) ? header : [header];
    const line = lines.find((l) => l.startsWith(`${SESSION_COOKIE}=`));
    expect(line).toContain("Path=/brief-board-api");
    return line!.split(";")[0]!;
  };

  it("refuses the board signed out, in the API's error shape", async () => {
    const res = await app.inject({ url: "/brief-board-api/api/board" });
    expect(res.statusCode).toBe(401);
    expect(res.json<ErrorBody>().code).toBe("unauthorized");
    expect((await app.inject({ url: "/brief-board-api/auth/session" })).statusCode).toBe(200);
  });

  it("reads the board and a ticket with a local session", async () => {
    await call({ method: "PUT", url: "/api/tickets/atrium-01", payload: { title: "A", summary: "", briefPath: "corpus/briefs/todo/01-a.md" } });
    const cookie = await signIn();
    const board = await app.inject({ url: "/brief-board-api/api/board", headers: { cookie } });
    expect(board.statusCode).toBe(200);
    expect(board.json<BoardResponse>().lanes.map((lane) => lane.project)).toEqual(["atrium"]);
    expect((await app.inject({ url: "/brief-board-api/api/tickets/atrium-01", headers: { cookie } })).statusCode).toBe(200);
    const session = await app.inject({ url: "/brief-board-api/auth/session", headers: { cookie } });
    expect(session.json<{ user: { username: string } }>().user.username).toBe("owner");
  });

  it("refuses a session's writes and sync, and keeps it signed in", async () => {
    await call({ method: "PUT", url: "/api/tickets/atrium-01", payload: { title: "A", summary: "", briefPath: "corpus/briefs/todo/01-a.md" } });
    const cookie = await signIn();
    const writes: InjectOptions[] = [
      { method: "PUT", url: "/brief-board-api/api/tickets/atrium-02", payload: { title: "B", summary: "", briefPath: "corpus/briefs/todo/02-b.md" } },
      { method: "POST", url: "/brief-board-api/api/tickets/atrium-01/comments", payload: { body: "hi" } },
      { method: "POST", url: "/brief-board-api/api/tickets/atrium-01/moves", payload: { to: "in_progress" } },
      { method: "POST", url: "/brief-board-api/api/sync", payload: { projects: [] } },
    ];
    for (const write of writes) {
      const res = await app.inject({ ...write, headers: { cookie } });
      expect(res.statusCode, `${write.method} ${write.url}`).toBe(401);
      expect(res.json<ErrorBody & { reason?: string }>()).toMatchObject({ code: "unauthorized", reason: "read_only_session" });
      expect(res.headers["set-cookie"], "the cookie is not cleared").toBeUndefined();
    }
    expect((await detail("atrium-01")).comments).toEqual([]);
    expect((await app.inject({ url: "/brief-board-api/api/board", headers: { cookie } })).statusCode).toBe(200);
    expect((await app.inject({ url: "/brief-board-api/auth/session", headers: { cookie } })).json<{ user: unknown }>().user).not.toBeNull();
  });

  it("still lets the token read and write, with or without a cookie", async () => {
    const cookie = await signIn();
    const put = { method: "PUT" as const, url: "/api/tickets/atrium-03", payload: { title: "C", summary: "", briefPath: "corpus/briefs/todo/03-c.md" } };
    expect((await call(put)).statusCode).toBe(201);
    expect((await app.inject({ ...put, headers: { ...BEARER, cookie } })).statusCode).toBe(200);
    expect((await call({ url: "/api/board" })).statusCode).toBe(200);
  });

  it("keeps health open", async () => {
    expect((await app.inject({ url: "/api/health" })).json()).toEqual({ ok: true });
    expect((await app.inject({ method: "HEAD", url: "/brief-board-api/api/health" })).statusCode).toBe(200);
  });
});
