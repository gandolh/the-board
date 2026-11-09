import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MOVES,
  type AnswerResponse,
  type BoardResponse,
  type CommentResponse,
  type DoneResponse,
  type DropResponse,
  type ErrorBody,
  type HoldResponse,
  type MoveResponse,
  type NeedsResponse,
  type QuestionsResponse,
  type ReleaseResponse,
  type RunsResponse,
  type StartResponse,
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
const olderDone = async (query = "") => (await call({ url: `/api/done${query}` })).json<DoneResponse>();
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
  // Never reached through the table: only sync puts a ticket in Backlog.
  backlog: [],
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

describe("older Done", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const keys = async (query = "") => (await olderDone(query)).tickets.map((t) => t.key);
  const onBoard = async (query = "") => (await board(query)).lanes.flatMap((lane) => lane.tickets.map((t) => t.key));
  /** Done at the clock's time, then the clock moves on `days`. */
  const doneThen = async (key: string, days: number, tags: string[] = []) => {
    await put(key, { tags });
    for (const [to, message] of PATH_TO.done) await move(key, to, message);
    clock = new Date(clock.getTime() + days * DAY);
  };

  it("lists only Done tickets that are not hidden and older than 14 days", async () => {
    await doneThen("p-01", 0);
    await sync("p", [{ number: 1, state: "superseded" }]);
    await doneThen("p-02", 0);
    await ticketIn("p-03", "ready_for_deploy");
    await ticketIn("p-04", "todo");
    clock = new Date(clock.getTime() + 20 * DAY);
    await doneThen("p-05", 3);
    expect(await keys()).toEqual(["p-02"]);
    expect(await onBoard()).toEqual(["p-03", "p-04", "p-05"]);
  });

  it("orders by project as the board does, newest Done first in each", async () => {
    await doneThen("beta-01", 1);
    await doneThen("Alpha-02", 1);
    await doneThen("beta-03", 1);
    await doneThen("alpha-01", 1);
    await doneThen("Alpha-01", 1);
    clock = new Date(clock.getTime() + 15 * DAY);
    expect(await keys()).toEqual(["Alpha-01", "Alpha-02", "alpha-01", "beta-03", "beta-01"]);
  });

  it("narrows to a tag, and moves the cutoff with olderThanDays", async () => {
    await doneThen("p-01", 10, ["ui"]);
    await doneThen("p-02", 10, ["api"]);
    expect(await keys()).toEqual(["p-01"]);
    expect(await keys("?olderThanDays=5")).toEqual(["p-02", "p-01"]);
    expect(await keys("?olderThanDays=5&tag=ui")).toEqual(["p-01"]);
    expect(await keys("?tag=none")).toEqual([]);
  });

  it("puts a ticket exactly at the cutoff on the board, and a millisecond later on the page", async () => {
    await doneThen("p-01", 14);
    expect(await onBoard()).toEqual(["p-01"]);
    expect(await keys()).toEqual([]);
    clock = new Date(clock.getTime() + 1);
    expect(await onBoard()).toEqual([]);
    expect(await keys()).toEqual(["p-01"]);
  });

  it("refuses an olderThanDays outside the board's bounds", async () => {
    for (const bad of ["-1", "3651", "1.5", "x"]) {
      const res = await call({ url: `/api/done?olderThanDays=${bad}` });
      expect(res.statusCode).toBe(400);
      expect(res.json<ErrorBody>().code).toBe("invalid_request");
    }
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

  it("closes To Do, In Progress (with no open run) and Blocked tickets whose brief is in done/, without the table", async () => {
    await ticketIn("p-01", "todo");
    await ticketIn("p-02", "in_progress");
    await call({ method: "POST", url: "/api/tickets/p-02/release", payload: { message: "stopped" } });
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

describe("runs", () => {
  const HOUR = 60 * 60 * 1000;
  const later = (ms: number) => {
    clock = new Date(clock.getTime() + ms);
  };
  const start = (key: string, author?: string, message?: string) =>
    call({ method: "POST", url: `/api/tickets/${key}/start`, payload: { author, message } });
  const release = (key: string, message?: string, author?: string) =>
    call({ method: "POST", url: `/api/tickets/${key}/release`, payload: { message, author } });
  const comment = (key: string, body: string, author?: string) =>
    call({ method: "POST", url: `/api/tickets/${key}/comments`, payload: { body, author } });
  const runs = async () => (await call({ url: "/api/runs" })).json<RunsResponse>().runs;

  it("start opens a run, with its author, its message and its times", async () => {
    await put("p-01");
    const res = await start("p-01", "ana", "Starting with the parser");
    expect(res.statusCode).toBe(200);
    const body = res.json<StartResponse>();
    expect(body).toMatchObject({ resumed: false, passedFrom: null, ticket: { status: "in_progress" } });
    expect(body.comment).toMatchObject({ body: "Starting with the parser", move: { from: "todo", to: "in_progress" } });
    expect(body.ticket.run).toMatchObject({
      author: "ana",
      message: "Starting with the parser",
      startedAt: clock.toISOString(),
      lastHeardAt: clock.toISOString(),
      stale: false,
      endedAt: null,
      ended: null,
    });
  });

  it("a comment, and an upsert, set the open run's last-heard time", async () => {
    await put("p-01");
    await start("p-01", "ana");
    later(HOUR);
    await comment("p-01", "halfway", "ana");
    expect((await detail("p-01")).ticket.run?.lastHeardAt).toBe(clock.toISOString());
    later(HOUR);
    await put("p-01", { summary: "sharper" });
    const { ticket, runs } = await detail("p-01");
    expect(ticket.run?.lastHeardAt).toBe(clock.toISOString());
    expect(runs).toHaveLength(1);
  });

  it("a move out of In Progress ends the run as moved, with the column", async () => {
    await put("p-01");
    await start("p-01", "ana");
    later(HOUR);
    await move("p-01", "ready_for_deploy", "npm run deploy");
    const { ticket, runs } = await detail("p-01");
    expect(ticket.run).toMatchObject({ ended: "moved", endedTo: "ready_for_deploy", endedAt: clock.toISOString(), stale: false });
    expect(runs).toHaveLength(1);
  });

  it("a move back into In Progress opens a new run", async () => {
    await ticketIn("p-01", "ready_for_test");
    await move("p-01", "in_progress", "the parser fails on tabs");
    const { runs } = await detail("p-01");
    expect(runs.map((run) => [run.ended, run.message])).toEqual([
      ["moved", null],
      [null, "the parser fails on tabs"],
    ]);
  });

  it("release ends the run as released, leaves the ticket In Progress, and says so in a comment", async () => {
    await put("p-01");
    await start("p-01", "ana");
    later(HOUR);
    const res = await release("p-01", "Stopped by the controller; Vite left on 5173", "controller");
    expect(res.statusCode).toBe(200);
    const body = res.json<ReleaseResponse>();
    expect(body.ticket.status).toBe("in_progress");
    expect(body.run).toMatchObject({ author: "ana", ended: "released", endedTo: null, endedAt: clock.toISOString() });
    expect(body.comment.author).toBe("controller");
    expect(body.comment.body).toContain("Released the run by ana: it ended unfinished");
    expect(body.comment.body).toContain("Vite left on 5173");
    expect((await runs()).map((entry) => entry.key)).toEqual([]);
    // Nothing left to release, and a release needs a message.
    expect((await release("p-01", "again")).json<ErrorBody>().code).toBe("no_open_run");
    expect((await release("p-01")).json<ErrorBody>().code).toBe("invalid_request");
    expect((await release("p-02", "none")).statusCode).toBe(404);
  });

  it("a second start resumes: it passes the run to a new author, and says the run was fresh", async () => {
    await put("p-01");
    await start("p-01", "ana");
    later(HOUR);
    const res = (await start("p-01", "bo")).json<StartResponse>();
    expect(res).toMatchObject({ resumed: true, passedFrom: { author: "ana", stale: false } });
    expect(res.comment?.body).toBe("Resumed in a new session.\n\nThe run passes from ana to bo.");
    expect(res.ticket.run).toMatchObject({ author: "bo", lastHeardAt: clock.toISOString(), ended: null });
    expect((await detail("p-01")).runs).toHaveLength(1);
    // The same author resuming is heard from, and nothing passes.
    expect((await start("p-01", "bo", "Back after lunch")).json<StartResponse>()).toMatchObject({ resumed: true, passedFrom: null });
  });

  it("a start on an In Progress ticket with no run opens one", async () => {
    await put("p-01");
    await start("p-01", "ana");
    await release("p-01", "stopped");
    const res = (await start("p-01", "bo")).json<StartResponse>();
    expect(res).toMatchObject({ resumed: true, passedFrom: null, ticket: { run: { author: "bo", ended: null } } });
    expect((await detail("p-01")).runs.map((run) => run.ended)).toEqual(["released", null]);
  });

  it("start refuses what the table refuses, and a todo's ticket", async () => {
    await ticketIn("p-01", "blocked");
    const res = await start("p-01");
    expect(res.statusCode).toBe(400);
    expect(res.json<ErrorBody>().code).toBe("message_required");
    await ticketIn("p-02", "done");
    expect((await start("p-02")).json<ErrorBody>().code).toBe("move_not_allowed");
    expect((await detail("p-02")).runs).toHaveLength(1);
  });

  it("turns a run stale past the threshold, and fresh again on a write", async () => {
    await put("p-01");
    await start("p-01", "ana");
    later(4 * HOUR);
    expect((await detail("p-01")).ticket.run?.stale).toBe(false);
    later(1000);
    expect((await detail("p-01")).ticket.run?.stale).toBe(true);
    const [lane] = (await board()).lanes;
    expect(lane!.tickets[0]!.run?.stale).toBe(true);
    await comment("p-01", "still here", "ana");
    expect((await detail("p-01")).ticket.run?.stale).toBe(false);
  });

  it("takes its threshold from the server's setting", async () => {
    const quick = await buildApp({ dbPath: ":memory:", now: () => clock, token: TOKEN, staleHours: 1 });
    try {
      const inject = (options: InjectOptions) => quick.inject({ ...options, headers: BEARER });
      await inject({ method: "PUT", url: "/api/tickets/p-01", payload: { title: "A", summary: "", briefPath: "corpus/briefs/todo/01-a.md" } });
      await inject({ method: "POST", url: "/api/tickets/p-01/start", payload: {} });
      later(HOUR + 1000);
      expect((await inject({ url: "/api/tickets/p-01" })).json<TicketDetailResponse>().ticket.run?.stale).toBe(true);
    } finally {
      await quick.close();
    }
  });

  it("lists open runs across projects, stalest first", async () => {
    await put("p-01");
    await put("q-01");
    await put("r-01");
    await start("p-01", "ana");
    later(HOUR);
    await start("q-01", "bo");
    later(HOUR);
    await start("r-01", "cy");
    later(4 * HOUR);
    await comment("p-01", "still here");
    await move("r-01", "done");
    const open = await runs();
    expect(open.map((entry) => [entry.key, entry.project, entry.run.author, entry.run.stale])).toEqual([
      ["q-01", "q", "bo", true],
      ["p-01", "p", "ana", false],
    ]);
    expect(open[0]!.title).toBe("A brief");
  });

  it("sync leaves an In Progress ticket with a fresh run, and warns", async () => {
    await put("p-01");
    await start("p-01", "ana");
    const res = await sync("p", [{ number: 1, state: "done" }]);
    expect(res.warnings).toEqual(["p-01: its brief is in done/, but its run by ana is open; the run's end move decides"]);
    const { ticket } = await detail("p-01");
    expect(ticket).toMatchObject({ status: "in_progress", run: { ended: null } });
    expect(ticket.briefPath).toContain("/done/");
    // The run's end move still goes through.
    expect((await move("p-01", "ready_for_deploy", "deploy it")).statusCode).toBe(200);
  });

  it("sync closes an In Progress ticket whose run is stale, and ends the run as stale", async () => {
    await put("p-01");
    await start("p-01", "ana");
    const heard = clock.toISOString();
    later(5 * HOUR);
    const res = await sync("p", [{ number: 1, state: "done" }]);
    expect(res.updated).toBe(1);
    expect(res.warnings).toEqual([`p-01: closed; its run by ana was stale (last heard ${heard}) and ends here`]);
    const { ticket, comments, history, runs } = await detail("p-01");
    expect(ticket.status).toBe("done");
    expect(runs).toMatchObject([{ author: "ana", ended: "stale", endedTo: null, lastHeardAt: heard, stale: false }]);
    expect(history.at(-1)).toMatchObject({ from: "in_progress", to: "done", via: "sync" });
    expect(comments.at(-1)?.body).toBe(`Closed by sync: the brief is in done/. The run by ana, last heard ${heard}, was stale and ends here.`);
  });

  it("sync closes an In Progress ticket with no open run, as before", async () => {
    await put("p-01");
    await start("p-01", "ana");
    await release("p-01", "stopped");
    expect((await sync("p", [{ number: 1, state: "done" }])).warnings).toEqual([]);
    expect((await detail("p-01")).ticket.status).toBe("done");
  });
});

describe("holds", () => {
  const HOUR = 60 * 60 * 1000;
  const later = (ms: number) => {
    clock = new Date(clock.getTime() + ms);
  };
  const start = (key: string, author?: string) => call({ method: "POST", url: `/api/tickets/${key}/start`, payload: { author } });
  const hold = (key: string, kind: string, value: string) =>
    call({ method: "POST", url: `/api/tickets/${key}/hold`, payload: { kind, value } });
  const drop = (key: string, kind: string, value: string) =>
    call({ method: "POST", url: `/api/tickets/${key}/drop`, payload: { kind, value } });
  const release = (key: string, message: string) =>
    call({ method: "POST", url: `/api/tickets/${key}/release`, payload: { message } });
  const holdsOf = (holds: { kind: string; value: string }[]) => holds.map((h) => `${h.kind} ${h.value}`);

  it("hold adds to the open run and drop takes off, each a write on the run; holding twice changes nothing", async () => {
    await put("p-01");
    await start("p-01", "ana");
    later(HOUR);
    const res = await hold("p-01", "port", " 5173 ");
    expect(res.statusCode).toBe(200);
    const body = res.json<HoldResponse>();
    expect(body).toMatchObject({ held: true, clashes: [], run: { author: "ana", lastHeardAt: clock.toISOString() } });
    expect(body.run.holds).toEqual([{ kind: "port", value: "5173", heldAt: clock.toISOString() }]);
    await hold("p-01", "container", "vite-dev");
    expect((await hold("p-01", "port", "5173")).json<HoldResponse>()).toMatchObject({ held: false, run: { holds: [{}, {}] } });
    later(HOUR);
    const dropped = await drop("p-01", "port", "5173");
    expect(dropped.statusCode).toBe(200);
    expect(dropped.json<DropResponse>().run).toMatchObject({ lastHeardAt: clock.toISOString(), holds: [{ kind: "container", value: "vite-dev" }] });
    const { ticket, runs } = await detail("p-01");
    expect(ticket.run?.lastHeardAt).toBe(clock.toISOString());
    expect(holdsOf(runs[0]!.holds)).toEqual(["container vite-dev"]);
    // The board's tickets carry the plain run.
    expect((await board()).lanes[0]!.tickets[0]!.run).not.toHaveProperty("holds");
  });

  it("drop of something the run doesn't hold is 400 not_held, naming what it holds", async () => {
    await put("p-01");
    await start("p-01");
    expect((await drop("p-01", "port", "5173")).json<ErrorBody>()).toEqual({ code: "not_held", message: "p-01's run holds no port 5173; it holds nothing" });
    await hold("p-01", "path", "tmp/os-copy");
    await hold("p-01", "pid", "4242");
    expect((await drop("p-01", "port", "5173")).json<ErrorBody>().message).toBe("p-01's run holds no port 5173; it holds path tmp/os-copy, pid 4242");
  });

  it("warns of another open run holding the same kind and value, and holds it anyway", async () => {
    await put("p-01");
    await put("q-01");
    await put("r-01");
    await start("p-01", "ana");
    await hold("p-01", "port", "5173");
    await start("r-01", "cy");
    await hold("r-01", "port", "5173");
    await move("r-01", "done");
    later(HOUR);
    await start("q-01", "bo");
    const res = (await hold("q-01", "port", "5173")).json<HoldResponse>();
    expect(res.held).toBe(true);
    // The ended run on r-01 still lists it as a leftover, but only open runs clash.
    expect(res.clashes.map((entry) => [entry.key, entry.run.author, holdsOf(entry.run.holds)])).toEqual([["p-01", "ana", ["port 5173"]]]);
    expect((await hold("q-01", "container", "5173")).json<HoldResponse>().clashes).toEqual([]);
    // Both hold it now: the record, not a lock.
    const { runs } = (await call({ url: "/api/runs" })).json<RunsResponse>();
    expect(runs.map((entry) => [entry.key, holdsOf(entry.run.holds)])).toEqual([
      ["p-01", ["port 5173"]],
      ["q-01", ["port 5173", "container 5173"]],
    ]);
  });

  it("needs an open run: no_open_run names start, and an unknown kind or ticket is refused", async () => {
    await put("p-01");
    const none = await hold("p-01", "port", "5173");
    expect(none.statusCode).toBe(400);
    expect(none.json<ErrorBody>()).toEqual({ code: "no_open_run", message: "p-01 has no open run (it is To Do); brief-board start p-01 opens one" });
    expect((await drop("p-01", "port", "5173")).json<ErrorBody>().code).toBe("no_open_run");
    await start("p-01");
    expect((await hold("p-01", "socket", "x")).json<ErrorBody>().code).toBe("invalid_request");
    expect((await hold("p-01", "port", "  ")).json<ErrorBody>().code).toBe("invalid_request");
    expect((await hold("p-02", "port", "5173")).statusCode).toBe(404);
  });

  it("an end move returns what the run still held and keeps it on the run; the next run starts with none", async () => {
    await put("p-01");
    await start("p-01", "ana");
    await hold("p-01", "port", "5173");
    await hold("p-01", "container", "vite-dev");
    await drop("p-01", "container", "vite-dev");
    const res = (await move("p-01", "ready_for_test", "open :5173")).json<MoveResponse>();
    expect(res.endedRun).toMatchObject({ author: "ana", ended: "moved", endedTo: "ready_for_test" });
    expect(holdsOf(res.endedRun!.holds)).toEqual(["port 5173"]);
    // A move that ends no run returns none.
    expect((await move("p-01", "in_progress", "fails on tabs")).json<MoveResponse>().endedRun).toBeNull();
    const { runs } = await detail("p-01");
    expect(runs.map((run) => [run.ended, holdsOf(run.holds)])).toEqual([
      ["moved", ["port 5173"]],
      [null, []],
    ]);
  });

  it("release returns what the run still held, and keeps it on the run", async () => {
    await put("p-01");
    await start("p-01", "ana");
    await hold("p-01", "port", "5173");
    const res = (await release("p-01", "Stopped by the controller")).json<ReleaseResponse>();
    expect(res.run).toMatchObject({ ended: "released" });
    expect(holdsOf(res.run.holds)).toEqual(["port 5173"]);
    expect(holdsOf((await detail("p-01")).runs[0]!.holds)).toEqual(["port 5173"]);
    expect((await hold("p-01", "port", "5174")).json<ErrorBody>().code).toBe("no_open_run");
  });

  it("a run that sync ends as stale keeps its holds as leftovers, and a run passed on keeps them", async () => {
    await put("p-01");
    await start("p-01", "ana");
    await hold("p-01", "port", "5173");
    await start("p-01", "bo");
    expect(holdsOf((await detail("p-01")).runs[0]!.holds)).toEqual(["port 5173"]);
    later(5 * HOUR);
    await sync("p", [{ number: 1, state: "done" }]);
    const { runs } = await detail("p-01");
    expect(runs.map((run) => [run.author, run.ended, holdsOf(run.holds)])).toEqual([["bo", "stale", ["port 5173"]]]);
  });
});

describe("questions", () => {
  const ask = (key: string, to: Status, message: string, questions: string[]) =>
    call({ method: "POST", url: `/api/tickets/${key}/moves`, payload: { to, message, questions, author: "ana" } });
  const answer = (key: string, number: number | string, text?: string) =>
    call({ method: "POST", url: `/api/tickets/${key}/questions/${number}/answer`, payload: { answer: text, author: "owner" } });
  const open = async (query = "") => (await call({ url: `/api/questions${query}` })).json<QuestionsResponse>().questions;

  it("a move with two questions stores both, numbered, and the move as before", async () => {
    await ticketIn("p-01", "in_progress");
    const res = await ask("p-01", "ready_for_deploy", "npm run deploy", ["Tabs too?", "Keep the old parser?"]);
    expect(res.statusCode).toBe(200);
    const body = res.json<MoveResponse>();
    expect(body.ticket).toMatchObject({ status: "ready_for_deploy", openQuestions: 2 });
    expect(body.comment).toMatchObject({ body: "npm run deploy", role: "deploy_steps" });
    expect(body.questions).toEqual([
      { number: 1, text: "Tabs too?", author: "ana", askedAt: clock.toISOString(), answer: null, answeredBy: null, answeredAt: null },
      { number: 2, text: "Keep the old parser?", author: "ana", askedAt: clock.toISOString(), answer: null, answeredBy: null, answeredAt: null },
    ]);
    expect((await detail("p-01")).questions.map((q) => q.number)).toEqual([1, 2]);
  });

  it("numbers go on per ticket across a comment and a start, and a refused move asks nothing", async () => {
    await put("p-01");
    const started = await call({ method: "POST", url: "/api/tickets/p-01/start", payload: { questions: ["First?"] } });
    expect(started.json<StartResponse>().questions.map((q) => q.number)).toEqual([1]);
    const commented = await call({ method: "POST", url: "/api/tickets/p-01/comments", payload: { body: "note", questions: ["Second?"] } });
    expect(commented.json<CommentResponse>().questions.map((q) => q.number)).toEqual([2]);
    expect((await ask("p-01", "blocked", "", ["Never asked?"])).statusCode).toBe(400);
    await put("p-02");
    await call({ method: "POST", url: "/api/tickets/p-02/comments", payload: { body: "note", questions: ["Other ticket?"] } });
    expect((await detail("p-01")).questions.map((q) => [q.number, q.text])).toEqual([
      [1, "First?"],
      [2, "Second?"],
    ]);
    expect((await detail("p-02")).questions.map((q) => q.number)).toEqual([1]);
  });

  it("answer closes one with its answer, says so in a comment, and the badge counts the rest", async () => {
    await ticketIn("p-01", "in_progress");
    await ask("p-01", "ready_for_test", "try it", ["Tabs too?", "Keep the old parser?"]);
    clock = new Date(clock.getTime() + 60_000);
    const res = await answer("p-01", 2, "No, drop it.");
    expect(res.statusCode).toBe(200);
    const body = res.json<AnswerResponse>();
    expect(body.question).toMatchObject({ number: 2, answer: "No, drop it.", answeredBy: "owner", answeredAt: clock.toISOString() });
    expect(body.ticket.openQuestions).toBe(1);
    expect(body.comment).toMatchObject({ author: "owner", body: "Answered question 2: Keep the old parser?\n\nNo, drop it." });
    expect((await detail("p-01")).ticket.status).toBe("ready_for_test");
  });

  it("refuses a closed or unknown number and names the open ones", async () => {
    await ticketIn("p-01", "in_progress");
    await ask("p-01", "ready_for_test", "try it", ["One?", "Two?", "Three?"]);
    await answer("p-01", 2, "yes");
    for (const [number, message] of [
      [2, "p-01 has no open question 2; open: 1, 3"],
      [9, "p-01 has no open question 9; open: 1, 3"],
    ] as const) {
      const res = await answer("p-01", number, "again");
      expect(res.statusCode).toBe(400);
      expect(res.json<ErrorBody>()).toMatchObject({ code: "question_not_open", message });
    }
    await answer("p-01", 1, "a");
    await answer("p-01", 3, "b");
    expect((await answer("p-01", 1, "c")).json<ErrorBody>().message).toBe("p-01 has no open question 1; it has no open questions");
    expect((await answer("p-01", 0, "c")).json<ErrorBody>().code).toBe("invalid_key");
    expect((await answer("p-01", 1)).json<ErrorBody>().code).toBe("invalid_request");
    expect((await answer("p-09", 1, "c")).statusCode).toBe(404);
  });

  it("lists open questions across projects, oldest first, and narrows to a project", async () => {
    await ticketIn("p-01", "in_progress");
    await ticketIn("q-01", "in_progress");
    await ask("q-01", "blocked", "owner decides", ["Older?"]);
    clock = new Date(clock.getTime() + 60_000);
    await ask("p-01", "ready_for_test", "try it", ["Newer?", "Answered?"]);
    await answer("p-01", 2, "done");
    const all = await open();
    expect(all.map((entry) => [entry.key, entry.project, entry.status, entry.question.number, entry.question.text])).toEqual([
      ["q-01", "q", "blocked", 1, "Older?"],
      ["p-01", "p", "ready_for_test", 1, "Newer?"],
    ]);
    expect((await open("?project=p")).map((entry) => entry.key)).toEqual(["p-01"]);
  });

  it("puts the count on the board's tickets in every column, Done included", async () => {
    await ticketIn("p-01", "in_progress");
    await ask("p-01", "done", "shipped", ["Deploy it today?"]);
    await put("p-02");
    const tickets = (await board()).lanes.flatMap((lane) => lane.tickets);
    expect(tickets.map((t) => [t.key, t.status, t.openQuestions])).toEqual([
      ["p-01", "done", 1],
      ["p-02", "todo", 0],
    ]);
  });

  it("sync leaves questions alone when it closes a ticket or hides it", async () => {
    await put("p-01");
    await call({ method: "POST", url: "/api/tickets/p-01/comments", payload: { body: "note", questions: ["Close?"] } });
    await put("p-02");
    await call({ method: "POST", url: "/api/tickets/p-02/comments", payload: { body: "note", questions: ["Hide?"] } });
    await sync("p", [
      { number: 1, state: "done" },
      { number: 2, state: "superseded" },
    ]);
    expect((await detail("p-01")).ticket).toMatchObject({ status: "done", openQuestions: 1 });
    expect((await detail("p-02")).ticket).toMatchObject({ hidden: true, openQuestions: 1 });
    expect((await open()).map((entry) => entry.question.text)).toEqual(["Close?", "Hide?"]);
  });
});

describe("what needs the owner", () => {
  const HOUR = 60 * 60 * 1000;
  const later = (ms: number) => {
    clock = new Date(clock.getTime() + ms);
  };
  const needs = async (query = "") => (await call({ url: `/api/needs${query}` })).json<NeedsResponse>().needs;
  const comment = (key: string, body: string, questions: string[]) =>
    call({ method: "POST", url: `/api/tickets/${key}/comments`, payload: { body, questions, author: "ana" } });

  it("lists each kind with its ticket, reason and since when, in the owner's order", async () => {
    await ticketIn("p-01", "ready_for_deploy");
    later(HOUR);
    await ticketIn("p-02", "ready_for_test");
    later(HOUR);
    await put("p-03");
    await call({ method: "POST", url: "/api/tickets/p-03/start", payload: { author: "bo" } });
    const heard = clock.toISOString();
    later(HOUR);
    await ticketIn("p-04", "blocked");
    const blockedAt = clock.toISOString();
    later(HOUR);
    await comment("p-01", "one more thing", ["Deploy on Friday?"]);
    const asked = clock.toISOString();
    later(3 * HOUR);
    expect((await needs()).map((need) => [need.kind, need.key, need.reason, need.by])).toEqual([
      ["question", "p-01", "#1 Deploy on Friday?", "ana"],
      ["blocked", "p-04", "owner decides", "agent"],
      ["stale_run", "p-03", "stale run by bo", "bo"],
      ["ready_for_test", "p-02", "try it", "agent"],
      ["ready_for_deploy", "p-01", "npm run deploy", "agent"],
    ]);
    const [question, blocked, stale] = await needs();
    expect(question).toMatchObject({ since: asked, status: "ready_for_deploy", project: "p", title: "A brief" });
    expect(blocked!.since).toBe(blockedAt);
    expect(stale!.since).toBe(heard);
  });

  it("puts a ticket that is Blocked and has an open question under each, oldest first in each kind", async () => {
    await ticketIn("p-01", "blocked");
    later(HOUR);
    await ticketIn("p-02", "blocked");
    await comment("p-02", "and", ["Which colour?"]);
    later(HOUR);
    await comment("p-01", "and", ["Which font?"]);
    expect((await needs()).map((need) => [need.kind, need.key])).toEqual([
      ["question", "p-02"],
      ["question", "p-01"],
      ["blocked", "p-01"],
      ["blocked", "p-02"],
    ]);
  });

  it("narrows to a project, drops answered questions and fresh runs, and is empty when nothing waits", async () => {
    expect(await needs()).toEqual([]);
    await ticketIn("p-01", "in_progress");
    await ticketIn("q-01", "ready_for_test");
    await comment("p-01", "note", ["Answered?"]);
    await call({ method: "POST", url: "/api/tickets/p-01/questions/1/answer", payload: { answer: "yes" } });
    expect((await needs()).map((need) => need.key)).toEqual(["q-01"]);
    expect(await needs("?project=p")).toEqual([]);
    expect((await needs("?project=q")).map((need) => need.kind)).toEqual(["ready_for_test"]);
  });

  it("leaves out the columns of a ticket hidden by a superseded brief, and says when a move carried no message", async () => {
    await ticketIn("p-01", "ready_for_test");
    await move("p-01", "ready_for_deploy");
    await ticketIn("p-02", "ready_for_deploy");
    await sync("p", [
      { number: 1, state: "todo" },
      { number: 2, state: "superseded" },
    ]);
    expect((await needs()).map((need) => [need.key, need.reason])).toEqual([["p-01", "no message"]]);
  });
});

describe("todos and Backlog", () => {
  const todo = (slug: string, title = `Todo ${slug}`) => ({ slug, title, summary: `About ${slug}`, path: `corpus/todos/${slug}.md` });
  const syncTodos = async (project: string, todos: ReturnType<typeof todo>[] | undefined, briefs: Partial<SyncBrief>[] = []) =>
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
                summary: "",
                briefPath: `corpus/briefs/todo/${b.number}-x.md`,
                state: "todo",
                ...b,
              })),
              ...(todos ? { todos } : {}),
            },
          ],
        },
      })
    ).json<SyncResponse>();

  it("gives an open todo a ticket in Backlog, keyed <project>:<slug>, with no number", async () => {
    const result = await syncTodos("p", [todo("walls-step-2")]);
    expect(result.todos).toEqual({ created: 1, updated: 0, unchanged: 0, removed: 0 });
    expect(result.created).toBe(0);
    const { ticket, history } = await detail("p:walls-step-2");
    expect(ticket).toMatchObject({ number: null, status: "backlog", title: "Todo walls-step-2", briefPath: "corpus/todos/walls-step-2.md" });
    expect(history).toMatchObject([{ from: null, to: "backlog", via: "sync" }]);
    const [lane] = (await board()).lanes;
    expect(lane!.tickets.map((t) => t.key)).toEqual(["p:walls-step-2"]);
  });

  it("keeps a todo's ticket to its title, summary and path", async () => {
    await syncTodos("p", [todo("a")]);
    expect((await syncTodos("p", [todo("a")])).todos).toEqual({ created: 0, updated: 0, unchanged: 1, removed: 0 });
    expect((await syncTodos("p", [todo("a", "A better title")])).todos).toEqual({ created: 0, updated: 1, unchanged: 0, removed: 0 });
    expect((await detail("p:a")).ticket.title).toBe("A better title");
  });

  it("takes the ticket off when the todo is promoted, and files the brief's in To Do", async () => {
    await syncTodos("p", [todo("night-mode"), todo("stays")]);
    const result = await syncTodos("p", [todo("stays")], [{ number: 3, title: "Night mode" }]);
    expect(result.todos).toEqual({ created: 0, updated: 0, unchanged: 1, removed: 1 });
    expect(result.created).toBe(1);
    expect((await call({ url: "/api/tickets/p:night-mode" })).statusCode).toBe(404);
    expect((await detail("p-03")).ticket.status).toBe("todo");
    const [lane] = (await board()).lanes;
    expect(lane!.tickets.map((t) => [t.key, t.status])).toEqual([
      ["p:stays", "backlog"],
      ["p-03", "todo"],
    ]);
  });

  it("leaves a project's todo tickets alone when a CLI from before Backlog sends no todos", async () => {
    await syncTodos("p", [todo("a")]);
    expect((await syncTodos("p", undefined, [{ number: 1 }])).todos).toEqual({ created: 0, updated: 0, unchanged: 0, removed: 0 });
    expect((await detail("p:a")).ticket.status).toBe("backlog");
  });

  it("refuses a move, a comment or an upsert on a todo's ticket, and says to promote the todo", async () => {
    await syncTodos("p", [todo("a")]);
    for (const res of [
      await move("p:a", "todo"),
      await move("p:a", "in_progress", "start"),
      await call({ method: "POST", url: "/api/tickets/p:a/comments", payload: { body: "note" } }),
      await put("p:a"),
    ]) {
      expect(res.statusCode).toBe(400);
      const body = res.json<ErrorBody>();
      expect(body.code).toBe("sync_owned");
      expect(body.message).toContain("Promote the todo to a brief");
    }
    const { ticket, comments } = await detail("p:a");
    expect(ticket.status).toBe("backlog");
    expect(comments).toEqual([]);
  });

  it("refuses a brief's ticket a move into Backlog", async () => {
    await put("p-01");
    expect((await move("p-01", "backlog", "back")).json<ErrorBody>().code).toBe("move_not_allowed");
  });

  it("reads a todo key with the colon raw or encoded", async () => {
    await syncTodos("p", [todo("a")]);
    expect((await call({ url: "/api/tickets/p:a" })).statusCode).toBe(200);
    expect((await call({ url: "/api/tickets/p%3Aa" })).json<TicketDetailResponse>().ticket.key).toBe("p:a");
    expect((await call({ url: "/api/tickets/p:a:b" })).json<ErrorBody>().code).toBe("invalid_key");
  });
});

describe("blocked briefs and todos", () => {
  const HOUR = 60 * 60 * 1000;
  const later = (ms: number) => {
    clock = new Date(clock.getTime() + ms);
  };
  const start = (key: string, author?: string) => call({ method: "POST", url: `/api/tickets/${key}/start`, payload: { author } });
  const release = (key: string, message: string) =>
    call({ method: "POST", url: `/api/tickets/${key}/release`, payload: { message } });
  const blocked = (number: number, blockedBy: string | null = "a stronger machine"): Partial<SyncBrief> => ({
    number,
    state: "blocked",
    blockedBy,
    briefPath: `corpus/briefs/blocked/${number}-x.md`,
  });
  const WAITING = "Waiting in Backlog: the brief is in blocked/ (blocked by a stronger machine).";
  const todo = (slug: string, blockedBy: string | null = null) => ({
    slug,
    title: `Todo ${slug}`,
    summary: "",
    path: blockedBy === null ? `corpus/todos/${slug}.md` : `corpus/todos/blocked/${slug}.md`,
    blockedBy,
  });
  const syncWith = async (briefs: Partial<SyncBrief>[], todos?: ReturnType<typeof todo>[]) =>
    (
      await call({
        method: "POST",
        url: "/api/sync",
        payload: {
          projects: [
            {
              project: "p",
              briefs: briefs.map((b) => ({ title: `Brief ${b.number}`, summary: "", briefPath: `corpus/briefs/todo/${b.number}-x.md`, state: "todo", ...b })),
              ...(todos ? { todos } : {}),
            },
          ],
        },
      })
    ).json<SyncResponse>();

  it("creates a blocked brief's ticket in Backlog with its condition, never in To Do", async () => {
    const result = await syncWith([blocked(14)]);
    expect(result).toMatchObject({ created: 1, warnings: [] });
    const { ticket, history } = await detail("p-14");
    expect(ticket).toMatchObject({ number: 14, status: "backlog", blockedBy: "a stronger machine", briefPath: "corpus/briefs/blocked/14-x.md" });
    expect(history).toMatchObject([{ from: null, to: "backlog", via: "sync" }]);
  });

  it("names no condition as not given, and refreshes the condition when it changes", async () => {
    await syncWith([blocked(14, null)]);
    expect((await detail("p-14")).ticket.blockedBy).toBe("not given");
    expect((await syncWith([blocked(14, "2026-11-18")])).updated).toBe(1);
    expect((await detail("p-14")).ticket.blockedBy).toBe("2026-11-18");
    expect((await syncWith([blocked(14, "2026-11-18")])).unchanged).toBe(1);
  });

  it("moves To Do and Blocked tickets to Backlog, with a history event and a comment", async () => {
    await ticketIn("p-01", "todo");
    await ticketIn("p-02", "blocked");
    const result = await syncWith([blocked(1), blocked(2)]);
    expect(result).toMatchObject({ updated: 2, warnings: [] });
    for (const [key, from] of [["p-01", "todo"], ["p-02", "blocked"]] as const) {
      const { ticket, history, comments } = await detail(key);
      expect(ticket).toMatchObject({ status: "backlog", blockedBy: "a stronger machine" });
      expect(history.at(-1)).toMatchObject({ from, to: "backlog", via: "sync", author: "sync" });
      expect(comments.at(-1)).toMatchObject({ author: "sync", body: WAITING });
    }
  });

  it("leaves an In Progress ticket with a fresh run, and warns, refreshing its condition", async () => {
    await put("p-01");
    await start("p-01", "ana");
    const result = await syncWith([blocked(1)]);
    expect(result.warnings).toEqual(["p-01: its brief is in blocked/, but its run by ana is open; the run's end move decides"]);
    expect((await detail("p-01")).ticket).toMatchObject({ status: "in_progress", blockedBy: "a stronger machine", run: { ended: null } });
  });

  it("moves an In Progress ticket to Backlog once its run is stale, ending the run, or released", async () => {
    await put("p-01");
    await start("p-01", "ana");
    const heard = clock.toISOString();
    later(5 * HOUR);
    const stale = await syncWith([blocked(1)]);
    expect(stale.warnings).toEqual([`p-01: waits in Backlog; its run by ana was stale (last heard ${heard}) and ends here`]);
    const first = await detail("p-01");
    expect(first.ticket.status).toBe("backlog");
    expect(first.runs).toMatchObject([{ author: "ana", ended: "stale", endedTo: "backlog" }]);
    expect(first.comments.at(-1)?.body).toBe(`${WAITING} The run by ana, last heard ${heard}, was stale and ends here.`);

    await put("p-02");
    await start("p-02", "ben");
    expect((await release("p-02", "Blocked by: a stronger machine")).statusCode).toBe(200);
    expect((await syncWith([blocked(1), blocked(2)])).warnings).toEqual([]);
    const second = await detail("p-02");
    expect(second.ticket.status).toBe("backlog");
    expect(second.history.at(-1)).toMatchObject({ from: "in_progress", to: "backlog", via: "sync" });
    expect(second.comments.at(-1)?.body).toBe(WAITING);
  });

  it("leaves Ready for test, Ready for deploy and Done where they are, with the condition and a warning", async () => {
    await ticketIn("p-01", "ready_for_test");
    await ticketIn("p-02", "ready_for_deploy");
    await ticketIn("p-03", "done");
    const result = await syncWith([blocked(1), blocked(2), blocked(3)]);
    expect(result.warnings).toEqual([
      "p-01 is Ready for test on the board but its brief is in blocked/; only its condition, title and path were refreshed",
      "p-02 is Ready for deploy on the board but its brief is in blocked/; only its condition, title and path were refreshed",
      "p-03 is Done on the board but its brief is in blocked/; only its condition, title and path were refreshed",
    ]);
    expect((await detail("p-01")).ticket).toMatchObject({ status: "ready_for_test", blockedBy: "a stronger machine" });
    expect((await detail("p-03")).ticket).toMatchObject({ status: "done", briefPath: "corpus/briefs/blocked/3-x.md" });
  });

  it("puts the ticket in To Do and clears the condition when the brief is back in todo/", async () => {
    await syncWith([blocked(14)]);
    const result = await syncWith([{ number: 14 }]);
    expect(result).toMatchObject({ updated: 1, warnings: [] });
    const { ticket, history, comments } = await detail("p-14");
    expect(ticket).toMatchObject({ status: "todo", blockedBy: null, briefPath: "corpus/briefs/todo/14-x.md" });
    expect(history.at(-1)).toMatchObject({ from: "backlog", to: "todo", via: "sync" });
    expect(comments.at(-1)?.body).toBe("Unblocked by sync: the brief is back in todo/.");
    // Then it is an agent's to start, as any To Do ticket.
    expect((await start("p-14", "ana")).statusCode).toBe(200);
  });

  it("closes a blocked brief's ticket when the brief is done, and hides it when superseded", async () => {
    await syncWith([blocked(1), blocked(2)]);
    await syncWith([{ number: 1, state: "done" }, { number: 2, state: "superseded" }]);
    expect((await detail("p-01")).ticket).toMatchObject({ status: "done", blockedBy: null });
    expect((await detail("p-01")).comments.at(-1)?.body).toBe("Closed by sync: the brief is in done/.");
    expect((await detail("p-02")).ticket).toMatchObject({ status: "backlog", hidden: true, blockedBy: null });
  });

  it("refuses a start, a move or a comment on a blocked brief's ticket, and says how it leaves Backlog", async () => {
    await syncWith([blocked(14)]);
    for (const res of [
      await start("p-14", "ana"),
      await move("p-14", "in_progress", "start"),
      await call({ method: "POST", url: "/api/tickets/p-14/comments", payload: { body: "note" } }),
    ]) {
      expect(res.statusCode).toBe(400);
      const body = res.json<ErrorBody>();
      expect(body.code).toBe("sync_owned");
      expect(body.message).toContain("its brief is in blocked/");
      expect(body.message).toContain("move the brief back to briefs/todo/");
    }
  });

  it("keeps a todo's key when its file moves into todos/blocked/ and back, refreshing its condition", async () => {
    await syncWith([], [todo("sonarqube")]);
    const into = await syncWith([], [todo("sonarqube", "a stronger machine")]);
    expect(into.todos).toEqual({ created: 0, updated: 1, unchanged: 0, removed: 0 });
    expect((await detail("p:sonarqube")).ticket).toMatchObject({
      status: "backlog",
      blockedBy: "a stronger machine",
      briefPath: "corpus/todos/blocked/sonarqube.md",
    });
    await syncWith([], [todo("sonarqube")]);
    expect((await detail("p:sonarqube")).ticket).toMatchObject({ blockedBy: null, briefPath: "corpus/todos/sonarqube.md" });
    expect((await detail("p:sonarqube")).history).toHaveLength(1);
  });

  it("never removes a blocked brief's ticket as a gone todo", async () => {
    await syncWith([blocked(14)], [todo("a")]);
    const result = await syncWith([blocked(14)], []);
    expect(result.todos).toEqual({ created: 0, updated: 0, unchanged: 0, removed: 1 });
    expect((await detail("p-14")).ticket.status).toBe("backlog");
  });

  it("takes a payload from a CLI from before blocked/: no condition fields, and a blocked brief missing", async () => {
    await syncWith([blocked(14)]);
    const older = await call({
      method: "POST",
      url: "/api/sync",
      payload: {
        projects: [
          {
            project: "p",
            briefs: [{ number: 1, title: "Brief 1", summary: "", briefPath: "corpus/briefs/todo/1-x.md", state: "todo" }],
            todos: [{ slug: "a", title: "A", summary: "", path: "corpus/todos/a.md" }],
          },
        ],
      },
    });
    expect(older.statusCode).toBe(200);
    expect(older.json<SyncResponse>().warnings).toEqual(["p-14: no brief with this number in p's corpus; nothing changed"]);
    expect((await detail("p-01")).ticket).toMatchObject({ status: "todo", blockedBy: null });
    expect((await detail("p:a")).ticket.blockedBy).toBeNull();
    expect((await detail("p-14")).ticket).toMatchObject({ status: "backlog", blockedBy: "a stronger machine" });
  });

  it("keeps blocked briefs and todos off the needs list", async () => {
    await syncWith([blocked(14)], [todo("sonarqube", "a stronger machine")]);
    expect((await call({ url: "/api/needs" })).json<NeedsResponse>().needs).toEqual([]);
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

  it("has no rename route, so a session cannot change its username", async () => {
    const cookie = await signIn();
    const res = await app.inject({ method: "POST", url: "/brief-board-api/auth/username", payload: { username: "someone" }, headers: { cookie } });
    expect(res.statusCode).toBe(404);
    const session = await app.inject({ url: "/brief-board-api/auth/session", headers: { cookie } });
    expect(session.json<{ user: { username: string } }>().user.username).toBe("owner");
  });

  it("keeps health open", async () => {
    expect((await app.inject({ url: "/api/health" })).json()).toEqual({ ok: true });
    expect((await app.inject({ method: "HEAD", url: "/brief-board-api/api/health" })).statusCode).toBe(200);
  });
});
