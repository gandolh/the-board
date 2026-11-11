import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ErrorBody } from "@brief-board/shared";
import { stripApiPrefix } from "./app.js";
import { useTestBoard, buildTestApp, call, app, BEARER } from "./testing/buildTestApp.js";

useTestBoard();

describe("serving the board", () => {
  it("serves web/dist at /brief-board/ and falls back to index.html there, but not under /api", async () => {
    const dir = mkdtempSync(join(tmpdir(), "brief-board-web-"));
    writeFileSync(join(dir, "index.html"), "<title>brief-board</title>");
    mkdirSync(join(dir, "assets"));
    writeFileSync(join(dir, "assets", "app.js"), "console.log('board')");
    const served = (await buildTestApp({ webDist: dir })).app;
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
      expect(
        (await served.inject({ url: "/brief-board-api/api/missing", headers: BEARER })).json<ErrorBody>().code,
      ).toBe("not_found");
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
