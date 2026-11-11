import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SyncBrief, SyncTodo } from "@brief-board/shared";
import { openDatabase, type Db } from "../../db.js";
import { Store } from "../../db/store.js";
import { runSync } from "./service.js";

/**
 * Sync and sprints: sync acts on the active sprint's tickets only, and a
 * ticket in a closed sprint is never written. The rest of sync is tested
 * through the route in app.test.ts.
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

const brief = (number: number, fields: Partial<SyncBrief> = {}): SyncBrief => ({
  number,
  title: `Brief ${number}`,
  summary: `Summary ${number}`,
  briefPath: `corpus/briefs/${fields.state ?? "todo"}/${number}-x.md`,
  state: "todo",
  ...fields,
});
const todo = (slug: string): SyncTodo => ({ slug, title: slug, summary: "", path: `corpus/todos/${slug}.md` });
const sync = (briefs: SyncBrief[], todos?: SyncTodo[]) =>
  runSync(store, { projects: [{ project: "p", briefs, ...(todos && { todos }) }] });

/** Everything stored about a ticket: its row and every row hanging off it. */
const everything = (key: string) => ({
  ticket: db.prepare("SELECT * FROM tickets WHERE key = ?").get(key),
  ...Object.fromEntries(
    ["ticket_tags", "comments", "history", "runs", "questions"].map((table) => [
      table,
      db.prepare(`SELECT * FROM ${table} WHERE ticket_key = ? ORDER BY rowid`).all(key),
    ]),
  ),
});

/** p-01 Done and p-02 In Progress, then the next sprint: p-01 stays in the closed one. */
function closedSprintWithDone(): void {
  sync([brief(1), brief(2)]);
  store.move("p-01", "in_progress", undefined, "ana");
  store.move("p-01", "done", "Shipped.", "ana");
  store.move("p-02", "in_progress", undefined, "ana");
  expect(store.startSprint(3, store.today()).ok).toBe(true);
  expect(store.getTicket("p-01")?.sprint).toBe(2);
}

describe("sync after a sprint start", () => {
  it("files a new brief in the active sprint", () => {
    closedSprintWithDone();
    expect(sync([brief(1, { state: "done" }), brief(2), brief(3)]).created).toBe(1);
    expect(store.getTicket("p-03")).toMatchObject({ status: "todo", sprint: 3 });
    expect(store.board(14).flatMap((lane) => lane.tickets.map((ticket) => ticket.key))).toEqual(["p-02", "p-03"]);
  });

  it("does nothing for a brief in done/ whose ticket is in a closed sprint, even with a new title and path", () => {
    closedSprintWithDone();
    const before = everything("p-01");
    const result = sync([brief(1, { state: "done", title: "Renamed" }), brief(2)]);
    expect(result).toMatchObject({ created: 0, updated: 0, unchanged: 2, warnings: [] });
    expect(everything("p-01")).toEqual(before);
  });

  it("warns and changes nothing for a closed sprint's Done ticket whose brief is back in todo/ or in blocked/", () => {
    closedSprintWithDone();
    const before = everything("p-01");
    const back = sync([brief(1, { title: "Again" }), brief(2)]);
    expect(back.warnings).toEqual([
      "p-01 is Done in sprint 2, which is closed, but its brief is in todo/; nothing changed",
    ]);
    expect(everything("p-01")).toEqual(before);
    const blocked = sync([brief(1, { state: "blocked", blockedBy: "a stronger machine" }), brief(2)]);
    expect(blocked.warnings).toEqual([
      "p-01 is Done in sprint 2, which is closed, but its brief is in blocked/; nothing changed",
    ]);
    expect(everything("p-01")).toEqual(before);
  });

  it("does not hide a closed sprint's ticket whose brief is superseded, and says so", () => {
    closedSprintWithDone();
    const before = everything("p-01");
    const result = sync([brief(1, { state: "superseded" }), brief(2)]);
    expect(result.warnings).toEqual([
      "p-01 is Done in sprint 2, which is closed, but its brief is in superseded/; nothing changed",
    ]);
    expect(everything("p-01")).toEqual(before);
  });

  it("does not warn about a closed sprint's ticket whose brief is gone, and still warns about an active one's", () => {
    closedSprintWithDone();
    expect(sync([]).warnings).toEqual(["p-02: no brief with this number in p's corpus; nothing changed"]);
  });

  it("removes a gone todo's ticket from the active sprint only", () => {
    sync([], [todo("old"), todo("kept")]);
    expect(store.startSprint(3, store.today()).ok).toBe(true);
    // A todo's ticket never stays behind in a closed sprint; put one there to see sync leave it.
    db.prepare("UPDATE tickets SET sprint = 2 WHERE key = 'p:kept'").run();
    const before = everything("p:kept");
    const result = sync([], [todo("new")]);
    expect(result.todos).toEqual({ created: 1, updated: 0, unchanged: 0, removed: 1 });
    expect(store.getTicket("p:old")).toBeNull();
    expect(everything("p:kept")).toEqual(before);
    expect(store.getTicket("p:new")?.sprint).toBe(3);
    // And one in the payload is left as it is, with a warning, not made twice.
    const again = sync([], [todo("new"), todo("kept")]);
    expect(again.warnings).toEqual(["p:kept is in sprint 2, which is closed; nothing changed"]);
    expect(everything("p:kept")).toEqual(before);
  });
});
