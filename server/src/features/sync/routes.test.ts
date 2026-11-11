import { describe, expect, it } from "vitest";
import { useTestBoard, call, put, detail, board, sync, ticketIn } from "../../testing/buildTestApp.js";

useTestBoard();

describe("sync", () => {
  it("creates a ticket for a brief in todo/, in To Do, its summary from the brief", async () => {
    expect(await sync("atrium", [{ number: 83 }])).toMatchObject({ created: 1, updated: 0, warnings: [] });
    const { ticket, history } = await detail("atrium-83");
    expect(ticket).toMatchObject({ status: "todo", summarySource: "sync", summary: "Summary 83" });
    expect(history).toEqual([expect.objectContaining({ from: null, to: "todo", via: "sync", author: "sync" })]);
  });

  it("refreshes title and path, and the summary only if sync wrote it", async () => {
    await sync("atrium", [{ number: 1 }, { number: 2 }]);
    await put("atrium-02", { title: "Agent title", summary: "Agent summary" });
    const res = await sync("atrium", [
      { number: 1, title: "New 1", summary: "New summary 1" },
      { number: 2, title: "New 2", summary: "New summary 2" },
    ]);
    expect(res).toMatchObject({ created: 0, updated: 2 });
    expect((await detail("atrium-01")).ticket).toMatchObject({ title: "New 1", summary: "New summary 1" });
    expect((await detail("atrium-02")).ticket).toMatchObject({
      title: "New 2",
      summary: "Agent summary",
      summarySource: "agent",
    });
    expect(
      await sync("atrium", [
        { number: 1, title: "New 1", summary: "New summary 1" },
        { number: 2, title: "New 2" },
      ]),
    ).toMatchObject({
      unchanged: 2,
    });
  });

  it("closes To Do, In Progress (with no open run) and Blocked tickets whose brief is in done/, without the table", async () => {
    await ticketIn("p-01", "todo");
    await ticketIn("p-02", "in_progress");
    await call({ method: "POST", url: "/api/tickets/p-02/release", payload: { message: "stopped" } });
    await ticketIn("p-03", "blocked");
    const res = await sync(
      "p",
      [1, 2, 3].map((number) => ({ number, state: "done" as const })),
    );
    expect(res.updated).toBe(3);
    for (const key of ["p-01", "p-02", "p-03"]) {
      const { ticket, comments, history } = await detail(key);
      expect(ticket.status).toBe("done");
      expect(ticket.briefPath).toContain("/done/");
      expect(history.at(-1)).toMatchObject({ to: "done", via: "sync", author: "sync" });
      expect(comments.at(-1)).toMatchObject({
        body: "Closed by sync: the brief is in done/.",
        role: "conclusion",
        author: "sync",
      });
    }
  });

  it("leaves Ready for test and Ready for deploy alone when the brief is done", async () => {
    await ticketIn("p-01", "ready_for_test");
    await ticketIn("p-02", "ready_for_deploy");
    await sync(
      "p",
      [1, 2].map((number) => ({ number, state: "done" as const })),
    );
    expect((await detail("p-01")).ticket.status).toBe("ready_for_test");
    expect((await detail("p-02")).ticket.status).toBe("ready_for_deploy");
  });

  it("does not backfill a ticket for a brief already in done/", async () => {
    expect(await sync("p", [{ number: 5, state: "done" }])).toMatchObject({ created: 0 });
    expect((await call({ url: "/api/tickets/p-05" })).statusCode).toBe(404);
  });

  it("hides the ticket of a superseded brief", async () => {
    await sync("p", [{ number: 1 }]);
    await sync("p", [{ number: 1, state: "superseded" }]);
    expect((await detail("p-01")).ticket.hidden).toBe(true);
    expect((await board()).lanes).toEqual([]);
  });

  it("warns, and changes nothing, for a Done ticket whose brief is in todo/ and for a ticket with no brief", async () => {
    await ticketIn("p-01", "done");
    await put("p-02");
    const res = await sync("p", [{ number: 1, title: "Changed" }]);
    expect(res.warnings).toEqual([
      "p-01 is Done on the board but its brief is in todo/; nothing changed",
      "p-02: no brief with this number in p's corpus; nothing changed",
    ]);
    expect((await detail("p-01")).ticket).toMatchObject({ status: "done", title: "A brief" });
    expect((await detail("p-02")).ticket.status).toBe("todo");
  });

  it("touches only the projects in the payload", async () => {
    await put("other-01");
    expect((await sync("p", [{ number: 1 }])).warnings).toEqual([]);
    expect((await detail("other-01")).ticket.status).toBe("todo");
  });
});
