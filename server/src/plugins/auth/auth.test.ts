import { describe, expect, it } from "vitest";
import type { BoardResponse, ErrorBody, SprintsResponse } from "@brief-board/shared";
import type { InjectOptions } from "fastify";
import { seedUser } from "../../plugins/auth/accounts.js";
import { SESSION_COOKIE } from "../../plugins/auth/index.js";
import { useTestBoard, buildTestApp, call, detail, app, BEARER, accounts } from "../../testing/buildTestApp.js";

useTestBoard();

describe("the CLI's token", () => {
  const TOKEN = "t".repeat(40);
  const routes = [
    { name: "a read", method: "GET" as const, url: "/api/board" },
    {
      name: "a write",
      method: "PUT" as const,
      url: "/api/tickets/atrium-01",
      payload: { title: "A", summary: "", briefPath: "corpus/briefs/todo/01-a.md" },
    },
    { name: "a sync", method: "POST" as const, url: "/api/sync", payload: { projects: [] } },
  ];

  it("closes the bearer path when no token is configured", async () => {
    const tokenless = (await buildTestApp({ token: undefined })).app;
    try {
      for (const route of routes) {
        expect((await tokenless.inject(route)).statusCode, `${route.name} with no header`).toBe(401);
        expect((await tokenless.inject({ ...route, headers: { authorization: "Bearer " } })).statusCode).toBe(401);
        expect(
          (await tokenless.inject({ ...route, headers: BEARER })).statusCode,
          `${route.name} with some token`,
        ).toBe(401);
      }
      expect((await tokenless.inject({ url: "/api/health" })).statusCode).toBe(200);
    } finally {
      await tokenless.close();
    }
  });

  it("needs the right Bearer header on reads, writes and sync once one is configured", async () => {
    const guarded = (await buildTestApp({ token: TOKEN })).app;
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
    const guarded = (await buildTestApp({ token: TOKEN })).app;
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
    await seedUser(accounts, { username: "owner", password: PASSWORD });
    const res = await app.inject({
      method: "POST",
      url: "/brief-board-api/auth/login",
      payload: { username: "owner", password: PASSWORD },
    });
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
    await call({
      method: "PUT",
      url: "/api/tickets/atrium-01",
      payload: { title: "A", summary: "", briefPath: "corpus/briefs/todo/01-a.md" },
    });
    const cookie = await signIn();
    const board = await app.inject({ url: "/brief-board-api/api/board", headers: { cookie } });
    expect(board.statusCode).toBe(200);
    expect(board.json<BoardResponse>().lanes.map((lane) => lane.project)).toEqual(["atrium"]);
    expect((await app.inject({ url: "/brief-board-api/api/tickets/atrium-01", headers: { cookie } })).statusCode).toBe(
      200,
    );
    expect((await app.inject({ url: "/brief-board-api/api/sprints", headers: { cookie } })).statusCode).toBe(200);
    expect((await app.inject({ url: "/brief-board-api/api/sprints/1", headers: { cookie } })).statusCode).toBe(200);
    const session = await app.inject({ url: "/brief-board-api/auth/session", headers: { cookie } });
    expect(session.json<{ user: { username: string } }>().user.username).toBe("owner");
  });

  it("refuses a session's writes and sync, and keeps it signed in", async () => {
    await call({
      method: "PUT",
      url: "/api/tickets/atrium-01",
      payload: { title: "A", summary: "", briefPath: "corpus/briefs/todo/01-a.md" },
    });
    const cookie = await signIn();
    const writes: InjectOptions[] = [
      {
        method: "PUT",
        url: "/brief-board-api/api/tickets/atrium-02",
        payload: { title: "B", summary: "", briefPath: "corpus/briefs/todo/02-b.md" },
      },
      { method: "POST", url: "/brief-board-api/api/tickets/atrium-01/comments", payload: { body: "hi" } },
      { method: "POST", url: "/brief-board-api/api/tickets/atrium-01/moves", payload: { to: "in_progress" } },
      { method: "POST", url: "/brief-board-api/api/sync", payload: { projects: [] } },
      { method: "POST", url: "/brief-board-api/api/sprints", payload: { number: 3 } },
    ];
    for (const write of writes) {
      const res = await app.inject({ ...write, headers: { cookie } });
      expect(res.statusCode, `${write.method} ${write.url}`).toBe(401);
      expect(res.json<ErrorBody & { reason?: string }>()).toMatchObject({
        code: "unauthorized",
        reason: "read_only_session",
      });
      expect(res.headers["set-cookie"], "the cookie is not cleared").toBeUndefined();
    }
    expect((await detail("atrium-01")).comments).toEqual([]);
    expect((await call({ url: "/api/sprints" })).json<SprintsResponse>().active.number).toBe(2);
    expect((await app.inject({ url: "/brief-board-api/api/board", headers: { cookie } })).statusCode).toBe(200);
    expect(
      (await app.inject({ url: "/brief-board-api/auth/session", headers: { cookie } })).json<{ user: unknown }>().user,
    ).not.toBeNull();
  });

  it("still lets the token read and write, with or without a cookie", async () => {
    const cookie = await signIn();
    const put = {
      method: "PUT" as const,
      url: "/api/tickets/atrium-03",
      payload: { title: "C", summary: "", briefPath: "corpus/briefs/todo/03-c.md" },
    };
    expect((await call(put)).statusCode).toBe(201);
    expect((await app.inject({ ...put, headers: { ...BEARER, cookie } })).statusCode).toBe(200);
    expect((await call({ url: "/api/board" })).statusCode).toBe(200);
  });

  it("has no rename route, so a session cannot change its username", async () => {
    const cookie = await signIn();
    const res = await app.inject({
      method: "POST",
      url: "/brief-board-api/auth/username",
      payload: { username: "someone" },
      headers: { cookie },
    });
    expect(res.statusCode).toBe(404);
    const session = await app.inject({ url: "/brief-board-api/auth/session", headers: { cookie } });
    expect(session.json<{ user: { username: string } }>().user.username).toBe("owner");
  });

  it("keeps health open", async () => {
    expect((await app.inject({ url: "/api/health" })).json()).toEqual({ ok: true });
    expect((await app.inject({ method: "HEAD", url: "/brief-board-api/api/health" })).statusCode).toBe(200);
  });
});
