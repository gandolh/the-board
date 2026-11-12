import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";

/**
 * The board's SQLite file. Tickets, their labels, comments, history, runs,
 * what each run holds, and questions. The schema is versioned with
 * `PRAGMA user_version`: each migration runs once, in order, inside a
 * transaction, and bumps the version.
 *
 * A ticket's key is its primary key, in canonical form (`atrium-03`), and
 * `(project, number)` is unique too: one ticket per brief. A todo's ticket
 * (`atrium:night-mode`) has no number and always sits in Backlog; since
 * 2026-11-07 a brief's ticket sits there too while its brief is in
 * `blocked/`, with `blocked_by` holding what it waits on. Since 2026-11-10
 * every ticket sits in one sprint (`tickets.sprint`, `sprints`). Since
 * 2026-11-12 a tag added or taken off later is a row in `tag_events`.
 */
export type Db = Database.Database;

export const MIGRATIONS: string[] = [
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
  // 2026-11-03: Backlog, and todo tickets with no number. SQLite cannot change
  // a CHECK in place, so the table is rebuilt: copy, drop, rename.
  `
  CREATE TABLE tickets_new (
    key TEXT PRIMARY KEY,
    project TEXT NOT NULL,
    number INTEGER,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    summary_source TEXT NOT NULL CHECK (summary_source IN ('agent', 'sync')),
    brief_path TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('backlog', 'todo', 'in_progress', 'blocked', 'ready_for_test', 'ready_for_deploy', 'done')),
    hidden INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    status_changed_at TEXT NOT NULL,
    UNIQUE (project, number),
    CHECK ((number IS NULL) = (status = 'backlog'))
  );
  INSERT INTO tickets_new (key, project, number, title, summary, summary_source, brief_path, status, hidden, created_at, updated_at, status_changed_at)
    SELECT key, project, number, title, summary, summary_source, brief_path, status, hidden, created_at, updated_at, status_changed_at FROM tickets;
  DROP TABLE tickets;
  ALTER TABLE tickets_new RENAME TO tickets;
  `,
  // 2026-11-06: runs. One agent session working one ticket, at most one open
  // per ticket. Whether a run is stale is worked out on read, never stored.
  `
  CREATE TABLE runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_key TEXT NOT NULL REFERENCES tickets(key) ON DELETE CASCADE,
    author TEXT NOT NULL,
    message TEXT,
    started_at TEXT NOT NULL,
    last_heard_at TEXT NOT NULL,
    ended_at TEXT,
    ended TEXT CHECK (ended IN ('moved', 'released', 'stale')),
    ended_status TEXT,
    CHECK ((ended_at IS NULL) = (ended IS NULL))
  );
  CREATE UNIQUE INDEX runs_one_open ON runs (ticket_key) WHERE ended_at IS NULL;
  CREATE INDEX runs_by_ticket ON runs (ticket_key, id);
  `,
  // 2026-11-06: questions for the owner, numbered per ticket, open until answered.
  `
  CREATE TABLE questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_key TEXT NOT NULL REFERENCES tickets(key) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    text TEXT NOT NULL,
    author TEXT NOT NULL,
    asked_at TEXT NOT NULL,
    answer TEXT,
    answered_by TEXT,
    answered_at TEXT,
    UNIQUE (ticket_key, number),
    CHECK ((answered_at IS NULL) = (answer IS NULL))
  );
  CREATE INDEX questions_open ON questions (answered_at, asked_at);
  `,
  // 2026-11-06: holds. What a run declares it started (a port, a pid, a
  // container, a path), free text, checked against nothing. A drop deletes
  // the row; what is left when the run ends stays on it as its leftovers.
  `
  CREATE TABLE holds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('port', 'pid', 'container', 'path')),
    value TEXT NOT NULL,
    held_at TEXT NOT NULL,
    UNIQUE (run_id, kind, value)
  );
  CREATE INDEX holds_by_value ON holds (kind, value);
  `,
  // 2026-11-07: a brief or todo in a blocked/ folder. Its ticket waits in
  // Backlog with the condition in blocked_by, so a ticket with a number may
  // now sit in Backlog too; one without a number still always does. The CHECK
  // changes, so the table is rebuilt as in the second migration.
  `
  CREATE TABLE tickets_new (
    key TEXT PRIMARY KEY,
    project TEXT NOT NULL,
    number INTEGER,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    summary_source TEXT NOT NULL CHECK (summary_source IN ('agent', 'sync')),
    brief_path TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('backlog', 'todo', 'in_progress', 'blocked', 'ready_for_test', 'ready_for_deploy', 'done')),
    hidden INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    status_changed_at TEXT NOT NULL,
    blocked_by TEXT,
    UNIQUE (project, number),
    CHECK (number IS NOT NULL OR status = 'backlog')
  );
  INSERT INTO tickets_new (key, project, number, title, summary, summary_source, brief_path, status, hidden, created_at, updated_at, status_changed_at, blocked_by)
    SELECT key, project, number, title, summary, summary_source, brief_path, status, hidden, created_at, updated_at, status_changed_at, NULL FROM tickets;
  DROP TABLE tickets;
  ALTER TABLE tickets_new RENAME TO tickets;
  `,
  // 2026-11-10: sprints. Every ticket belongs to one; exactly one sprint is
  // active (no end date), the rest are closed. Sprint 1 closes on the day this
  // runs with every ticket that is Done then, and Sprint 2 starts that day with
  // the rest; on a fresh board Sprint 1 is closed and empty, so the numbers
  // match everywhere. The unique index is on a constant for the active row,
  // since SQLite counts NULLs as distinct in a unique index. ADD COLUMN needs a
  // default for NOT NULL and, with foreign keys on, a NULL one for REFERENCES;
  // the keys are off while migrations run and checked before this commits.
  `
  CREATE TABLE sprints (
    number INTEGER PRIMARY KEY,
    started_on TEXT NOT NULL,
    ended_on TEXT,
    CHECK (ended_on IS NULL OR ended_on >= started_on)
  );
  CREATE UNIQUE INDEX sprints_one_active ON sprints ((ended_on IS NULL)) WHERE ended_on IS NULL;
  ALTER TABLE tickets ADD COLUMN sprint INTEGER NOT NULL DEFAULT 2 REFERENCES sprints(number);
  INSERT INTO sprints (number, started_on, ended_on) VALUES (1, date('now'), date('now')), (2, date('now'), NULL);
  UPDATE tickets SET sprint = 1 WHERE status = 'done';
  `,
  // 2026-11-12: tag changes. A tag added to a ticket or taken off it after it
  // was filed, by whom and when. History stays status changes only.
  `
  CREATE TABLE tag_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_key TEXT NOT NULL REFERENCES tickets(key) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    change TEXT NOT NULL CHECK (change IN ('added', 'removed')),
    author TEXT NOT NULL,
    at TEXT NOT NULL
  );
  CREATE INDEX tag_events_by_ticket ON tag_events (ticket_key, id);
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

/**
 * Foreign keys are off while migrations run, as SQLite's own recipe for
 * rebuilding a table says: with them on, dropping the old `tickets` would
 * cascade into every tag, comment and history row. The pragma is a no-op
 * inside a transaction, so it wraps the run, and each migration checks the
 * keys before it commits.
 */
function migrate(db: Db): void {
  const current = db.pragma("user_version", { simple: true }) as number;
  if (current >= MIGRATIONS.length) return;
  db.pragma("foreign_keys = OFF");
  try {
    for (const [offset, migration] of MIGRATIONS.slice(current).entries()) {
      const version = current + offset;
      db.transaction(() => {
        db.exec(migration);
        const broken = db.pragma("foreign_key_check") as unknown[];
        if (broken.length > 0) throw new Error(`migration ${version + 1} left ${broken.length} broken foreign key(s)`);
        db.pragma(`user_version = ${version + 1}`);
      })();
    }
  } finally {
    db.pragma("foreign_keys = ON");
  }
}
