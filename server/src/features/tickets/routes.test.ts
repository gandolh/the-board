import { describe, expect, it } from "vitest";
import {
  MOVES,
  type ErrorBody,
  type MoveResponse,
  type NeedsResponse,
  type SyncBrief,
  type SyncResponse,
  type TagsResponse,
  type TicketDetailResponse,
  type UpsertTicketResponse,
} from "@brief-board/shared";
import { useTestBoard, call, put, move, detail, board, ticketIn, clock, setClock } from "../../testing/buildTestApp.js";

useTestBoard();

describe("moves through the route", () => {
  for (const [index, rule] of MOVES.entries()) {
    it(`${rule.from} → ${rule.to} works with its ${rule.role}, and keeps the message`, async () => {
      const key = `p-${index + 1}`;
      await ticketIn(key, rule.from);
      const res = await move(key, rule.to, "what happened");
      expect(res.statusCode).toBe(200);
      const body = res.json<MoveResponse>();
      expect(body.ticket.status).toBe(rule.to);
      expect(body.comment).toMatchObject({
        body: "what happened",
        role: rule.role,
        move: { from: rule.from, to: rule.to },
      });
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

describe("tickets", () => {
  it("creating twice leaves one ticket, updated, with its status untouched", async () => {
    const first = await put("sports-app-1", { title: "First" });
    expect(first.statusCode).toBe(201);
    expect(first.json<UpsertTicketResponse>()).toMatchObject({
      created: true,
      ticket: { key: "sports-app-01", status: "todo" },
    });
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

describe("todos and Backlog", () => {
  const todo = (slug: string, title = `Todo ${slug}`) => ({
    slug,
    title,
    summary: `About ${slug}`,
    path: `corpus/todos/${slug}.md`,
  });
  const syncTodos = async (
    project: string,
    todos: ReturnType<typeof todo>[] | undefined,
    briefs: Partial<SyncBrief>[] = [],
  ) =>
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
    expect(ticket).toMatchObject({
      number: null,
      status: "backlog",
      title: "Todo walls-step-2",
      briefPath: "corpus/todos/walls-step-2.md",
    });
    expect(history).toMatchObject([{ from: null, to: "backlog", via: "sync" }]);
    const [lane] = (await board()).lanes;
    expect(lane?.tickets.map((t) => t.key)).toEqual(["p:walls-step-2"]);
  });

  it("keeps a todo's ticket to its title, summary and path", async () => {
    await syncTodos("p", [todo("a")]);
    expect((await syncTodos("p", [todo("a")])).todos).toEqual({ created: 0, updated: 0, unchanged: 1, removed: 0 });
    expect((await syncTodos("p", [todo("a", "A better title")])).todos).toEqual({
      created: 0,
      updated: 1,
      unchanged: 0,
      removed: 0,
    });
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
    expect(lane?.tickets.map((t) => [t.key, t.status])).toEqual([
      ["p:stays", "backlog"],
      ["p-03", "todo"],
    ]);
  });

  it("leaves a project's todo tickets alone when a CLI from before Backlog sends no todos", async () => {
    await syncTodos("p", [todo("a")]);
    expect((await syncTodos("p", undefined, [{ number: 1 }])).todos).toEqual({
      created: 0,
      updated: 0,
      unchanged: 0,
      removed: 0,
    });
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
    setClock(new Date(clock.getTime() + ms));
  };
  const start = (key: string, author?: string) =>
    call({ method: "POST", url: `/api/tickets/${key}/start`, payload: { author } });
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

  it("creates a blocked brief's ticket in Backlog with its condition, never in To Do", async () => {
    const result = await syncWith([blocked(14)]);
    expect(result).toMatchObject({ created: 1, warnings: [] });
    const { ticket, history } = await detail("p-14");
    expect(ticket).toMatchObject({
      number: 14,
      status: "backlog",
      blockedBy: "a stronger machine",
      briefPath: "corpus/briefs/blocked/14-x.md",
    });
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
    for (const [key, from] of [
      ["p-01", "todo"],
      ["p-02", "blocked"],
    ] as const) {
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
    expect(result.warnings).toEqual([
      "p-01: its brief is in blocked/, but its run by ana is open; the run's end move decides",
    ]);
    expect((await detail("p-01")).ticket).toMatchObject({
      status: "in_progress",
      blockedBy: "a stronger machine",
      run: { ended: null },
    });
  });

  it("moves an In Progress ticket to Backlog once its run is stale, ending the run, or released", async () => {
    await put("p-01");
    await start("p-01", "ana");
    const heard = clock.toISOString();
    later(5 * HOUR);
    const stale = await syncWith([blocked(1)]);
    expect(stale.warnings).toEqual([
      `p-01: waits in Backlog; its run by ana was stale (last heard ${heard}) and ends here`,
    ]);
    const first = await detail("p-01");
    expect(first.ticket.status).toBe("backlog");
    expect(first.runs).toMatchObject([{ author: "ana", ended: "stale", endedTo: "backlog" }]);
    expect(first.comments.at(-1)?.body).toBe(
      `${WAITING} The run by ana, last heard ${heard}, was stale and ends here.`,
    );

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
    await syncWith([
      { number: 1, state: "done" },
      { number: 2, state: "superseded" },
    ]);
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
    expect((await detail("p:sonarqube")).ticket).toMatchObject({
      blockedBy: null,
      briefPath: "corpus/todos/sonarqube.md",
    });
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
            briefs: [
              { number: 1, title: "Brief 1", summary: "", briefPath: "corpus/briefs/todo/1-x.md", state: "todo" },
            ],
            todos: [{ slug: "a", title: "A", summary: "", path: "corpus/todos/a.md" }],
          },
        ],
      },
    });
    expect(older.statusCode).toBe(200);
    expect(older.json<SyncResponse>().warnings).toEqual([
      "p-14: no brief with this number in p's corpus; nothing changed",
    ]);
    expect((await detail("p-01")).ticket).toMatchObject({ status: "todo", blockedBy: null });
    expect((await detail("p:a")).ticket.blockedBy).toBeNull();
    expect((await detail("p-14")).ticket).toMatchObject({ status: "backlog", blockedBy: "a stronger machine" });
  });

  it("keeps blocked briefs and todos off the needs list", async () => {
    await syncWith([blocked(14)], [todo("sonarqube", "a stronger machine")]);
    expect((await call({ url: "/api/needs" })).json<NeedsResponse>().needs).toEqual([]);
  });
});

describe("tags on an existing ticket", () => {
  const tags = (key: string, payload: Record<string, unknown>) =>
    call({ method: "POST", url: `/api/tickets/${key}/tags`, payload });

  it("adds and removes tags, records who changed what, and leaves the rest of the ticket", async () => {
    await put("p-01", { tags: ["old"] });
    const before = (await detail("p-01")).ticket;
    setClock(new Date(clock.getTime() + 60_000));
    const res = await tags("p-01", { add: ["ui", "server-structure", "ui"], remove: ["old"], author: "ana" });
    expect(res.statusCode).toBe(200);
    expect(res.json<TagsResponse>()).toMatchObject({
      added: ["server-structure", "ui"],
      removed: ["old"],
      ticket: { key: "p-01", tags: ["server-structure", "ui"], updatedAt: before.updatedAt },
    });
    const at = clock.toISOString();
    const { tagEvents, history, comments } = await detail("p-01");
    expect(tagEvents).toEqual([
      { tag: "old", change: "removed", author: "ana", at },
      { tag: "ui", change: "added", author: "ana", at },
      { tag: "server-structure", change: "added", author: "ana", at },
    ]);
    expect(history).toHaveLength(1);
    expect(comments).toEqual([]);
    expect((await board("?tag=server-structure")).lanes.flatMap((lane) => lane.tickets.map((t) => t.key))).toEqual([
      "p-01",
    ]);
  });

  it("is idempotent: a tag it carries, or one it lacks, changes and records nothing", async () => {
    await put("p-01");
    await tags("p-01", { add: ["ui"] });
    const again = (await tags("p-01", { add: ["ui"], remove: ["api"] })).json<TagsResponse>();
    expect(again).toMatchObject({ added: [], removed: [], ticket: { tags: ["ui"] } });
    const { tagEvents } = await detail("p-01");
    expect(tagEvents.map((event) => [event.tag, event.change, event.author])).toEqual([["ui", "added", "agent"]]);
  });

  it("never makes the project a tag", async () => {
    await put("p-01");
    expect((await tags("p-01", { add: ["p"] })).json<TagsResponse>()).toMatchObject({
      added: [],
      ticket: { tags: [] },
    });
  });

  it("removes a tag of any shape the ticket carries, but adds only lower-case hyphenated ones", async () => {
    await put("p-01", { tags: ["Odd Tag"] });
    expect((await tags("p-01", { remove: ["Odd Tag"] })).json<TagsResponse>().removed).toEqual(["Odd Tag"]);
    for (const bad of ["UI", "two words", "-lead", "trail-", "a--b", ""]) {
      const res = await tags("p-01", { add: [bad] });
      expect(res.statusCode, bad).toBe(400);
      expect(res.json<ErrorBody>().code).toBe("invalid_request");
    }
  });

  it("refuses an empty request, and a tag added and removed at once", async () => {
    await put("p-01");
    for (const payload of [{}, { add: [], remove: [] }, { add: ["ui"], remove: ["ui"] }]) {
      const res = await tags("p-01", payload);
      expect(res.statusCode, JSON.stringify(payload)).toBe(400);
      expect(res.json<ErrorBody>().code).toBe("invalid_request");
    }
  });

  it("refuses more than 20 tags on a ticket, changing nothing", async () => {
    await put("p-01", { tags: Array.from({ length: 19 }, (_, i) => `t${i}`) });
    const res = await tags("p-01", { add: ["a", "b"] });
    expect(res.statusCode).toBe(400);
    expect(res.json<ErrorBody>().code).toBe("too_many_tags");
    expect((await detail("p-01")).tagEvents).toEqual([]);
    expect((await tags("p-01", { add: ["a", "b"], remove: ["t0"] })).statusCode).toBe(200);
  });

  it("answers an unknown ticket 404, a bad key 400, and a Backlog ticket sync_owned", async () => {
    expect((await tags("p-09", { add: ["ui"] })).json<ErrorBody>().code).toBe("not_found");
    expect((await tags("not a key", { add: ["ui"] })).json<ErrorBody>().code).toBe("invalid_key");
    await call({
      method: "POST",
      url: "/api/sync",
      payload: {
        projects: [
          { project: "p", briefs: [], todos: [{ slug: "x", title: "X", summary: "", path: "corpus/todos/x.md" }] },
        ],
      },
    });
    const res = await tags("p:x", { add: ["ui"] });
    expect(res.statusCode).toBe(400);
    expect(res.json<ErrorBody>().code).toBe("sync_owned");
    expect((await detail("p:x")).ticket.tags).toEqual([]);
  });

  it("leaves the open run as it was, so a tagging pass cannot make a stale run look fresh", async () => {
    await ticketIn("p-01", "in_progress");
    const heard = (await detail("p-01")).ticket.run?.lastHeardAt;
    setClock(new Date(clock.getTime() + 60_000));
    await tags("p-01", { add: ["ui"] });
    expect((await detail("p-01")).ticket.run?.lastHeardAt).toBe(heard);
  });

  it("keeps the tags when a ticket is filed again without them, and replaces them when it names some", async () => {
    await put("p-01", { tags: ["ui"] });
    await tags("p-01", { add: ["fix"] });
    expect((await put("p-01", { title: "Renamed" })).json<UpsertTicketResponse>().ticket.tags).toEqual(["fix", "ui"]);
    expect((await put("p-01", { tags: [] })).json<UpsertTicketResponse>().ticket.tags).toEqual([]);
    expect((await put("p-02")).json<UpsertTicketResponse>().ticket.tags).toEqual([]);
  });
});
