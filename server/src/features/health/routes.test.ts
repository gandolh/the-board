import { describe, expect, it } from "vitest";
import { buildTestApp } from "../../testing/buildTestApp.js";

describe("the health route", () => {
  it("answers with no token or session, for the deploy's check", async () => {
    const { app } = await buildTestApp();
    try {
      const res = await app.inject({ url: "/api/health" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ ok: true });
    } finally {
      await app.close();
    }
  });
});
