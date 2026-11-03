import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { MIGRATIONS, openDatabase } from "./db.js";

describe("the Backlog migration", () => {
  it("upgrades a board from before it with every ticket, tag, comment and history row kept", () => {
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

      // A todo's ticket fits now, with no number, in Backlog and only there.
      const insert = db.prepare(
        `INSERT INTO tickets (key, project, number, title, summary, summary_source, brief_path, status, hidden, created_at, updated_at, status_changed_at)
         VALUES (?, 'p', ?, 'T', '', 'sync', 'corpus/todos/a.md', ?, 0, ?, ?, ?)`,
      );
      insert.run("p:a", null, "backlog", at, at, at);
      expect(() => insert.run("p:b", null, "todo", at, at, at)).toThrow(/CHECK/);
      expect(() => insert.run("p-02", 2, "backlog", at, at, at)).toThrow(/CHECK/);
      // And the children still cascade from the rebuilt table.
      db.prepare("DELETE FROM tickets WHERE key = 'p-01'").run();
      expect(db.prepare("SELECT COUNT(*) AS n FROM comments").get()).toEqual({ n: 0 });
      db.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
