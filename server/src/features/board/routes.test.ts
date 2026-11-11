import { serializerCompiler, validatorCompiler } from "@fastify/type-provider-zod";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import type { ErrorBody, NeedsResponse } from "@brief-board/shared";
import {
  useTestBoard,
  call,
  put,
  move,
  board,
  olderDone,
  sync,
  ticketIn,
  clock,
  setClock,
  PATH_TO,
} from "../../testing/buildTestApp.js";
import type { Store } from "../../db/store.js";
import { boardRoutes } from "./index.js";

useTestBoard();

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
    setClock(new Date(clock.getTime() + 15 * 24 * 60 * 60 * 1000));
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
    setClock(new Date(clock.getTime() + days * DAY));
  };

  it("lists only Done tickets that are not hidden and older than 14 days", async () => {
    await doneThen("p-01", 0);
    await sync("p", [{ number: 1, state: "superseded" }]);
    await doneThen("p-02", 0);
    await ticketIn("p-03", "ready_for_deploy");
    await ticketIn("p-04", "todo");
    setClock(new Date(clock.getTime() + 20 * DAY));
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
    setClock(new Date(clock.getTime() + 15 * DAY));
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
    setClock(new Date(clock.getTime() + 1));
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

describe("what needs the owner", () => {
  const HOUR = 60 * 60 * 1000;
  const later = (ms: number) => {
    setClock(new Date(clock.getTime() + ms));
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
    expect(blocked?.since).toBe(blockedAt);
    expect(stale?.since).toBe(heard);
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

describe("the board's response schema", () => {
  it("drops a field of a store row that the schema does not list", async () => {
    const store = {
      activeSprint: () => ({ number: 2, startedOn: "2026-11-10", internal: "never sent" }),
      board: () => [{ project: "alpha", tickets: [], internal: "never sent" }],
    } as unknown as Store;
    const app = Fastify();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    await app.register(boardRoutes, { store });
    try {
      const res = await app.inject({ url: "/api/board" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({
        sprint: { number: 2, startedOn: "2026-11-10" },
        lanes: [{ project: "alpha", tickets: [] }],
      });
    } finally {
      await app.close();
    }
  });
});
