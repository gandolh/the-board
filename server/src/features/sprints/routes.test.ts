import { beforeEach, describe, expect, it } from "vitest";
import type { ErrorBody, SprintDetailResponse, SprintsResponse, StartSprintResponse } from "@brief-board/shared";
import type { InjectOptions } from "fastify";
import {
  useTestBoard,
  call,
  put,
  move,
  detail,
  board,
  ticketIn,
  app,
  clock,
  setClock,
} from "../../testing/buildTestApp.js";

useTestBoard();

describe("sprints", () => {
  // The migration dates Sprint 1 and Sprint 2 with SQLite's today, so the
  // clock starts there: a sprint cannot close before it started.
  beforeEach(() => {
    setClock(new Date());
  });
  const later = (ms: number) => {
    setClock(new Date(clock.getTime() + ms));
  };
  const today = () => clock.toISOString().slice(0, 10);
  const sprints = async () => (await call({ url: "/api/sprints" })).json<SprintsResponse>();
  const sprintDetail = async (number: number) =>
    (await call({ url: `/api/sprints/${number}` })).json<SprintDetailResponse>();
  const startSprint = (payload?: Record<string, unknown>) =>
    call({ method: "POST", url: "/api/sprints", ...(payload && { payload }) });

  it("starts with Sprint 1 closed and empty and Sprint 2 active, both dated today, and the board names the active one", async () => {
    const day = (await sprints()).active.startedOn;
    expect([today(), new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)]).toContain(day);
    expect(await sprints()).toEqual({
      active: { number: 2, startedOn: day, endedOn: null, doneCount: 0 },
      closed: [{ number: 1, startedOn: day, endedOn: day, doneCount: 0 }],
    });
    await put("p-01");
    expect(await board()).toMatchObject({ sprint: { number: 2, startedOn: day }, lanes: [{ project: "p" }] });
    expect((await detail("p-01")).ticket.sprint).toBe(2);
  });

  it("a start with the token closes the active sprint and moves every ticket that is not Done, with its run, question and comment", async () => {
    for (const [key, status] of [
      ["p-01", "todo"],
      ["p-02", "in_progress"],
      ["p-03", "blocked"],
      ["p-04", "ready_for_test"],
      ["p-05", "ready_for_deploy"],
      ["p-06", "done"],
      ["q-01", "done"],
    ] as const) {
      await ticketIn(key, status);
    }
    await call({
      method: "POST",
      url: "/api/tickets/p-02/comments",
      payload: { body: "Half done.", questions: ["Today?"] },
    });
    later(60_000);
    await ticketIn("p-07", "done");
    const before = await detail("p-02");

    const res = await startSprint({ number: 3 });
    expect(res.statusCode).toBe(201);
    expect(res.json<StartSprintResponse>()).toMatchObject({
      sprint: { number: 3, startedOn: today(), endedOn: null, doneCount: 0 },
      closed: { number: 2, endedOn: today(), doneCount: 3 },
      moved: 5,
    });
    const after = await detail("p-02");
    expect(after.ticket).toMatchObject({ status: "in_progress", sprint: 3 });
    expect({ ...after, ticket: undefined }).toEqual({ ...before, ticket: undefined });
    expect(after.runs.at(-1)?.endedAt).toBeNull();
    expect(after.questions).toMatchObject([{ number: 1, text: "Today?", answer: null }]);
    expect(after.comments.at(-1)?.body).toBe("Half done.");

    expect((await board()).sprint.number).toBe(3);
    expect((await board()).lanes.flatMap((lane) => lane.tickets.map((ticket) => ticket.key))).toEqual([
      "p-01",
      "p-02",
      "p-03",
      "p-04",
      "p-05",
    ]);
    expect((await sprints()).closed.map((sprint) => sprint.number)).toEqual([2, 1]);
    // A closed sprint's Done tickets, by project, newest Done first.
    expect((await sprintDetail(2)).tickets.map((ticket) => ticket.key)).toEqual(["p-07", "p-06", "q-01"]);
    expect((await detail("p-06")).ticket).toMatchObject({ status: "done", sprint: 2 });
  });

  it("answers a stale number 409 sprint_changed, so the same command twice starts one sprint", async () => {
    expect((await startSprint({ number: 3 })).statusCode).toBe(201);
    for (const number of [3, 5, 2]) {
      const res = await startSprint({ number });
      expect(res.statusCode).toBe(409);
      expect(res.json<ErrorBody>()).toEqual({
        code: "sprint_changed",
        message: `sprint 3 is the active one, so the next is 4, not ${number}; nothing changed`,
      });
    }
    expect((await sprints()).active.number).toBe(3);
  });

  it("refuses a start with no body, a bad body or no credentials", async () => {
    for (const res of [await startSprint(), await startSprint({}), await startSprint({ number: "three" })]) {
      expect(res.statusCode).toBe(400);
      expect(res.json<ErrorBody>().code).toBe("invalid_request");
    }
    const bare = await app.inject({ method: "POST", url: "/api/sprints", payload: { number: 3 } });
    expect(bare.statusCode).toBe(401);
    expect(bare.json<ErrorBody>().code).toBe("unauthorized");
    expect((await sprints()).active.number).toBe(2);
  });

  it("finds an unknown sprint 404, and a malformed number 400", async () => {
    const missing = await call({ url: "/api/sprints/9" });
    expect(missing.statusCode).toBe(404);
    expect(missing.json<ErrorBody>()).toEqual({ code: "not_found", message: "no sprint 9; the active sprint is 2" });
    expect((await call({ url: "/api/sprints/two" })).statusCode).toBe(400);
    expect((await sprintDetail(1)).tickets).toEqual([]);
  });

  it("answers every write on a closed sprint's ticket 409 sprint_closed, naming the sprint, and leaves it as it was", async () => {
    await ticketIn("p-01", "in_progress");
    await call({ method: "POST", url: "/api/tickets/p-01/comments", payload: { body: "note", questions: ["Ship?"] } });
    await move("p-01", "done");
    expect((await startSprint({ number: 3 })).statusCode).toBe(201);
    const before = await detail("p-01");
    const writes: InjectOptions[] = [
      { method: "POST", url: "/api/tickets/p-01/moves", payload: { to: "in_progress", message: "again" } },
      {
        method: "PUT",
        url: "/api/tickets/p-01",
        payload: { title: "Renamed", summary: "", briefPath: "corpus/briefs/todo/01-a.md" },
      },
      { method: "POST", url: "/api/tickets/p-01/comments", payload: { body: "late" } },
      { method: "POST", url: "/api/tickets/p-01/start", payload: {} },
      { method: "POST", url: "/api/tickets/p-01/release", payload: { message: "stopped" } },
      { method: "POST", url: "/api/tickets/p-01/hold", payload: { kind: "port", value: "5173" } },
      { method: "POST", url: "/api/tickets/p-01/drop", payload: { kind: "port", value: "5173" } },
      { method: "POST", url: "/api/tickets/p-01/questions/1/answer", payload: { answer: "yes" } },
    ];
    for (const write of writes) {
      const res = await call(write);
      expect(res.statusCode, `${write.method} ${write.url}`).toBe(409);
      expect(res.json<ErrorBody>()).toEqual({
        code: "sprint_closed",
        message: `p-01 is in sprint 2, which closed on ${today()}; a closed sprint's tickets are frozen and nothing writes to them`,
      });
    }
    expect(await detail("p-01")).toEqual(before);

    // Tags are the exception: they only group tickets, and nothing else on the ticket changes.
    const tagged = await call({ method: "POST", url: "/api/tickets/p-01/tags", payload: { add: ["feature"] } });
    expect(tagged.statusCode).toBe(200);
    const after = await detail("p-01");
    expect(after.ticket).toEqual({ ...before.ticket, tags: ["feature"] });
    expect(after.tagEvents?.map((event) => [event.tag, event.change])).toEqual([["feature", "added"]]);
    expect(
      (await call({ method: "POST", url: "/api/tickets/p-01/tags", payload: { remove: ["feature"] } })).statusCode,
    ).toBe(200);
  });
});
