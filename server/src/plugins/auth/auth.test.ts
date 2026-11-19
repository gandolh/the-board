import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { BoardResponse, ErrorBody, SprintsResponse } from "@brief-board/shared";
import type { InjectOptions } from "fastify";
import { UsernameTakenError } from "../../../vendor/ward/ward-auth.js";
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

describe("linking Ward", () => {
  const PASSWORD = "p".repeat(12);
  const ISSUER = "https://ward.test/ward-api/oidc";

  /** A Ward client whose only server is a fetch stub that serves the discovery document. */
  function wardOptions() {
    const jwk = generateKeyPairSync("ed25519").privateKey.export({ format: "jwk" });
    const clientKey = Buffer.from(JSON.stringify({ ...jwk, kid: "test-key" })).toString("base64url");
    return {
      issuer: ISSUER,
      clientId: "brief-board",
      clientKey,
      redirectUri: "http://localhost/brief-board-api/auth/ward/callback",
      fetch: (input: string | URL | Request) => {
        const url = String(input);
        if (url.endsWith("/.well-known/openid-configuration")) {
          return Promise.resolve(
            Response.json({
              issuer: ISSUER,
              authorization_endpoint: `${ISSUER}/authorize`,
              token_endpoint: `${ISSUER}/token`,
              jwks_uri: `${ISSUER}/jwks`,
              response_types_supported: ["code"],
              subject_types_supported: ["public"],
              id_token_signing_alg_values_supported: ["EdDSA"],
            }),
          );
        }
        return Promise.resolve(new Response("not found", { status: 404 }));
      },
    };
  }

  async function withWard() {
    const built = await buildTestApp({ ward: wardOptions() });
    await seedUser(built.accounts, { username: "owner", password: PASSWORD });
    const login = await built.app.inject({
      method: "POST",
      url: "/brief-board-api/auth/login",
      payload: { username: "owner", password: PASSWORD },
    });
    const header = login.headers["set-cookie"];
    const lines = header === undefined ? [] : Array.isArray(header) ? header : [header];
    const cookie = lines.find((l) => l.startsWith(`${SESSION_COOKIE}=`))!.split(";")[0]!;
    const link = (payload: unknown) =>
      built.app.inject({
        method: "POST",
        url: "/brief-board-api/auth/ward/link",
        payload: payload as object,
        headers: { cookie },
      });
    return { ...built, link, cookie };
  }

  it("refuses a link without the password, and with a wrong one", async () => {
    const { app: wardApp, link } = await withWard();
    try {
      const missing = await link({});
      expect(missing.statusCode).toBe(400);
      expect(missing.json<{ error: string }>().error).toBe("invalid_request");
      const wrong = await link({ currentPassword: "w".repeat(12) });
      expect(wrong.statusCode).toBe(401);
      expect(wrong.json<{ error: string }>().error).toBe("invalid_credentials");
    } finally {
      await wardApp.close();
    }
  });

  it("sends the browser to Ward once the right password is typed", async () => {
    const { app: wardApp, link } = await withWard();
    try {
      const res = await link({ currentPassword: PASSWORD });
      expect(res.statusCode).toBe(200);
      expect(res.json<{ url: string }>().url).toContain(`${ISSUER}/authorize`);
    } finally {
      await wardApp.close();
    }
  });

  it("answers 429 after five wrong passwords", async () => {
    const { app: wardApp, link } = await withWard();
    try {
      for (let i = 0; i < 5; i++) expect((await link({ currentPassword: "w".repeat(12) })).statusCode).toBe(401);
      const res = await link({ currentPassword: "w".repeat(12) });
      expect(res.statusCode).toBe(429);
      expect(res.json<{ error: string }>().error).toBe("too_many_attempts");
    } finally {
      await wardApp.close();
    }
  });

  it("has no register route, and the seed refuses a name that looks like an existing one", async () => {
    const { app: wardApp, accounts: wardAccounts, cookie } = await withWard();
    try {
      const register = await wardApp.inject({
        method: "POST",
        url: "/brief-board-api/auth/register",
        payload: { username: "AIice", password: PASSWORD },
        headers: { cookie },
      });
      expect(register.statusCode).toBe(404);
      await seedUser(wardAccounts, { username: "alice", password: PASSWORD });
      await expect(seedUser(wardAccounts, { username: "AIice", password: PASSWORD })).rejects.toThrow(
        UsernameTakenError,
      );
    } finally {
      await wardApp.close();
    }
  });
});
