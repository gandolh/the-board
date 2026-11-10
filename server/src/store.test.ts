import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Status } from "@brief-board/shared";
import { openDatabase, type Db } from "./db.js";
import { SprintClosedError, Store } from "./store.js";

/**
 * Sprints in the store: starting one, the frozen closed sprint, and the reads
 * that cover the active sprint only. The clock is the real one, as the
 * migration dates Sprint 1 and Sprint 2 with SQLite's own today.
 */

let db: Db;
let store: Store;

beforeEach(() => {
  db = openDatabase(":memory:");
  store = new Store(db);
});
afterEach(() => {
  db.close();
});

/** The moves from To Do to each status, through the table. */
const PATH_TO: Partial<Record<Status, [Status, string?][]>> = {
  todo: [],
  in_progress: [["in_progress"]],
  blocked: [["in_progress"], ["blocked", "the owner decides"]],
  ready_for_test: [["in_progress"], ["ready_for_test", "try it"]],
  ready_for_deploy: [["in_progress"], ["ready_for_deploy", "deploy it"]],
  done: [["in_progress"], ["done"]],
};

function brief(key: string, status: Status, blockedBy: string | null = null): void {
  const number = Number(key.split("-").at(-1));
  store.insertTicket({
    key,
    project: key.split(/[-:]/)[0]!,
    number: key.includes(":") ? null : number,
    title: `Ticket ${key}`,
    summary: "",
    summarySource: "sync",
    briefPath: `corpus/briefs/todo/${key}.md`,
    author: "sync",
    via: "sync",
    blockedBy,
  });
  for (const [to, message] of PATH_TO[status] ?? []) expect(store.move(key, to, message, "ana")?.ok).toBe(true);
}

/** A board with a ticket in every column, a run, holds, questions and comments, and a hidden Done ticket. */
function aBoard(): void {
  brief("p:night-mode", "backlog");
  brief("p-01", "backlog", "a stronger machine");
  brief("p-02", "todo");
  brief("p-03", "in_progress");
  store.hold("p-03", "port", "5173");
  store.ask("p-03", ["Today?"], "ana");
  store.addComment("p-03", { author: "ana", body: "Half done.", role: null, move: null });
  brief("p-04", "blocked");
  brief("p-05", "ready_for_test");
  brief("p-06", "ready_for_deploy");
  brief("p-07", "in_progress");
  store.ask("p-07", ["Blue or green?", "Ship it?"], "ana");
  expect(store.answer("p-07", 1, "Blue", "owner").ok).toBe(true);
  store.move("p-07", "done", "Shipped.", "ana");
  brief("p-08", "done");
  store.updateTicket("p-08", { hidden: true });
}

const sprintOf = (key: string) => store.getTicket(key)?.sprint;
const row = (key: string) => db.prepare("SELECT * FROM tickets WHERE key = ?").get(key);
const historyCount = () => db.prepare("SELECT COUNT(*) FROM history").pluck().get();

describe("starting a sprint", () => {
  it("closes the active sprint on the day, moves every ticket that is not Done, hidden or not, and leaves the Done ones", () => {
    aBoard();
    const today = store.today();
    expect(store.activeSprint()).toEqual({ number: 2, startedOn: today, endedOn: null, doneCount: 1 });
    const children = (key: string) => ({ runs: store.runs(key), questions: store.questions(key), comments: store.comments(key) });
    const before = { "p-03": children("p-03"), "p-07": children("p-07") };
    const updatedAt = store.getTicket("p-02")!.updatedAt;
    const events = historyCount();

    const started = store.startSprint(3, today);
    expect(started).toEqual({
      ok: true,
      sprint: { number: 3, startedOn: today, endedOn: null, doneCount: 0 },
      closed: { number: 2, startedOn: today, endedOn: today, doneCount: 1 },
      moved: 7,
    });
    for (const key of ["p:night-mode", "p-01", "p-02", "p-03", "p-04", "p-05", "p-06"]) expect(sprintOf(key), key).toBe(3);
    expect(sprintOf("p-07")).toBe(2);
    expect(sprintOf("p-08")).toBe(2);
    expect(store.getTicket("p-01")).toMatchObject({ status: "backlog", blockedBy: "a stronger machine" });

    // What hangs off a ticket goes with it, untouched: the open run and its hold, questions, comments.
    for (const key of ["p-03", "p-07"] as const) expect(children(key), key).toEqual(before[key]);
    expect(store.openRun("p-03")).not.toBeNull();
    expect(store.runs("p-03")[0]!.holds).toMatchObject([{ kind: "port", value: "5173" }]);
    // The sprint is a column, not an event.
    expect(historyCount()).toBe(events);
    expect(store.getTicket("p-02")!.updatedAt).toBe(updatedAt);

    expect(store.sprints().map((sprint) => [sprint.number, sprint.endedOn])).toEqual([
      [3, null],
      [2, today],
      [1, today],
    ]);
    expect(store.sprintTickets(2).map((ticket) => ticket.key)).toEqual(["p-07"]);
  });

  it("refuses a number that is not the active one plus one, and changes nothing", () => {
    aBoard();
    const today = store.today();
    for (const stale of [1, 2, 4]) expect(store.startSprint(stale, today)).toMatchObject({ ok: false, active: { number: 2 } });
    expect(store.startSprint(3, today).ok).toBe(true);
    // The same command again starts no second sprint.
    expect(store.startSprint(3, today)).toMatchObject({ ok: false, active: { number: 3, endedOn: null } });
    expect(store.sprints().map((sprint) => sprint.number)).toEqual([3, 2, 1]);
  });

  it("files a new ticket in the new sprint", () => {
    store.startSprint(3, store.today());
    brief("p-09", "todo");
    expect(sprintOf("p-09")).toBe(3);
  });
});

describe("a closed sprint", () => {
  it("refuses every write on its tickets, naming the sprint, and the row stays as it was", () => {
    aBoard();
    store.startSprint(3, store.today());
    const frozen = row("p-07");
    const writes: [string, () => unknown][] = [
      ["move", () => store.move("p-07", "in_progress", "again", "ana")],
      ["start", () => store.start("p-07", "again", "ana")],
      ["release", () => store.release("p-07", "stopped", "ana")],
      ["hold", () => store.hold("p-07", "port", "1")],
      ["drop", () => store.drop("p-07", "port", "1")],
      ["answer", () => store.answer("p-07", 2, "yes", "owner")],
      ["ask", () => store.ask("p-07", ["Why?"], "ana")],
      ["comment", () => store.addComment("p-07", { author: "ana", body: "late", role: null, move: null })],
      ["upsert", () => store.updateTicket("p-07", { title: "Renamed" })],
      ["tags", () => store.setTags("p-07", "p", ["ui"])],
      ["touch", () => store.touchRun("p-07")],
      ["status", () => store.setStatus("p-07", "done", "todo", "sync", "sync")],
      ["end run", () => store.endRun("p-07", "stale")],
      ["delete", () => store.deleteTicket("p-07")],
    ];
    for (const [name, write] of writes) {
      expect(write, name).toThrow(SprintClosedError);
      expect(write, name).toThrow(`p-07 is in sprint 2, which closed on ${store.today()}`);
    }
    expect(row("p-07")).toEqual(frozen);
    expect(store.questions("p-07").filter((question) => question.answeredAt === null)).toHaveLength(1);
  });

  it("leaves the board, older Done, needs, runs and questions, and is still found by its key", () => {
    aBoard();
    // Long Done, so it would be on the older Done page in the active sprint.
    db.prepare("UPDATE tickets SET status_changed_at = '2026-01-01T00:00:00.000Z' WHERE key = 'p-07'").run();
    expect(store.olderDone(14).map((ticket) => ticket.key)).toEqual(["p-07"]);
    expect(store.openQuestions().map((entry) => entry.key)).toEqual(["p-03", "p-07"]);
    store.startSprint(3, store.today());

    const onBoard = store.board(3650).flatMap((lane) => lane.tickets.map((ticket) => ticket.key));
    expect(onBoard).toEqual(["p:night-mode", "p-01", "p-02", "p-03", "p-04", "p-05", "p-06"]);
    expect(store.olderDone(0)).toEqual([]);
    expect(store.openQuestions().map((entry) => entry.key)).toEqual(["p-03"]);
    expect(store.needs().map((need) => need.key)).not.toContain("p-07");
    expect(store.openRuns().map((entry) => entry.key)).toEqual(["p-03"]);
    expect(store.getTicket("p-07")).toMatchObject({ status: "done", sprint: 2 });
    expect(store.projectTickets("p").map((ticket) => [ticket.key, ticket.sprint])).toContainEqual(["p-07", 2]);
  });
});
