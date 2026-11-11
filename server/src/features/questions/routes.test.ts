import { describe, expect, it } from "vitest";
import type {
  AnswerResponse,
  CommentResponse,
  ErrorBody,
  MoveResponse,
  QuestionsResponse,
  StartResponse,
  Status,
} from "@brief-board/shared";
import { useTestBoard, call, put, detail, board, sync, ticketIn, clock, setClock } from "../../testing/buildTestApp.js";

useTestBoard();

describe("questions", () => {
  const ask = (key: string, to: Status, message: string, questions: string[]) =>
    call({ method: "POST", url: `/api/tickets/${key}/moves`, payload: { to, message, questions, author: "ana" } });
  const answer = (key: string, number: number | string, text?: string) =>
    call({
      method: "POST",
      url: `/api/tickets/${key}/questions/${number}/answer`,
      payload: { answer: text, author: "owner" },
    });
  const open = async (query = "") =>
    (await call({ url: `/api/questions${query}` })).json<QuestionsResponse>().questions;

  it("a move with two questions stores both, numbered, and the move as before", async () => {
    await ticketIn("p-01", "in_progress");
    const res = await ask("p-01", "ready_for_deploy", "npm run deploy", ["Tabs too?", "Keep the old parser?"]);
    expect(res.statusCode).toBe(200);
    const body = res.json<MoveResponse>();
    expect(body.ticket).toMatchObject({ status: "ready_for_deploy", openQuestions: 2 });
    expect(body.comment).toMatchObject({ body: "npm run deploy", role: "deploy_steps" });
    expect(body.questions).toEqual([
      {
        number: 1,
        text: "Tabs too?",
        author: "ana",
        askedAt: clock.toISOString(),
        answer: null,
        answeredBy: null,
        answeredAt: null,
      },
      {
        number: 2,
        text: "Keep the old parser?",
        author: "ana",
        askedAt: clock.toISOString(),
        answer: null,
        answeredBy: null,
        answeredAt: null,
      },
    ]);
    expect((await detail("p-01")).questions.map((q) => q.number)).toEqual([1, 2]);
  });

  it("numbers go on per ticket across a comment and a start, and a refused move asks nothing", async () => {
    await put("p-01");
    const started = await call({ method: "POST", url: "/api/tickets/p-01/start", payload: { questions: ["First?"] } });
    expect(started.json<StartResponse>().questions.map((q) => q.number)).toEqual([1]);
    const commented = await call({
      method: "POST",
      url: "/api/tickets/p-01/comments",
      payload: { body: "note", questions: ["Second?"] },
    });
    expect(commented.json<CommentResponse>().questions.map((q) => q.number)).toEqual([2]);
    expect((await ask("p-01", "blocked", "", ["Never asked?"])).statusCode).toBe(400);
    await put("p-02");
    await call({
      method: "POST",
      url: "/api/tickets/p-02/comments",
      payload: { body: "note", questions: ["Other ticket?"] },
    });
    expect((await detail("p-01")).questions.map((q) => [q.number, q.text])).toEqual([
      [1, "First?"],
      [2, "Second?"],
    ]);
    expect((await detail("p-02")).questions.map((q) => q.number)).toEqual([1]);
  });

  it("answer closes one with its answer, says so in a comment, and the badge counts the rest", async () => {
    await ticketIn("p-01", "in_progress");
    await ask("p-01", "ready_for_test", "try it", ["Tabs too?", "Keep the old parser?"]);
    setClock(new Date(clock.getTime() + 60_000));
    const res = await answer("p-01", 2, "No, drop it.");
    expect(res.statusCode).toBe(200);
    const body = res.json<AnswerResponse>();
    expect(body.question).toMatchObject({
      number: 2,
      answer: "No, drop it.",
      answeredBy: "owner",
      answeredAt: clock.toISOString(),
    });
    expect(body.ticket.openQuestions).toBe(1);
    expect(body.comment).toMatchObject({
      author: "owner",
      body: "Answered question 2: Keep the old parser?\n\nNo, drop it.",
    });
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
    expect((await answer("p-01", 1, "c")).json<ErrorBody>().message).toBe(
      "p-01 has no open question 1; it has no open questions",
    );
    expect((await answer("p-01", 0, "c")).json<ErrorBody>().code).toBe("invalid_key");
    expect((await answer("p-01", 1)).json<ErrorBody>().code).toBe("invalid_request");
    expect((await answer("p-09", 1, "c")).statusCode).toBe(404);
  });

  it("lists open questions across projects, oldest first, and narrows to a project", async () => {
    await ticketIn("p-01", "in_progress");
    await ticketIn("q-01", "in_progress");
    await ask("q-01", "blocked", "owner decides", ["Older?"]);
    setClock(new Date(clock.getTime() + 60_000));
    await ask("p-01", "ready_for_test", "try it", ["Newer?", "Answered?"]);
    await answer("p-01", 2, "done");
    const all = await open();
    expect(
      all.map((entry) => [entry.key, entry.project, entry.status, entry.question.number, entry.question.text]),
    ).toEqual([
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
