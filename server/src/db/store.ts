import {
  checkMove,
  type Comment,
  type HistoryEvent,
  type Hold,
  type HoldKind,
  type Lane,
  type MessageRole,
  type MoveCheck,
  type Need,
  type NeedKind,
  type OpenQuestionEntry,
  type OpenRunEntry,
  type Question,
  type Run,
  type RunEnding,
  type RunWithHolds,
  type Sprint,
  type Status,
  type SummarySource,
  type Ticket,
} from "@brief-board/shared";
import { DEFAULT_STALE_HOURS } from "../config.js";
import type { Db } from "../db.js";

/**
 * Reads and writes for tickets, comments, history, runs, holds and questions.
 * Every write that touches more than one row runs in a transaction. Only
 * `sync.ts` changes a status without the move table.
 *
 * A run opens with any move into In Progress and ends with any move out of
 * it; `release` and sync end it too. Whether an open run is stale is worked
 * out here on every read, from its last write and `staleMs`. A run's holds
 * belong to it: when it ends, what it still holds stays on it as leftovers,
 * and the next run starts with none.
 *
 * Every ticket sits in one sprint. The reads the board, the CLI and the owner
 * work from (the board, older Done, needs, open runs, open questions) cover
 * the active sprint only; a ticket by its key is found in any. A closed
 * sprint's tickets are frozen: every write on one throws `SprintClosedError`,
 * from one check (`writable`), which the API answers as 409 `sprint_closed`.
 */

/** The active sprint's number, as SQL: the one sprint with no end date. */
const ACTIVE_SPRINT = "(SELECT number FROM sprints WHERE ended_on IS NULL)";

/** A write on a ticket in a closed sprint, which nothing may change. */
export class SprintClosedError extends Error {
  readonly key: string;
  readonly sprint: number;
  readonly endedOn: string;

  constructor(key: string, sprint: number, endedOn: string) {
    super(
      `${key} is in sprint ${sprint}, which closed on ${endedOn}; a closed sprint's tickets are frozen and nothing writes to them`,
    );
    this.key = key;
    this.sprint = sprint;
    this.endedOn = endedOn;
  }
}

interface TicketRow {
  key: string;
  project: string;
  number: number | null;
  title: string;
  summary: string;
  summary_source: SummarySource;
  brief_path: string;
  status: Status;
  hidden: number;
  created_at: string;
  updated_at: string;
  status_changed_at: string;
  blocked_by: string | null;
  sprint: number;
}

interface SprintRow {
  number: number;
  started_on: string;
  ended_on: string | null;
  done_count: number;
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

interface RunRow {
  id: number;
  ticket_key: string;
  author: string;
  message: string | null;
  started_at: string;
  last_heard_at: string;
  ended_at: string | null;
  ended: RunEnding | null;
  ended_status: Status | null;
}

interface HoldRow {
  kind: HoldKind;
  value: string;
  held_at: string;
}

interface QuestionRow {
  ticket_key: string;
  number: number;
  text: string;
  author: string;
  asked_at: string;
  answer: string | null;
  answered_by: string | null;
  answered_at: string | null;
}

interface HistoryRow {
  from_status: Status | null;
  to_status: Status;
  author: string;
  via: "move" | "sync";
  at: string;
}

export class Store {
  readonly db: Db;
  /** The clock, so tests can age a ticket past `doneDays` or a run past `staleMs`. */
  private readonly clock: () => Date;
  /** A run with no write on its ticket for longer than this is stale. */
  private readonly staleMs: number;

  constructor(db: Db, clock: () => Date = () => new Date(), staleMs: number = DEFAULT_STALE_HOURS * 60 * 60 * 1000) {
    this.db = db;
    this.clock = clock;
    this.staleMs = staleMs;
  }

  now(): string {
    return this.clock().toISOString();
  }

  private tags(key: string): string[] {
    return (
      this.db.prepare("SELECT tag FROM ticket_tags WHERE ticket_key = ? ORDER BY tag").all(key) as { tag: string }[]
    ).map((row) => row.tag);
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
      run: this.latestRun(row.key),
      openQuestions: (
        this.db
          .prepare("SELECT COUNT(*) AS n FROM questions WHERE ticket_key = ? AND answered_at IS NULL")
          .get(row.key) as { n: number }
      ).n,
      blockedBy: row.blocked_by,
      sprint: row.sprint,
    };
  }

  /**
   * Refuse a write on a ticket in a closed sprint. Every write method calls
   * it first; a key with no ticket passes, for the caller to answer.
   */
  private writable(key: string): void {
    const row = this.db
      .prepare("SELECT t.sprint, s.ended_on FROM tickets t JOIN sprints s ON s.number = t.sprint WHERE t.key = ?")
      .get(key) as { sprint: number; ended_on: string | null } | undefined;
    if (row && row.ended_on !== null) throw new SprintClosedError(key, row.sprint, row.ended_on);
  }

  /** Today, as a calendar day in UTC from the store's clock: a sprint's dates. */
  today(): string {
    return this.now().slice(0, 10);
  }

  private toSprint(row: SprintRow): Sprint {
    return { number: row.number, startedOn: row.started_on, endedOn: row.ended_on, doneCount: row.done_count };
  }

  /** Sprints with their Done count (hidden tickets aside), matching `where`. */
  private sprintRows(where: string, params: unknown[] = []): SprintRow[] {
    return this.db
      .prepare(
        `SELECT s.number, s.started_on, s.ended_on,
                (SELECT COUNT(*) FROM tickets t WHERE t.sprint = s.number AND t.status = 'done' AND t.hidden = 0) AS done_count
         FROM sprints s WHERE ${where} ORDER BY s.number DESC`,
      )
      .all(...params) as SprintRow[];
  }

  /** The active sprint. The migration makes one and the schema allows no second. */
  activeSprint(): Sprint {
    const row = this.sprintRows("s.ended_on IS NULL")[0];
    if (!row) throw new Error("the board has no active sprint");
    return this.toSprint(row);
  }

  /** Every sprint, the newest first. */
  sprints(): Sprint[] {
    return this.sprintRows("1").map((row) => this.toSprint(row));
  }

  /** Sprint `number`, or null when there is none. */
  /** A sprint known to exist, such as one this transaction just made. */
  private requireSprint(number: number): Sprint {
    const sprint = this.sprint(number);
    if (!sprint) throw new Error(`sprint ${number} is missing`);
    return sprint;
  }

  sprint(number: number): Sprint | null {
    const row = this.sprintRows("s.number = ?", [number])[0];
    return row ? this.toSprint(row) : null;
  }

  /**
   * A sprint's tickets, not hidden, by project as the board orders its lanes
   * and the newest status change first in each: for a closed sprint, its Done
   * tickets newest Done first, as the older Done page orders them.
   */
  sprintTickets(number: number): Ticket[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM tickets t WHERE t.sprint = ? AND t.hidden = 0
         ORDER BY t.project COLLATE NOCASE, t.project, t.status_changed_at DESC, t.key`,
      )
      .all(number) as TicketRow[];
    return rows.map((row) => this.toTicket(row));
  }

  /**
   * Close the active sprint on `today` and start the next, `expected`, which
   * must be the active number plus one, so a repeated request starts one
   * sprint, not two. Every ticket that is not Done moves to the new sprint,
   * hidden ones too, with its runs, questions, comments and history, which
   * hang off the ticket; the Done ones stay, frozen. A ticket's sprint is a
   * column, not an event: no history row, and `updated_at` stays. `moved`
   * counts what moved and is not hidden.
   */
  startSprint(
    expected: number,
    today: string,
  ): { ok: true; sprint: Sprint; closed: Sprint; moved: number } | { ok: false; active: Sprint } {
    return this.db.transaction(() => {
      const active = this.activeSprint();
      if (expected !== active.number + 1) return { ok: false as const, active };
      this.db.prepare("UPDATE sprints SET ended_on = ? WHERE number = ?").run(today, active.number);
      this.db.prepare("INSERT INTO sprints (number, started_on) VALUES (?, ?)").run(expected, today);
      this.db
        .prepare("UPDATE tickets SET sprint = ? WHERE sprint = ? AND status <> 'done'")
        .run(expected, active.number);
      const moved = this.db
        .prepare("SELECT COUNT(*) FROM tickets WHERE sprint = ? AND hidden = 0")
        .pluck()
        .get(expected) as number;
      return {
        ok: true as const,
        sprint: this.requireSprint(expected),
        closed: this.requireSprint(active.number),
        moved,
      };
    })();
  }

  private toQuestion(row: QuestionRow): Question {
    return {
      number: row.number,
      text: row.text,
      author: row.author,
      askedAt: row.asked_at,
      answer: row.answer,
      answeredBy: row.answered_by,
      answeredAt: row.answered_at,
    };
  }

  /** Every question on the ticket, by number. */
  questions(key: string): Question[] {
    return (
      this.db.prepare("SELECT * FROM questions WHERE ticket_key = ? ORDER BY number").all(key) as QuestionRow[]
    ).map((row) => this.toQuestion(row));
  }

  /** Every open question in the active sprint, across projects or in one project, oldest first. */
  openQuestions(project?: string): OpenQuestionEntry[] {
    const rows = this.db
      .prepare(
        `SELECT q.*, t.project, t.title, t.status FROM questions q JOIN tickets t ON t.key = q.ticket_key
         WHERE q.answered_at IS NULL AND t.sprint = ${ACTIVE_SPRINT} AND (@project IS NULL OR t.project = @project)
         ORDER BY q.asked_at, q.id`,
      )
      .all({ project: project ?? null }) as (QuestionRow & { project: string; title: string; status: Status })[];
    return rows.map((row) => ({
      key: row.ticket_key,
      project: row.project,
      title: row.title,
      status: row.status,
      question: this.toQuestion(row),
    }));
  }

  /**
   * What waits on the owner, grouped by kind in the order the owner reads it
   * (open questions, Blocked, stale runs, Ready for test, Ready for deploy),
   * oldest first in each, in the active sprint. Questions and stale runs
   * count wherever their ticket is, as `questions` and `runs` list them; the
   * three columns count only tickets on the board, not those hidden by a
   * superseded brief.
   */
  needs(project?: string): Need[] {
    const inProject = (candidate: string) => project === undefined || candidate === project;
    const questions: Need[] = this.openQuestions(project).map((entry) => ({
      kind: "question",
      key: entry.key,
      project: entry.project,
      title: entry.title,
      status: entry.status,
      reason: `#${entry.question.number} ${entry.question.text}`,
      by: entry.question.author,
      since: entry.question.askedAt,
    }));
    const staleRuns: Need[] = this.openRuns()
      .filter((entry) => entry.run.stale && inProject(entry.project))
      .map((entry) => ({
        kind: "stale_run",
        key: entry.key,
        project: entry.project,
        title: entry.title,
        status: "in_progress",
        reason: `stale run by ${entry.run.author}`,
        by: entry.run.author,
        since: entry.run.lastHeardAt,
      }));
    const rows = this.db
      .prepare(
        `SELECT * FROM tickets
         WHERE hidden = 0 AND sprint = ${ACTIVE_SPRINT} AND status IN ('blocked', 'ready_for_test', 'ready_for_deploy')
           AND (@project IS NULL OR project = @project)
         ORDER BY status_changed_at, key`,
      )
      .all({ project: project ?? null }) as TicketRow[];
    const inColumn = (status: Status & NeedKind): Need[] =>
      rows
        .filter((row) => row.status === status)
        .map((row) => {
          // The message of the move that put it there, and who made that move.
          const message = this.db
            .prepare("SELECT body, author FROM comments WHERE ticket_key = ? AND move_to = ? ORDER BY id DESC LIMIT 1")
            .get(row.key, status) as { body: string; author: string } | undefined;
          const moved = this.db
            .prepare("SELECT author FROM history WHERE ticket_key = ? AND to_status = ? ORDER BY id DESC LIMIT 1")
            .get(row.key, status) as { author: string } | undefined;
          return {
            kind: status,
            key: row.key,
            project: row.project,
            title: row.title,
            status,
            reason: message?.body ?? "no message",
            by: moved?.author ?? message?.author ?? "unknown",
            since: row.status_changed_at,
          };
        });
    return [
      ...questions,
      ...inColumn("blocked"),
      ...staleRuns,
      ...inColumn("ready_for_test"),
      ...inColumn("ready_for_deploy"),
    ];
  }

  /** Ask questions on the ticket, numbered on from its last. */
  ask(key: string, texts: readonly string[] | undefined, author: string): Question[] {
    if (!texts?.length) return [];
    this.writable(key);
    const at = this.now();
    const last =
      (this.db.prepare("SELECT MAX(number) AS n FROM questions WHERE ticket_key = ?").get(key) as { n: number | null })
        .n ?? 0;
    const insert = this.db.prepare(
      "INSERT INTO questions (ticket_key, number, text, author, asked_at) VALUES (?, ?, ?, ?, ?)",
    );
    return texts.map((text, index) => {
      const number = last + index + 1;
      insert.run(key, number, text.trim(), author, at);
      return { number, text: text.trim(), author, askedAt: at, answer: null, answeredBy: null, answeredAt: null };
    });
  }

  /**
   * Close question `number` with the owner's answer, and say so in a comment.
   * When it isn't open (answered already, or no such number), the numbers of
   * the ones that are.
   */
  answer(
    key: string,
    number: number,
    answer: string,
    author: string,
  ): { ok: true; ticket: Ticket; question: Question; comment: Comment } | { ok: false; open: number[] } {
    return this.db.transaction(() => {
      this.writable(key);
      const at = this.now();
      const updated = this.db
        .prepare(
          "UPDATE questions SET answer = ?, answered_by = ?, answered_at = ? WHERE ticket_key = ? AND number = ? AND answered_at IS NULL",
        )
        .run(answer.trim(), author, at, key, number);
      if (updated.changes === 0) {
        const open = this.questions(key).filter((question) => question.answeredAt === null);
        return { ok: false as const, open: open.map((question) => question.number) };
      }
      this.touchRun(key);
      const question = this.questions(key).find((candidate) => candidate.number === number);
      if (!question) throw new Error(`question ${number} on ${key} is missing`);
      const comment = this.addComment(key, {
        author,
        body: `Answered question ${number}: ${question.text}\n\n${question.answer}`,
        role: null,
        move: null,
      });
      return { ok: true as const, ticket: this.requireTicket(key), question, comment };
    })();
  }

  private toRun(row: RunRow): Run {
    const open = row.ended_at === null;
    return {
      id: row.id,
      author: row.author,
      message: row.message,
      startedAt: row.started_at,
      lastHeardAt: row.last_heard_at,
      stale: open && this.clock().getTime() - Date.parse(row.last_heard_at) > this.staleMs,
      endedAt: row.ended_at,
      ended: row.ended,
      endedTo: row.ended_status,
    };
  }

  /** The ticket's latest run, open or ended. */
  private latestRun(key: string): Run | null {
    const row = this.db.prepare("SELECT * FROM runs WHERE ticket_key = ? ORDER BY id DESC LIMIT 1").get(key) as
      RunRow | undefined;
    return row ? this.toRun(row) : null;
  }

  /** The ticket's open run, if it has one. */
  openRun(key: string): Run | null {
    const row = this.db.prepare("SELECT * FROM runs WHERE ticket_key = ? AND ended_at IS NULL").get(key) as
      RunRow | undefined;
    return row ? this.toRun(row) : null;
  }

  /** What run `id` holds, or held when it ended, in the order it took them. */
  private holds(id: number): Hold[] {
    return (
      this.db.prepare("SELECT kind, value, held_at FROM holds WHERE run_id = ? ORDER BY id").all(id) as HoldRow[]
    ).map((row) => ({
      kind: row.kind,
      value: row.value,
      heldAt: row.held_at,
    }));
  }

  private toRunWithHolds(row: RunRow): RunWithHolds {
    return { ...this.toRun(row), holds: this.holds(row.id) };
  }

  /** Every run on the ticket, oldest first, each with its holds or leftovers. */
  runs(key: string): RunWithHolds[] {
    return (this.db.prepare("SELECT * FROM runs WHERE ticket_key = ? ORDER BY id").all(key) as RunRow[]).map((row) =>
      this.toRunWithHolds(row),
    );
  }

  /** The run with this id, with its holds. */
  private runById(id: number): RunWithHolds {
    return this.toRunWithHolds(this.db.prepare("SELECT * FROM runs WHERE id = ?").get(id) as RunRow);
  }

  /**
   * Every open run in the active sprint, stalest (the oldest last write) first,
   * with what each holds. With `holding`, only the runs that hold that kind
   * and value.
   */
  openRuns(holding?: { kind: HoldKind; value: string }): OpenRunEntry[] {
    const rows = this.db
      .prepare(
        `SELECT r.*, t.project, t.title FROM runs r JOIN tickets t ON t.key = r.ticket_key
         WHERE r.ended_at IS NULL AND t.sprint = ${ACTIVE_SPRINT}
           AND (@kind IS NULL OR EXISTS (SELECT 1 FROM holds h WHERE h.run_id = r.id AND h.kind = @kind AND h.value = @value))
         ORDER BY r.last_heard_at, r.id`,
      )
      .all({ kind: holding?.kind ?? null, value: holding?.value ?? null }) as (RunRow & {
      project: string;
      title: string;
    })[];
    return rows.map((row) => ({
      key: row.ticket_key,
      project: row.project,
      title: row.title,
      run: this.toRunWithHolds(row),
    }));
  }

  /**
   * `hold`: the ticket's open run holds `kind` `value`, a write on the run.
   * Holding what it holds already changes nothing. `clashes` are the other
   * open runs holding the same, as they stood before this write; the hold
   * goes ahead regardless. Null when the ticket has no open run.
   */
  hold(
    key: string,
    kind: HoldKind,
    value: string,
  ): { held: boolean; run: RunWithHolds; clashes: OpenRunEntry[] } | null {
    return this.db.transaction(() => {
      this.writable(key);
      const open = this.openRun(key);
      if (!open) return null;
      const clashes = this.openRuns({ kind, value }).filter((entry) => entry.run.id !== open.id);
      const inserted = this.db
        .prepare("INSERT OR IGNORE INTO holds (run_id, kind, value, held_at) VALUES (?, ?, ?, ?)")
        .run(open.id, kind, value, this.now());
      this.touchRun(key);
      return { held: inserted.changes > 0, run: this.runById(open.id), clashes };
    })();
  }

  /**
   * `drop`: the ticket's open run no longer holds `kind` `value`, a write on
   * the run. `no_open_run` when there is no open run; `not_held`, with what
   * it does hold, when it doesn't hold that.
   */
  drop(
    key: string,
    kind: HoldKind,
    value: string,
  ):
    | { ok: true; run: RunWithHolds }
    | { ok: false; reason: "no_open_run" }
    | { ok: false; reason: "not_held"; holds: Hold[] } {
    return this.db.transaction(() => {
      this.writable(key);
      const open = this.openRun(key);
      if (!open) return { ok: false as const, reason: "no_open_run" as const };
      const deleted = this.db
        .prepare("DELETE FROM holds WHERE run_id = ? AND kind = ? AND value = ?")
        .run(open.id, kind, value);
      if (deleted.changes === 0) return { ok: false as const, reason: "not_held" as const, holds: this.holds(open.id) };
      this.touchRun(key);
      return { ok: true as const, run: this.runById(open.id) };
    })();
  }

  /** Open a run. The caller has made sure none is open: the schema allows one per ticket. */
  openNewRun(key: string, author: string, message: string | null): void {
    this.writable(key);
    const at = this.now();
    this.db
      .prepare("INSERT INTO runs (ticket_key, author, message, started_at, last_heard_at) VALUES (?, ?, ?, ?, ?)")
      .run(key, author, message, at, at);
  }

  /** A write on the ticket: its open run, if any, was heard from now. */
  touchRun(key: string): void {
    this.writable(key);
    this.db.prepare("UPDATE runs SET last_heard_at = ? WHERE ticket_key = ? AND ended_at IS NULL").run(this.now(), key);
  }

  /** The open run passes to `author`, as a new session resumes the work. */
  passRun(key: string, author: string): void {
    this.writable(key);
    this.db
      .prepare("UPDATE runs SET author = ?, last_heard_at = ? WHERE ticket_key = ? AND ended_at IS NULL")
      .run(author, this.now(), key);
  }

  /** End the open run, if any. A `moved` run keeps the column its ticket went to. */
  endRun(key: string, how: RunEnding, to: Status | null = null): void {
    this.writable(key);
    this.db
      .prepare("UPDATE runs SET ended_at = ?, ended = ?, ended_status = ? WHERE ticket_key = ? AND ended_at IS NULL")
      .run(this.now(), how, to, key);
  }

  /** A ticket known to exist, such as one this transaction just wrote. */
  requireTicket(key: string): Ticket {
    const ticket = this.getTicket(key);
    if (!ticket) throw new Error(`ticket ${key} is missing`);
    return ticket;
  }

  getTicket(key: string): Ticket | null {
    const row = this.db.prepare("SELECT * FROM tickets WHERE key = ?").get(key) as TicketRow | undefined;
    return row ? this.toTicket(row) : null;
  }

  /**
   * A project's tickets in every sprint, each carrying its sprint: its todos'
   * (no number) first by key, then its briefs' by number. Sync acts on the
   * active sprint's only, and needs the rest to leave them be.
   */
  projectTickets(project: string): Ticket[] {
    return (
      this.db.prepare("SELECT * FROM tickets WHERE project = ? ORDER BY number, key").all(project) as TicketRow[]
    ).map((row) => this.toTicket(row));
  }

  /** Replace a ticket's labels. The project is its project tag, never a label. */
  setTags(key: string, project: string, tags: readonly string[]): void {
    this.writable(key);
    const labels = [...new Set(tags.map((tag) => tag.trim()).filter((tag) => tag && tag !== project))];
    this.db.prepare("DELETE FROM ticket_tags WHERE ticket_key = ?").run(key);
    const insert = this.db.prepare("INSERT INTO ticket_tags (ticket_key, tag) VALUES (?, ?)");
    for (const tag of labels) insert.run(key, tag);
  }

  /**
   * A new ticket, in the active sprint: a brief's in To Do, a todo's (no
   * number) in Backlog, and a blocked brief's in Backlog too, since it waits
   * on its condition. The schema holds that a ticket with no number is in
   * Backlog.
   */
  insertTicket(fields: {
    key: string;
    project: string;
    number: number | null;
    title: string;
    summary: string;
    summarySource: SummarySource;
    briefPath: string;
    author: string;
    via: "move" | "sync";
    blockedBy?: string | null;
  }): void {
    const at = this.now();
    const blockedBy = fields.blockedBy ?? null;
    const status: Status = fields.number === null || blockedBy !== null ? "backlog" : "todo";
    this.db
      .prepare(
        `INSERT INTO tickets (key, project, number, title, summary, summary_source, brief_path, status, hidden, created_at, updated_at, status_changed_at, blocked_by, sprint)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ${ACTIVE_SPRINT})`,
      )
      .run(
        fields.key,
        fields.project,
        fields.number,
        fields.title,
        fields.summary,
        fields.summarySource,
        fields.briefPath,
        status,
        at,
        at,
        at,
        blockedBy,
      );
    this.addHistory(fields.key, null, status, fields.author, fields.via);
  }

  /** Remove a ticket with its labels, comments and history. Only sync does, for a todo that is gone. */
  deleteTicket(key: string): void {
    this.writable(key);
    this.db.prepare("DELETE FROM tickets WHERE key = ?").run(key);
  }

  /** Update the fields given; bumps `updated_at`. A `blockedBy` of null clears the condition. */
  updateTicket(
    key: string,
    fields: Partial<{
      title: string;
      summary: string;
      summarySource: SummarySource;
      briefPath: string;
      hidden: boolean;
      blockedBy: string | null;
    }>,
  ): void {
    this.writable(key);
    const columns: [string, string | number | null | undefined][] = [
      ["title", fields.title],
      ["summary", fields.summary],
      ["summary_source", fields.summarySource],
      ["brief_path", fields.briefPath],
      ["hidden", fields.hidden === undefined ? undefined : fields.hidden ? 1 : 0],
      ["blocked_by", fields.blockedBy],
      ["updated_at", this.now()],
    ];
    const set = columns.filter(([, value]) => value !== undefined);
    this.db
      .prepare(`UPDATE tickets SET ${set.map(([column]) => `${column} = ?`).join(", ")} WHERE key = ?`)
      .run(...set.map(([, value]) => value), key);
  }

  /** Change the status and record it. The caller has already decided it is allowed. */
  setStatus(key: string, from: Status, to: Status, author: string, via: "move" | "sync"): void {
    this.writable(key);
    const at = this.now();
    this.db
      .prepare("UPDATE tickets SET status = ?, status_changed_at = ?, updated_at = ? WHERE key = ?")
      .run(to, at, at, key);
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
    this.writable(key);
    const createdAt = this.now();
    const result = this.db
      .prepare(
        "INSERT INTO comments (ticket_key, author, body, role, move_from, move_to, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(key, fields.author, fields.body, fields.role, fields.move?.from ?? null, fields.move?.to ?? null, createdAt);
    return { id: Number(result.lastInsertRowid), ...fields, createdAt };
  }

  comments(key: string): Comment[] {
    return (this.db.prepare("SELECT * FROM comments WHERE ticket_key = ? ORDER BY id").all(key) as CommentRow[]).map(
      (row) => ({
        id: row.id,
        author: row.author,
        body: row.body,
        role: row.role,
        move: row.move_from && row.move_to ? { from: row.move_from, to: row.move_to } : null,
        createdAt: row.created_at,
      }),
    );
  }

  history(key: string): HistoryEvent[] {
    return (this.db.prepare("SELECT * FROM history WHERE ticket_key = ? ORDER BY id").all(key) as HistoryRow[]).map(
      (row) => ({
        from: row.from_status,
        to: row.to_status,
        author: row.author,
        via: row.via,
        at: row.at,
      }),
    );
  }

  /**
   * A move through the table: check it, change the status, record the
   * history, and keep the message as a comment with the row's role. A move
   * out of In Progress ends the open run as `moved`; a move into it opens one.
   */
  move(
    key: string,
    to: Status,
    message: string | undefined,
    author: string,
    questions?: readonly string[],
  ):
    | { ok: true; ticket: Ticket; comment: Comment | null; questions: Question[]; endedRun: RunWithHolds | null }
    | { ok: false; check: Extract<MoveCheck, { ok: false }> }
    | null {
    return this.db.transaction(() => {
      const ticket = this.getTicket(key);
      if (!ticket) return null;
      this.writable(key);
      const check = checkMove(ticket.status, to, message);
      if (!check.ok) return { ok: false as const, check };
      const body = message?.trim();
      // The run's last write is the move that ends it; a move into In Progress opens the next.
      const open = ticket.status === "in_progress" ? this.openRun(key) : null;
      if (open) {
        this.touchRun(key);
        this.endRun(key, "moved", to);
      }
      if (to === "in_progress") this.openNewRun(key, author, body || null);
      this.setStatus(key, ticket.status, to, author, "move");
      const comment = body
        ? this.addComment(key, { author, body, role: check.rule.role, move: { from: ticket.status, to } })
        : null;
      const asked = this.ask(key, questions, author);
      return {
        ok: true as const,
        ticket: this.requireTicket(key),
        comment,
        questions: asked,
        endedRun: open && this.runById(open.id),
      };
    })();
  }

  /**
   * `start`: To Do or Blocked moves to In Progress through the table, which
   * opens a run. A ticket already In Progress is a resume, recorded as a
   * comment: a run opens if none is, or the open run passes to this author
   * (`passedFrom` is the run as it stood), or this author's is heard from.
   */
  start(
    key: string,
    message: string | undefined,
    author: string,
    questions?: readonly string[],
  ):
    | {
        ok: true;
        ticket: Ticket;
        resumed: boolean;
        comment: Comment | null;
        passedFrom: Run | null;
        questions: Question[];
      }
    | { ok: false; check: Extract<MoveCheck, { ok: false }> }
    | null {
    return this.db.transaction(() => {
      const ticket = this.getTicket(key);
      if (!ticket) return null;
      this.writable(key);
      if (ticket.status !== "in_progress") {
        const moved = this.move(key, "in_progress", message, author, questions);
        if (!moved?.ok) return moved;
        return {
          ok: true as const,
          ticket: moved.ticket,
          resumed: false,
          comment: moved.comment,
          passedFrom: null,
          questions: moved.questions,
        };
      }
      const note = message?.trim() || "Resumed in a new session.";
      const open = this.openRun(key);
      let passedFrom: Run | null = null;
      let body = note;
      if (!open) {
        this.openNewRun(key, author, message?.trim() || null);
      } else if (open.author !== author) {
        passedFrom = open;
        this.passRun(key, author);
        body = `${note}\n\nThe run passes from ${open.author} to ${author}.`;
      } else {
        this.touchRun(key);
      }
      const comment = this.addComment(key, { author, body, role: null, move: null });
      const asked = this.ask(key, questions, author);
      return {
        ok: true as const,
        ticket: this.requireTicket(key),
        resumed: true,
        comment,
        passedFrom,
        questions: asked,
      };
    })();
  }

  /**
   * `release`: end the open run without a move, for an agent that was
   * stopped. The ticket stays In Progress, and a comment says the run ended
   * unfinished and why. The run comes back with what it still held. Null
   * when the ticket has no open run.
   */
  release(
    key: string,
    message: string,
    author: string,
  ): { ticket: Ticket; run: RunWithHolds; comment: Comment } | null {
    return this.db.transaction(() => {
      this.writable(key);
      const open = this.openRun(key);
      if (!open) return null;
      this.endRun(key, "released");
      const comment = this.addComment(key, {
        author,
        body: `Released the run by ${open.author}: it ended unfinished, and the ticket stays In Progress.\n\n${message.trim()}`,
        role: null,
        move: null,
      });
      return { ticket: this.requireTicket(key), run: this.runById(open.id), comment };
    })();
  }

  /**
   * The board: the active sprint, one lane per project with anything
   * visible, alphabetically. Hidden tickets never show; Done ones only for
   * `doneDays` after they got there. With `tag`, only tickets carrying that
   * label.
   */
  board(doneDays: number, tag?: string): Lane[] {
    const cutoff = this.doneCutoff(doneDays);
    const rows = this.db
      .prepare(
        `SELECT * FROM tickets t
         WHERE t.hidden = 0 AND t.sprint = ${ACTIVE_SPRINT}
           AND (t.status <> 'done' OR t.status_changed_at >= @cutoff)
           AND (@tag IS NULL OR EXISTS (SELECT 1 FROM ticket_tags g WHERE g.ticket_key = t.key AND g.tag = @tag))
         ORDER BY t.project COLLATE NOCASE, t.project, t.number, t.key`,
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

  /**
   * The older Done page: the active sprint's Done tickets, not hidden, that
   * got there before the cutoff `olderThanDays` back. The board keeps those at or after the same
   * cutoff, so with the same days a ticket is on one of the two, never both.
   * By project as the board orders its lanes, newest Done first in each.
   * With `tag`, only tickets carrying that label.
   */
  olderDone(olderThanDays: number, tag?: string): Ticket[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM tickets t
         WHERE t.hidden = 0 AND t.sprint = ${ACTIVE_SPRINT}
           AND t.status = 'done'
           AND t.status_changed_at < @cutoff
           AND (@tag IS NULL OR EXISTS (SELECT 1 FROM ticket_tags g WHERE g.ticket_key = t.key AND g.tag = @tag))
         ORDER BY t.project COLLATE NOCASE, t.project, t.status_changed_at DESC, t.key`,
      )
      .all({ cutoff: this.doneCutoff(olderThanDays), tag: tag ?? null }) as TicketRow[];
    return rows.map((row) => this.toTicket(row));
  }

  /** The instant `days` back from now that splits the board's Done from the older Done page. */
  private doneCutoff(days: number): string {
    return new Date(this.clock().getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  }
}
