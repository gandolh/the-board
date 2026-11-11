import { serializerCompiler, validatorCompiler } from "@fastify/type-provider-zod";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import type { ErrorBody } from "@brief-board/shared";
import { useTestBoard, call, put, move } from "../testing/buildTestApp.js";
import type { Store } from "../db/store.js";
import { boardRoutes } from "../features/board/index.js";
import { errors } from "./errors.js";

useTestBoard();

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

describe("a reply that fails its response schema", () => {
  it("is a 500 `internal`, with nothing of the failure shown", async () => {
    const store = {
      activeSprint: () => ({ number: 2, startedOn: "2026-11-10" }),
      board: () => "not lanes",
    } as unknown as Store;
    const app = Fastify();
    await app.register(errors);
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    await app.register(boardRoutes, { store });
    try {
      const res = await app.inject({ url: "/api/board" });
      expect(res.statusCode).toBe(500);
      expect(res.json()).toEqual({ code: "internal", message: "the board hit an error; see its log" });
    } finally {
      await app.close();
    }
  });

  it("is the same for any other thrown error, whose message stays out of the reply", async () => {
    const store = {
      activeSprint: () => {
        throw new Error("secret detail");
      },
    } as unknown as Store;
    const app = Fastify();
    await app.register(errors);
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    await app.register(boardRoutes, { store });
    try {
      const res = await app.inject({ url: "/api/board" });
      expect(res.statusCode).toBe(500);
      expect(res.body).not.toContain("secret");
    } finally {
      await app.close();
    }
  });
});
