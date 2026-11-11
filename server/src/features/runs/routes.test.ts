import { describe, expect, it } from "vitest";
import type {
  DropResponse,
  ErrorBody,
  HoldResponse,
  MoveResponse,
  ReleaseResponse,
  RunsResponse,
  StartResponse,
  TicketDetailResponse,
} from "@brief-board/shared";
import type { InjectOptions } from "fastify";
import {
  useTestBoard,
  call,
  put,
  move,
  detail,
  board,
  sync,
  ticketIn,
  clock,
  setClock,
  BEARER,
  buildTestApp,
} from "../../testing/buildTestApp.js";

useTestBoard();

describe("runs", () => {
  const HOUR = 60 * 60 * 1000;
  const later = (ms: number) => {
    setClock(new Date(clock.getTime() + ms));
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
    expect(ticket.run).toMatchObject({
      ended: "moved",
      endedTo: "ready_for_deploy",
      endedAt: clock.toISOString(),
      stale: false,
    });
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
    expect((await start("p-01", "bo", "Back after lunch")).json<StartResponse>()).toMatchObject({
      resumed: true,
      passedFrom: null,
    });
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
    expect(lane?.tickets[0]?.run?.stale).toBe(true);
    await comment("p-01", "still here", "ana");
    expect((await detail("p-01")).ticket.run?.stale).toBe(false);
  });

  it("takes its threshold from the server's setting", async () => {
    const quick = (await buildTestApp({ now: () => clock, staleHours: 1 })).app;
    try {
      const inject = (options: InjectOptions) => quick.inject({ ...options, headers: BEARER });
      await inject({
        method: "PUT",
        url: "/api/tickets/p-01",
        payload: { title: "A", summary: "", briefPath: "corpus/briefs/todo/01-a.md" },
      });
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
    expect(open[0]?.title).toBe("A brief");
  });

  it("sync leaves an In Progress ticket with a fresh run, and warns", async () => {
    await put("p-01");
    await start("p-01", "ana");
    const res = await sync("p", [{ number: 1, state: "done" }]);
    expect(res.warnings).toEqual([
      "p-01: its brief is in done/, but its run by ana is open; the run's end move decides",
    ]);
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
    expect(comments.at(-1)?.body).toBe(
      `Closed by sync: the brief is in done/. The run by ana, last heard ${heard}, was stale and ends here.`,
    );
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
    setClock(new Date(clock.getTime() + ms));
  };
  const start = (key: string, author?: string) =>
    call({ method: "POST", url: `/api/tickets/${key}/start`, payload: { author } });
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
    expect((await hold("p-01", "port", "5173")).json<HoldResponse>()).toMatchObject({
      held: false,
      run: { holds: [{}, {}] },
    });
    later(HOUR);
    const dropped = await drop("p-01", "port", "5173");
    expect(dropped.statusCode).toBe(200);
    expect(dropped.json<DropResponse>().run).toMatchObject({
      lastHeardAt: clock.toISOString(),
      holds: [{ kind: "container", value: "vite-dev" }],
    });
    const { ticket, runs } = await detail("p-01");
    expect(ticket.run?.lastHeardAt).toBe(clock.toISOString());
    expect(holdsOf(runs[0]!.holds)).toEqual(["container vite-dev"]);
    // The board's tickets carry the plain run.
    expect((await board()).lanes[0]?.tickets[0]?.run).not.toHaveProperty("holds");
  });

  it("drop of something the run doesn't hold is 400 not_held, naming what it holds", async () => {
    await put("p-01");
    await start("p-01");
    expect((await drop("p-01", "port", "5173")).json<ErrorBody>()).toEqual({
      code: "not_held",
      message: "p-01's run holds no port 5173; it holds nothing",
    });
    await hold("p-01", "path", "tmp/os-copy");
    await hold("p-01", "pid", "4242");
    expect((await drop("p-01", "port", "5173")).json<ErrorBody>().message).toBe(
      "p-01's run holds no port 5173; it holds path tmp/os-copy, pid 4242",
    );
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
    expect(res.clashes.map((entry) => [entry.key, entry.run.author, holdsOf(entry.run.holds)])).toEqual([
      ["p-01", "ana", ["port 5173"]],
    ]);
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
    expect(none.json<ErrorBody>()).toEqual({
      code: "no_open_run",
      message: "p-01 has no open run (it is To Do); brief-board start p-01 opens one",
    });
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
