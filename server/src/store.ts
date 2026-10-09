import {
  checkMove,
  type Comment,
  type HistoryEvent,
  type Lane,
  type MessageRole,
  type MoveCheck,
  type Status,
  type SummarySource,
  type Ticket,
} from "@brief-board/shared";
import type { Db } from "./db.js";

/**
 * Reads and writes for tickets, comments and history (brief 03). Every write
 * that touches more than one row runs in a transaction. Only `sync.ts` changes
 * a status without the move table.
 */

interface TicketRow {
  key: string;
  project: string;
  number: number;
  title: string;
  summary: string;
  summary_source: SummarySource;
  brief_path: string;
  status: Status;
  hidden: number;
  created_at: string;
  updated_at: string;
  status_changed_at: string;
}

interface CommentRow {
  id: number;
  author: string;
  body: string;
  role: MessageRole | null;
  move_from: Status | null;
  move_to: Status | null;
  created_at: string;
}

interface HistoryRow {
  from_status: Status | null;
  to_status: Status;
  author: string;
  via: "move" | "sync";
  at: string;
}

export class Store {
  constructor(
    readonly db: Db,
    /** The clock, so tests can age a ticket past `doneDays`. */
    private readonly clock: () => Date = () => new Date(),
  ) {}

  now(): string {
    return this.clock().toISOString();
  }

  private tags(key: string): string[] {
    return (this.db.prepare("SELECT tag FROM ticket_tags WHERE ticket_key = ? ORDER BY tag").all(key) as { tag: string }[]).map(
      (row) => row.tag,
    );
  }

  private toTicket(row: TicketRow): Ticket {
    return {
      key: row.key,
      project: row.project,
      number: row.number,
      title: row.title,
      summary: row.summary,
      summarySource: row.summary_source,
      briefPath: row.brief_path,
      tags: this.tags(row.key),
      status: row.status,
      hidden: row.hidden === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      statusChangedAt: row.status_changed_at,
    };
  }

  getTicket(key: string): Ticket | null {
    const row = this.db.prepare("SELECT * FROM tickets WHERE key = ?").get(key) as TicketRow | undefined;
    return row ? this.toTicket(row) : null;
  }

  projectTickets(project: string): Ticket[] {
    return (this.db.prepare("SELECT * FROM tickets WHERE project = ? ORDER BY number").all(project) as TicketRow[]).map((row) =>
      this.toTicket(row),
    );
  }

  /** Replace a ticket's labels. The project is its project tag, never a label. */
  setTags(key: string, project: string, tags: readonly string[]): void {
    const labels = [...new Set(tags.map((tag) => tag.trim()).filter((tag) => tag && tag !== project))];
    this.db.prepare("DELETE FROM ticket_tags WHERE ticket_key = ?").run(key);
    const insert = this.db.prepare("INSERT INTO ticket_tags (ticket_key, tag) VALUES (?, ?)");
    for (const tag of labels) insert.run(key, tag);
  }

  insertTicket(fields: {
    key: string;
    project: string;
    number: number;
    title: string;
    summary: string;
    summarySource: SummarySource;
    briefPath: string;
    author: string;
    via: "move" | "sync";
  }): void {
    const at = this.now();
    this.db
      .prepare(
        `INSERT INTO tickets (key, project, number, title, summary, summary_source, brief_path, status, hidden, created_at, updated_at, status_changed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'todo', 0, ?, ?, ?)`,
      )
      .run(fields.key, fields.project, fields.number, fields.title, fields.summary, fields.summarySource, fields.briefPath, at, at, at);
    this.addHistory(fields.key, null, "todo", fields.author, fields.via);
  }

  /** Update the fields given; bumps `updated_at`. */
  updateTicket(
    key: string,
    fields: Partial<{ title: string; summary: string; summarySource: SummarySource; briefPath: string; hidden: boolean }>,
  ): void {
    const columns: [string, string | number | undefined][] = [
      ["title", fields.title],
      ["summary", fields.summary],
      ["summary_source", fields.summarySource],
      ["brief_path", fields.briefPath],
      ["hidden", fields.hidden === undefined ? undefined : fields.hidden ? 1 : 0],
      ["updated_at", this.now()],
    ];
    const set = columns.filter(([, value]) => value !== undefined);
    this.db
      .prepare(`UPDATE tickets SET ${set.map(([column]) => `${column} = ?`).join(", ")} WHERE key = ?`)
      .run(...set.map(([, value]) => value), key);
  }

  /** Change the status and record it. The caller has already decided it is allowed. */
  setStatus(key: string, from: Status, to: Status, author: string, via: "move" | "sync"): void {
    const at = this.now();
    this.db.prepare("UPDATE tickets SET status = ?, status_changed_at = ?, updated_at = ? WHERE key = ?").run(to, at, at, key);
    this.addHistory(key, from, to, author, via);
  }

  private addHistory(key: string, from: Status | null, to: Status, author: string, via: "move" | "sync"): void {
    this.db
      .prepare("INSERT INTO history (ticket_key, from_status, to_status, author, via, at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(key, from, to, author, via, this.now());
  }

  addComment(
    key: string,
    fields: { author: string; body: string; role: MessageRole | null; move: { from: Status; to: Status } | null },
  ): Comment {
    const createdAt = this.now();
    const result = this.db
      .prepare("INSERT INTO comments (ticket_key, author, body, role, move_from, move_to, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(key, fields.author, fields.body, fields.role, fields.move?.from ?? null, fields.move?.to ?? null, createdAt);
    return { id: Number(result.lastInsertRowid), ...fields, createdAt };
  }

  comments(key: string): Comment[] {
    return (this.db.prepare("SELECT * FROM comments WHERE ticket_key = ? ORDER BY id").all(key) as CommentRow[]).map((row) => ({
      id: row.id,
      author: row.author,
      body: row.body,
      role: row.role,
      move: row.move_from && row.move_to ? { from: row.move_from, to: row.move_to } : null,
      createdAt: row.created_at,
    }));
  }

  history(key: string): HistoryEvent[] {
    return (this.db.prepare("SELECT * FROM history WHERE ticket_key = ? ORDER BY id").all(key) as HistoryRow[]).map((row) => ({
      from: row.from_status,
      to: row.to_status,
      author: row.author,
      via: row.via,
      at: row.at,
    }));
  }

  /**
   * A move through the table: check it, change the status, record the
   * history, and keep the message as a comment with the row's role.
   */
  move(
    key: string,
    to: Status,
    message: string | undefined,
    author: string,
  ): { ok: true; ticket: Ticket; comment: Comment | null } | { ok: false; check: Extract<MoveCheck, { ok: false }> } | null {
    return this.db.transaction(() => {
      const ticket = this.getTicket(key);
      if (!ticket) return null;
      const check = checkMove(ticket.status, to, message);
      if (!check.ok) return { ok: false as const, check };
      this.setStatus(key, ticket.status, to, author, "move");
      const body = message?.trim();
      const comment = body
        ? this.addComment(key, { author, body, role: check.rule.role, move: { from: ticket.status, to } })
        : null;
      return { ok: true as const, ticket: this.getTicket(key)!, comment };
    })();
  }

  /**
   * The board: one lane per project with anything visible, alphabetically.
   * Hidden tickets never show; Done ones only for `doneDays` after they got
   * there. With `tag`, only tickets carrying that label.
   */
  board(doneDays: number, tag?: string): Lane[] {
    const cutoff = new Date(this.clock().getTime() - doneDays * 24 * 60 * 60 * 1000).toISOString();
    const rows = this.db
      .prepare(
        `SELECT * FROM tickets t
         WHERE t.hidden = 0
           AND (t.status <> 'done' OR t.status_changed_at >= @cutoff)
           AND (@tag IS NULL OR EXISTS (SELECT 1 FROM ticket_tags g WHERE g.ticket_key = t.key AND g.tag = @tag))
         ORDER BY t.project COLLATE NOCASE, t.project, t.number`,
      )
      .all({ cutoff, tag: tag ?? null }) as TicketRow[];
    const lanes: Lane[] = [];
    for (const row of rows) {
      const last = lanes[lanes.length - 1];
      if (last && last.project === row.project) last.tickets.push(this.toTicket(row));
      else lanes.push({ project: row.project, tickets: [this.toTicket(row)] });
    }
    return lanes;
  }
}
