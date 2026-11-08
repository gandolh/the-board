import { describe, expect, it } from "vitest";
import {
  boardQuerySchema,
  commentRequestSchema,
  moveRequestSchema,
  openRun,
  questionParamsSchema,
  runSchema,
  startRequestSchema,
  syncRequestSchema,
  ticketSchema,
  upsertTicketRequestSchema,
} from "./api.js";

const now = new Date().toISOString();

describe("the API contract", () => {
  it("parses a ticket", () => {
    const ticket = {
      key: "atrium-82",
      project: "atrium",
      number: 82,
      title: "The Jukebox page",
      summary: "A remote for the Discord bot.",
      summarySource: "sync",
      briefPath: "corpus/briefs/done/82-jukebox-page.md",
      tags: ["jukebox"],
      status: "done",
      hidden: false,
      createdAt: now,
      updatedAt: now,
      statusChangedAt: now,
      run: null,
      openQuestions: 0,
      blockedBy: null,
    };
    expect(ticketSchema.parse(ticket)).toEqual(ticket);
  });

  it("parses a ticket's run, open or ended, and says which is open", () => {
    const run = { id: 1, author: "agent", message: null, startedAt: now, lastHeardAt: now, stale: false, endedAt: null, ended: null, endedTo: null };
    expect(runSchema.parse(run)).toEqual(run);
    expect(openRun({ run })).toEqual(run);
    const moved = { ...run, endedAt: now, ended: "moved", endedTo: "ready_for_deploy" };
    expect(runSchema.parse(moved)).toEqual(moved);
    expect(openRun({ run: runSchema.parse(moved) })).toBeNull();
    expect(openRun({ run: null })).toBeNull();
    expect(runSchema.safeParse({ ...moved, ended: "abandoned" }).success).toBe(false);
  });

  it("takes questions on a move, a comment and a start, and refuses an empty one", () => {
    expect(moveRequestSchema.parse({ to: "done", questions: [" Tabs too? "] }).questions).toEqual(["Tabs too?"]);
    expect(commentRequestSchema.safeParse({ body: "note", questions: [""] }).success).toBe(false);
    expect(startRequestSchema.parse({}).questions).toBeUndefined();
    expect(questionParamsSchema.parse({ key: "p-1", number: "2" })).toEqual({ key: "p-01", number: 2 });
    expect(questionParamsSchema.safeParse({ key: "p-01", number: "0" }).success).toBe(false);
  });

  it("defaults the board to 14 days of Done", () => {
    expect(boardQuerySchema.parse({})).toEqual({ doneDays: 14 });
    expect(boardQuerySchema.parse({ doneDays: "30", tag: "ui" })).toEqual({ doneDays: 30, tag: "ui" });
  });

  it("defaults a ticket's tags to none", () => {
    expect(upsertTicketRequestSchema.parse({ title: "T", summary: "", briefPath: "corpus/briefs/todo/01-t.md" }).tags).toEqual([]);
  });

  it("rejects a move to a status that does not exist", () => {
    expect(moveRequestSchema.safeParse({ to: "closed" }).success).toBe(false);
  });

  it("takes a brief's state as todo, blocked, done or superseded only", () => {
    const brief = { number: 1, title: "T", summary: "", briefPath: "corpus/briefs/todo/01-t.md" };
    expect(syncRequestSchema.safeParse({ projects: [{ project: "p", briefs: [{ ...brief, state: "done" }] }] }).success).toBe(true);
    expect(syncRequestSchema.safeParse({ projects: [{ project: "p", briefs: [{ ...brief, state: "archived" }] }] }).success).toBe(false);
  });

  it("takes a project's open todos, or none from an older CLI, and a todo ticket with no number", () => {
    const todo = { slug: "linux-apps-sound", title: "Sound", summary: "", path: "corpus/todos/linux-apps-sound.md" };
    expect(syncRequestSchema.parse({ projects: [{ project: "p", briefs: [] }] }).projects[0]!.todos).toBeUndefined();
    expect(syncRequestSchema.safeParse({ projects: [{ project: "p", briefs: [], todos: [todo] }] }).success).toBe(true);
    expect(syncRequestSchema.safeParse({ projects: [{ project: "p", briefs: [], todos: [{ ...todo, slug: "a:b" }] }] }).success).toBe(false);
    const ticket = ticketSchema.parse({
      key: "p:linux-apps-sound",
      project: "p",
      number: null,
      title: "Sound",
      summary: "",
      summarySource: "sync",
      briefPath: "corpus/todos/linux-apps-sound.md",
      tags: [],
      status: "backlog",
      hidden: false,
      createdAt: now,
      updatedAt: now,
      statusChangedAt: now,
      run: null,
      openQuestions: 0,
      blockedBy: null,
    });
    expect(ticket.number).toBeNull();
  });

  it("takes a blocked brief with its condition, and a payload from a CLI from before blocked/", () => {
    const brief = { number: 14, title: "T", summary: "", briefPath: "corpus/briefs/blocked/14-t.md", state: "blocked" };
    const blocked = syncRequestSchema.parse({ projects: [{ project: "p", briefs: [{ ...brief, blockedBy: "a stronger machine" }] }] });
    expect(blocked.projects[0]!.briefs[0]!.blockedBy).toBe("a stronger machine");
    const todo = { slug: "sonarqube", title: "SonarQube", summary: "", path: "corpus/todos/blocked/sonarqube.md", blockedBy: "a stronger machine" };
    expect(syncRequestSchema.safeParse({ projects: [{ project: "p", briefs: [], todos: [todo, { ...todo, slug: "x", blockedBy: null }] }] }).success).toBe(true);
    const older = syncRequestSchema.parse({ projects: [{ project: "p", briefs: [{ ...brief, state: "todo" }], todos: [{ ...todo, blockedBy: undefined }] }] });
    expect(older.projects[0]!.briefs[0]!.blockedBy).toBeUndefined();
    expect(older.projects[0]!.todos![0]!.blockedBy).toBeUndefined();
  });
});
