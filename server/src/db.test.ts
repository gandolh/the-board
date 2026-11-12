import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { MIGRATIONS, openDatabase } from "./db.js";

describe("the migrations", () => {
  it("upgrade a board from before Backlog with every ticket, tag, comment and history row kept, and add runs, holds and questions", () => {
    const dir = mkdtempSync(join(tmpdir(), "brief-board-db-"));
    const path = join(dir, "board.db");
    try {
      // The board as it stood before 2026-11-03: the first migration only.
      const old = new Database(path);
      old.exec(MIGRATIONS[0]!);
      old.pragma("user_version = 1");
      const at = "2026-11-02T10:00:00.000Z";
      old
        .prepare(
          `INSERT INTO tickets (key, project, number, title, summary, summary_source, brief_path, status, hidden, created_at, updated_at, status_changed_at)
           VALUES ('p-01', 'p', 1, 'A brief', '', 'sync', 'corpus/briefs/todo/01-a.md', 'in_progress', 0, ?, ?, ?)`,
        )
        .run(at, at, at);
      old.prepare("INSERT INTO ticket_tags (ticket_key, tag) VALUES ('p-01', 'ui')").run();
      old
        .prepare("INSERT INTO comments (ticket_key, author, body, created_at) VALUES ('p-01', 'agent', 'note', ?)")
        .run(at);
      old
        .prepare(
          "INSERT INTO history (ticket_key, from_status, to_status, author, via, at) VALUES ('p-01', NULL, 'todo', 'sync', 'sync', ?)",
        )
        .run(at);
      old.close();

      const db = openDatabase(path);
      expect(db.pragma("user_version", { simple: true })).toBe(MIGRATIONS.length);
      expect(db.pragma("foreign_keys", { simple: true })).toBe(1);
      expect(db.prepare("SELECT key, status FROM tickets").all()).toEqual([{ key: "p-01", status: "in_progress" }]);
      for (const table of ["ticket_tags", "comments", "history"]) {
        expect(db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()).toEqual({ n: 1 });
      }

      // A todo's ticket fits now, with no number, always in Backlog; a blocked
      // brief's ticket, with its number, may wait there too.
      const insert = db.prepare(
        `INSERT INTO tickets (key, project, number, title, summary, summary_source, brief_path, status, hidden, created_at, updated_at, status_changed_at)
         VALUES (?, 'p', ?, 'T', '', 'sync', 'corpus/todos/a.md', ?, 0, ?, ?, ?)`,
      );
      insert.run("p:a", null, "backlog", at, at, at);
      expect(() => insert.run("p:b", null, "todo", at, at, at)).toThrow(/CHECK/);
      insert.run("p-02", 2, "backlog", at, at, at);
      expect(db.prepare("SELECT blocked_by FROM tickets WHERE key = 'p-01'").get()).toEqual({ blocked_by: null });
      // A ticket holds at most one open run, and any number of ended ones.
      const run = db.prepare(
        "INSERT INTO runs (ticket_key, author, started_at, last_heard_at, ended_at, ended) VALUES ('p-01', 'agent', ?, ?, ?, ?)",
      );
      run.run(at, at, at, "moved");
      const open = Number(run.run(at, at, null, null).lastInsertRowid);
      expect(() => run.run(at, at, null, null)).toThrow(/UNIQUE/);
      expect(() => run.run(at, at, at, null)).toThrow(/CHECK/);
      // A run holds each kind and value once, of the four kinds only.
      const hold = db.prepare("INSERT INTO holds (run_id, kind, value, held_at) VALUES (?, ?, ?, ?)");
      hold.run(open, "port", "5173", at);
      hold.run(open, "container", "5173", at);
      expect(() => hold.run(open, "port", "5173", at)).toThrow(/UNIQUE/);
      expect(() => hold.run(open, "socket", "x", at)).toThrow(/CHECK/);
      // And the children still cascade from the rebuilt table.
      db.prepare("DELETE FROM tickets WHERE key = 'p-01'").run();
      expect(db.prepare("SELECT COUNT(*) AS n FROM comments").get()).toEqual({ n: 0 });
      expect(db.prepare("SELECT COUNT(*) AS n FROM runs").get()).toEqual({ n: 0 });
      expect(db.prepare("SELECT COUNT(*) AS n FROM holds").get()).toEqual({ n: 0 });
      // Questions are numbered once per ticket, and an answer comes with its time.
      db.prepare(
        `INSERT INTO tickets (key, project, number, title, summary, summary_source, brief_path, status, hidden, created_at, updated_at, status_changed_at)
         VALUES ('p-03', 'p', 3, 'T', '', 'sync', 'corpus/briefs/todo/03-t.md', 'todo', 0, ?, ?, ?)`,
      ).run(at, at, at);
      const ask = db.prepare(
        "INSERT INTO questions (ticket_key, number, text, author, asked_at, answer, answered_at) VALUES ('p-03', ?, 'Q?', 'agent', ?, ?, ?)",
      );
      ask.run(1, at, null, null);
      expect(() => ask.run(1, at, null, null)).toThrow(/UNIQUE/);
      expect(() => ask.run(2, at, "yes", null)).toThrow(/CHECK/);
      db.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("add blocked_by to a board from before blocked/, keeping its runs, holds, questions and tags", () => {
    const dir = mkdtempSync(join(tmpdir(), "brief-board-db-"));
    const path = join(dir, "board.db");
    try {
      // The board as it stood on 2026-11-06: every migration before blocked/.
      const before = 5;
      const old = new Database(path);
      for (const migration of MIGRATIONS.slice(0, before)) old.exec(migration);
      old.pragma(`user_version = ${before}`);
      const at = "2026-11-06T10:00:00.000Z";
      old
        .prepare(
          `INSERT INTO tickets (key, project, number, title, summary, summary_source, brief_path, status, hidden, created_at, updated_at, status_changed_at)
           VALUES ('p-04', 'p', 4, 'A brief', '', 'sync', 'corpus/briefs/todo/04-a.md', 'in_progress', 0, ?, ?, ?)`,
        )
        .run(at, at, at);
      old.prepare("INSERT INTO ticket_tags (ticket_key, tag) VALUES ('p-04', 'ui')").run();
      const runId = Number(
        old
          .prepare("INSERT INTO runs (ticket_key, author, started_at, last_heard_at) VALUES ('p-04', 'agent', ?, ?)")
          .run(at, at).lastInsertRowid,
      );
      old.prepare("INSERT INTO holds (run_id, kind, value, held_at) VALUES (?, 'port', '5173', ?)").run(runId, at);
      old
        .prepare(
          "INSERT INTO questions (ticket_key, number, text, author, asked_at) VALUES ('p-04', 1, 'Q?', 'agent', ?)",
        )
        .run(at);
      old.close();

      const db = openDatabase(path);
      expect(db.pragma("user_version", { simple: true })).toBe(MIGRATIONS.length);
      expect(db.prepare("SELECT key, status, blocked_by FROM tickets").all()).toEqual([
        { key: "p-04", status: "in_progress", blocked_by: null },
      ]);
      for (const table of ["ticket_tags", "runs", "holds", "questions"]) {
        expect(db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()).toEqual({ n: 1 });
      }
      db.prepare("DELETE FROM tickets WHERE key = 'p-04'").run();
      for (const table of ["ticket_tags", "runs", "holds", "questions"]) {
        expect(db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()).toEqual({ n: 0 });
      }
      db.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("the sprints migration", () => {
  /** Today's date in UTC, as SQLite's date('now') gives it. */
  const utcToday = () => new Date().toISOString().slice(0, 10);
  const CHILD_TABLES = ["ticket_tags", "comments", "history", "runs", "holds", "questions"] as const;

  /** Every row of every child table, in a stable order, to compare before and after. */
  const children = (db: Database.Database) =>
    Object.fromEntries(CHILD_TABLES.map((table) => [table, db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()]));

  /**
   * A board at version 6 shaped like the owner's: a ticket in each of the
   * seven statuses, a blocked brief's and a todo's in Backlog, a Done one with
   * tags, comments, history, an ended run that left holds and an answered
   * question, an In Progress one with an open run, a hold and an open
   * question, and a hidden Done ticket (a superseded brief).
   */
  function versionSix(path: string): void {
    const old = new Database(path);
    for (const migration of MIGRATIONS.slice(0, 6)) old.exec(migration);
    old.pragma("user_version = 6");
    const at = "2026-11-09T10:00:00.000Z";
    const ticket = old.prepare(
      `INSERT INTO tickets (key, project, number, title, summary, summary_source, brief_path, status, hidden, created_at, updated_at, status_changed_at, blocked_by)
       VALUES (@key, @project, @number, @title, '', 'sync', @path, @status, @hidden, @at, @at, @at, @blockedBy)`,
    );
    const rows: {
      key: string;
      project: string;
      number: number | null;
      status: string;
      hidden?: number;
      blockedBy?: string;
    }[] = [
      { key: "p:night-mode", project: "p", number: null, status: "backlog" },
      { key: "p-01", project: "p", number: 1, status: "backlog", blockedBy: "a stronger machine" },
      { key: "p-02", project: "p", number: 2, status: "todo" },
      { key: "p-03", project: "p", number: 3, status: "in_progress" },
      { key: "p-04", project: "p", number: 4, status: "blocked" },
      { key: "p-05", project: "p", number: 5, status: "ready_for_test" },
      { key: "p-06", project: "p", number: 6, status: "ready_for_deploy" },
      { key: "p-07", project: "p", number: 7, status: "done" },
      { key: "p-08", project: "p", number: 8, status: "done", hidden: 1 },
      { key: "q-01", project: "q", number: 1, status: "done" },
    ];
    for (const row of rows) {
      ticket.run({
        title: `Ticket ${row.key}`,
        path: row.number === null ? "corpus/todos/night-mode.md" : `corpus/briefs/todo/${row.number}-x.md`,
        hidden: 0,
        blockedBy: null,
        at,
        ...row,
      });
    }
    old.prepare("INSERT INTO ticket_tags (ticket_key, tag) VALUES ('p-07', 'ui'), ('p-03', 'api')").run();
    const comment = old.prepare(
      "INSERT INTO comments (ticket_key, author, body, role, move_from, move_to, created_at) VALUES (?, 'ana', ?, ?, ?, ?, ?)",
    );
    comment.run("p-07", "Shipped.", "conclusion", "in_progress", "done", at);
    comment.run("p-07", "A note after.", null, null, null, at);
    comment.run("p-04", "The owner picks.", "block_reason", "in_progress", "blocked", at);
    const history = old.prepare(
      "INSERT INTO history (ticket_key, from_status, to_status, author, via, at) VALUES (?, ?, ?, ?, ?, ?)",
    );
    history.run("p-07", null, "todo", "sync", "sync", at);
    history.run("p-07", "todo", "in_progress", "ana", "move", at);
    history.run("p-07", "in_progress", "done", "ana", "move", at);
    history.run("p-03", null, "todo", "sync", "sync", at);
    const run = old.prepare(
      "INSERT INTO runs (ticket_key, author, started_at, last_heard_at, ended_at, ended, ended_status) VALUES (?, 'ana', ?, ?, ?, ?, ?)",
    );
    const ended = Number(run.run("p-07", at, at, at, "moved", "done").lastInsertRowid);
    const open = Number(run.run("p-03", at, at, null, null, null).lastInsertRowid);
    const hold = old.prepare("INSERT INTO holds (run_id, kind, value, held_at) VALUES (?, ?, ?, ?)");
    hold.run(ended, "port", "5173", at);
    hold.run(open, "container", "vite-dev", at);
    const question = old.prepare(
      "INSERT INTO questions (ticket_key, number, text, author, asked_at, answer, answered_by, answered_at) VALUES (?, ?, ?, 'ana', ?, ?, ?, ?)",
    );
    question.run("p-07", 1, "Blue or green?", at, "Blue", "owner", at);
    question.run("p-03", 1, "Today?", at, null, null, null);
    old.close();
  }

  it("files every Done ticket in Sprint 1, closed, and the rest in Sprint 2, active, both dated the day it runs, with every child row kept", () => {
    const dir = mkdtempSync(join(tmpdir(), "brief-board-db-"));
    const path = join(dir, "board.db");
    try {
      versionSix(path);
      const raw = new Database(path);
      const before = children(raw);
      const ticketsBefore = raw.prepare("SELECT * FROM tickets ORDER BY key").all();
      raw.close();

      const dayBefore = utcToday();
      const db = openDatabase(path);
      const day = db.prepare("SELECT started_on FROM sprints WHERE number = 1").pluck().get() as string;
      expect([dayBefore, utcToday()]).toContain(day);

      expect(db.pragma("user_version", { simple: true })).toBe(MIGRATIONS.length);
      expect(db.pragma("foreign_keys", { simple: true })).toBe(1);
      expect(db.pragma("foreign_key_check")).toEqual([]);
      expect(db.prepare("SELECT number, started_on, ended_on FROM sprints ORDER BY number").all()).toEqual([
        { number: 1, started_on: day, ended_on: day },
        { number: 2, started_on: day, ended_on: null },
      ]);
      const inSprint = (number: number) =>
        db.prepare("SELECT key FROM tickets WHERE sprint = ? ORDER BY key").pluck().all(number);
      expect(inSprint(1)).toEqual(["p-07", "p-08", "q-01"]);
      expect(inSprint(2)).toEqual(["p-01", "p-02", "p-03", "p-04", "p-05", "p-06", "p:night-mode"]);
      // Every column but the new one is as it was, and every child row too.
      const ticketsAfter = db.prepare("SELECT * FROM tickets ORDER BY key").all() as Record<string, unknown>[];
      expect(ticketsAfter.map(({ sprint: _sprint, ...rest }) => rest)).toEqual(ticketsBefore);
      expect(children(db)).toEqual(before);
      expect(before.runs).toHaveLength(2);
      expect(before.holds).toHaveLength(2);
      expect(before.questions).toHaveLength(2);

      // One sprint is active at most, a closed one cannot end before it started, and a ticket's sprint exists.
      expect(() => db.prepare("INSERT INTO sprints (number, started_on) VALUES (3, ?)").run(day)).toThrow(/UNIQUE/);
      expect(() =>
        db.prepare("INSERT INTO sprints (number, started_on, ended_on) VALUES (3, '2026-11-10', '2026-11-09')").run(),
      ).toThrow(/CHECK/);
      expect(() => db.prepare("UPDATE tickets SET sprint = 9 WHERE key = 'p-02'").run()).toThrow(/FOREIGN KEY/);
      db.close();

      // A second open is a no-op: same version, same sprints, same rows.
      const snapshot = (handle: Database.Database) => ({
        sprints: handle.prepare("SELECT * FROM sprints ORDER BY number").all(),
        tickets: handle.prepare("SELECT * FROM tickets ORDER BY key").all(),
        ...children(handle),
      });
      const first = new Database(path);
      const once = snapshot(first);
      first.close();
      const again = openDatabase(path);
      expect(again.pragma("user_version", { simple: true })).toBe(MIGRATIONS.length);
      expect(snapshot(again)).toEqual(once);
      again.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("gives a fresh board a closed, empty Sprint 1 and an active Sprint 2", () => {
    const dayBefore = utcToday();
    const db = openDatabase(":memory:");
    expect(db.pragma("user_version", { simple: true })).toBe(MIGRATIONS.length);
    const sprints = db.prepare("SELECT number, started_on, ended_on FROM sprints ORDER BY number").all() as {
      number: number;
      started_on: string;
      ended_on: string | null;
    }[];
    const day = sprints[0]!.started_on;
    expect([dayBefore, utcToday()]).toContain(day);
    expect(sprints).toEqual([
      { number: 1, started_on: day, ended_on: day },
      { number: 2, started_on: day, ended_on: null },
    ]);
    expect(db.prepare("SELECT COUNT(*) FROM tickets").pluck().get()).toBe(0);
    db.close();
  });
});

describe("the tag events migration", () => {
  it("adds an empty tag_events table to a board at version 7, keeps every row, and cascades a ticket's delete", () => {
    const dir = mkdtempSync(join(tmpdir(), "brief-board-db-"));
    const path = join(dir, "board.db");
    try {
      const old = new Database(path);
      for (const migration of MIGRATIONS.slice(0, 7)) old.exec(migration);
      old.pragma("user_version = 7");
      const at = "2026-11-12T10:00:00.000Z";
      old
        .prepare(
          `INSERT INTO tickets (key, project, number, title, summary, summary_source, brief_path, status, hidden, created_at, updated_at, status_changed_at)
           VALUES ('p-01', 'p', 1, 'T', '', 'sync', 'corpus/briefs/todo/01-x.md', 'todo', 0, ?, ?, ?)`,
        )
        .run(at, at, at);
      old.prepare("INSERT INTO ticket_tags (ticket_key, tag) VALUES ('p-01', 'ui')").run();
      const before = old.prepare("SELECT * FROM tickets").all();
      old.close();

      const db = openDatabase(path);
      expect(db.pragma("user_version", { simple: true })).toBe(8);
      expect(db.prepare("SELECT * FROM tickets").all()).toEqual(before);
      expect(db.prepare("SELECT tag FROM ticket_tags").pluck().all()).toEqual(["ui"]);
      expect(db.prepare("SELECT COUNT(*) FROM tag_events").pluck().get()).toBe(0);
      const event = db.prepare(
        "INSERT INTO tag_events (ticket_key, tag, change, author, at) VALUES ('p-01', 'ui', ?, 'ana', ?)",
      );
      event.run("added", at);
      expect(() => event.run("renamed", at)).toThrow(/CHECK/);
      db.prepare("DELETE FROM tickets WHERE key = 'p-01'").run();
      expect(db.prepare("SELECT COUNT(*) FROM tag_events").pluck().get()).toBe(0);
      db.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
