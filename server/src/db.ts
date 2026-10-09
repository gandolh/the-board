import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";

/**
 * The board's SQLite file (brief 03). Tickets, their labels, comments and
 * history. The schema is versioned with `PRAGMA user_version`: each migration
 * runs once, in order, inside a transaction, and bumps the version.
 *
 * A ticket's key is its primary key, in canonical form (`atrium-03`), and
 * `(project, number)` is unique too: one ticket per brief.
 */
export type Db = Database.Database;

const MIGRATIONS: string[] = [
  `
  CREATE TABLE tickets (
    key TEXT PRIMARY KEY,
    project TEXT NOT NULL,
    number INTEGER NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    summary_source TEXT NOT NULL CHECK (summary_source IN ('agent', 'sync')),
    brief_path TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'blocked', 'ready_for_test', 'ready_for_deploy', 'done')),
    hidden INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    status_changed_at TEXT NOT NULL,
    UNIQUE (project, number)
  );
  CREATE TABLE ticket_tags (
    ticket_key TEXT NOT NULL REFERENCES tickets(key) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    PRIMARY KEY (ticket_key, tag)
  );
  CREATE TABLE comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_key TEXT NOT NULL REFERENCES tickets(key) ON DELETE CASCADE,
    author TEXT NOT NULL,
    body TEXT NOT NULL,
    role TEXT,
    move_from TEXT,
    move_to TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX comments_by_ticket ON comments (ticket_key, id);
  CREATE TABLE history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_key TEXT NOT NULL REFERENCES tickets(key) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    author TEXT NOT NULL,
    via TEXT NOT NULL CHECK (via IN ('move', 'sync')),
    at TEXT NOT NULL
  );
  CREATE INDEX history_by_ticket ON history (ticket_key, id);
  `,
];

/** Open (or create) the database at `path`, or `:memory:`, and bring its schema up to date. */
export function openDatabase(path: string): Db {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(db: Db): void {
  const current = db.pragma("user_version", { simple: true }) as number;
  for (let version = current; version < MIGRATIONS.length; version++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[version]!);
      db.pragma(`user_version = ${version + 1}`);
    })();
  }
}
