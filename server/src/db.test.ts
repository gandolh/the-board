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
      old.prepare("INSERT INTO comments (ticket_key, author, body, created_at) VALUES ('p-01', 'agent', 'note', ?)").run(at);
      old.prepare("INSERT INTO history (ticket_key, from_status, to_status, author, via, at) VALUES ('p-01', NULL, 'todo', 'sync', 'sync', ?)").run(at);
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
      const run = db.prepare("INSERT INTO runs (ticket_key, author, started_at, last_heard_at, ended_at, ended) VALUES ('p-01', 'agent', ?, ?, ?, ?)");
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
      const ask = db.prepare("INSERT INTO questions (ticket_key, number, text, author, asked_at, answer, answered_at) VALUES ('p-03', ?, 'Q?', 'agent', ?, ?, ?)");
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
      const before = MIGRATIONS.length - 1;
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
      const runId = Number(old.prepare("INSERT INTO runs (ticket_key, author, started_at, last_heard_at) VALUES ('p-04', 'agent', ?, ?)").run(at, at).lastInsertRowid);
      old.prepare("INSERT INTO holds (run_id, kind, value, held_at) VALUES (?, 'port', '5173', ?)").run(runId, at);
      old.prepare("INSERT INTO questions (ticket_key, number, text, author, asked_at) VALUES ('p-04', 1, 'Q?', 'agent', ?)").run(at);
      old.close();

      const db = openDatabase(path);
      expect(db.pragma("user_version", { simple: true })).toBe(MIGRATIONS.length);
      expect(db.prepare("SELECT key, status, blocked_by FROM tickets").all()).toEqual([{ key: "p-04", status: "in_progress", blocked_by: null }]);
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
