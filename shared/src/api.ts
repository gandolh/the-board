import { z } from "zod";
import { TODO_SLUG, ticketKeySchema } from "./key.js";
import { messageRoleSchema, type MoveRule } from "./moves.js";
import { statusSchema } from "./status.js";

/**
 * The API contract: every route's request and response, as zod schemas. The
 * server validates with them, and the CLI and the board parse with them, so
 * the three cannot drift (the server, the CLI and the web app import this and nothing else).
 * Field names follow the glossary.
 */

const timestamp = z.string().datetime();

/** Where a ticket's summary came from: an agent's `PUT`, or the brief by way of sync. */
export const SUMMARY_SOURCES = ["agent", "sync"] as const;
export const summarySourceSchema = z.enum(SUMMARY_SOURCES);
export type SummarySource = z.infer<typeof summarySourceSchema>;

/** How a run ended: its ticket moved out of In Progress, someone released it, or sync closed its ticket while it was stale. */
export const RUN_ENDINGS = ["moved", "released", "stale"] as const;
export const runEndingSchema = z.enum(RUN_ENDINGS);
export type RunEnding = z.infer<typeof runEndingSchema>;

/**
 * One agent session working one ticket, from `start` to its end move or a
 * `release`. A record, never a lock: nothing on the board hands a ticket to
 * anyone. Every write on the ticket while the run is open sets `lastHeardAt`.
 */
export const runSchema = z.object({
  id: z.number().int(),
  author: z.string(),
  /** The message `start` carried, if any. */
  message: z.string().nullable(),
  startedAt: timestamp,
  /** The last write on the ticket while the run was open. */
  lastHeardAt: timestamp,
  /**
   * Open, and not heard from for longer than the board's stale threshold.
   * Worked out when the board is read; never stored. False once the run ends.
   */
  stale: z.boolean(),
  /** Null while the run is open. */
  endedAt: timestamp.nullable(),
  ended: runEndingSchema.nullable(),
  /** The column a `moved` run's ticket went to; null otherwise. */
  endedTo: statusSchema.nullable(),
});
export type Run = z.infer<typeof runSchema>;

/** The board's record of one brief. */
export const ticketSchema = z.object({
  key: z.string(),
  /** The project tag: the lane, and the first half of the key. Never changes. */
  project: z.string(),
  /** The brief's number; null on a todo's ticket, which lives in Backlog. */
  number: z.number().int().nonnegative().nullable(),
  title: z.string(),
  summary: z.string(),
  summarySource: summarySourceSchema,
  /**
   * The brief file, relative to the project's repo root, e.g.
   * `corpus/briefs/todo/12-x.md`; on a todo's ticket, the todo's file.
   */
  briefPath: z.string(),
  /** Labels, without the project tag. They filter the board and never make lanes. */
  tags: z.array(z.string()),
  status: statusSchema,
  /** Off the board, for a brief that was superseded. */
  hidden: z.boolean(),
  createdAt: timestamp,
  updatedAt: timestamp,
  statusChangedAt: timestamp,
  /** The ticket's latest run, open or ended; null if none ever started. */
  run: runSchema.nullable(),
});
export type Ticket = z.infer<typeof ticketSchema>;

/** The ticket's run if it is still open. */
export function openRun(ticket: Pick<Ticket, "run">): Run | null {
  return ticket.run && ticket.run.endedAt === null ? ticket.run : null;
}

export const commentSchema = z.object({
  id: z.number().int(),
  author: z.string(),
  body: z.string(),
  /** What the message was for, when it came with a move; null for a plain comment. */
  role: messageRoleSchema.nullable(),
  /** The move it came with, if any. */
  move: z.object({ from: statusSchema, to: statusSchema }).nullable(),
  createdAt: timestamp,
});
export type Comment = z.infer<typeof commentSchema>;

export const HISTORY_VIA = ["move", "sync"] as const;

/** One status change. `from` is null when the ticket was created. */
export const historyEventSchema = z.object({
  from: statusSchema.nullable(),
  to: statusSchema,
  author: z.string(),
  /** A move through the table, or sync correcting the ticket to match its brief. */
  via: z.enum(HISTORY_VIA),
  at: timestamp,
});
export type HistoryEvent = z.infer<typeof historyEventSchema>;

/** Every error body: a code a client can branch on, a sentence it can print. */
export const moveRuleSchema = z.object({
  from: statusSchema,
  to: statusSchema,
  message: z.enum(["optional", "required"]),
  role: messageRoleSchema,
}) satisfies z.ZodType<MoveRule>;

/**
 * The code of a 401: a request the board's guard turned away, because the
 * CLI's token was missing or wrong.
 */
export const UNAUTHORIZED = "unauthorized";

/**
 * The code of a write refused because sync owns the ticket: a move, a comment
 * or an upsert on a todo's ticket in Backlog.
 */
export const SYNC_OWNED = "sync_owned";

export const errorBodySchema = z.object({
  code: z.string(),
  message: z.string(),
  /** On `move_not_allowed` and `message_required`: the moves the ticket may make. */
  allowed: z.array(moveRuleSchema).optional(),
});
export type ErrorBody = z.infer<typeof errorBodySchema>;

const author = z.string().trim().min(1).max(100).optional();

// --- GET /api/health ---------------------------------------------------------

export const healthResponseSchema = z.object({ ok: z.literal(true) });
export type HealthResponse = z.infer<typeof healthResponseSchema>;

// --- GET /api/board ------------------------------------------------------------

/** How many days of Done the board shows by default. */
export const DEFAULT_DONE_DAYS = 14;

export const boardQuerySchema = z.object({
  /** Only tickets carrying this tag. */
  tag: z.string().min(1).optional(),
  doneDays: z.coerce.number().int().min(0).max(3650).default(DEFAULT_DONE_DAYS),
});
export type BoardQuery = z.infer<typeof boardQuerySchema>;

export const laneSchema = z.object({
  project: z.string(),
  /** The lane's visible tickets: not hidden, and Done only within `doneDays`. */
  tickets: z.array(ticketSchema),
});
export type Lane = z.infer<typeof laneSchema>;

export const boardResponseSchema = z.object({ lanes: z.array(laneSchema) });
export type BoardResponse = z.infer<typeof boardResponseSchema>;

// --- GET /api/tickets/:key -----------------------------------------------------

export const ticketParamsSchema = z.object({ key: ticketKeySchema });

export const ticketDetailResponseSchema = z.object({
  ticket: ticketSchema,
  comments: z.array(commentSchema),
  history: z.array(historyEventSchema),
  /** Every run on the ticket, oldest first. */
  runs: z.array(runSchema),
});
export type TicketDetailResponse = z.infer<typeof ticketDetailResponseSchema>;

// --- PUT /api/tickets/:key -----------------------------------------------------

/** Create the ticket, or update it if the key exists: calling twice makes no duplicate. */
export const upsertTicketRequestSchema = z.object({
  title: z.string().trim().min(1).max(300),
  summary: z.string().max(2000),
  briefPath: z.string().min(1).max(500),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
});
export type UpsertTicketRequest = z.input<typeof upsertTicketRequestSchema>;

export const upsertTicketResponseSchema = z.object({
  created: z.boolean(),
  ticket: ticketSchema,
});
export type UpsertTicketResponse = z.infer<typeof upsertTicketResponseSchema>;

// --- POST /api/tickets/:key/moves ----------------------------------------------

export const moveRequestSchema = z.object({
  to: statusSchema,
  message: z.string().max(10_000).optional(),
  author,
});
export type MoveRequest = z.infer<typeof moveRequestSchema>;

export const moveResponseSchema = z.object({
  ticket: ticketSchema,
  /** The move's message, stored as a comment; null when it carried none. */
  comment: commentSchema.nullable(),
});
export type MoveResponse = z.infer<typeof moveResponseSchema>;

// --- POST /api/tickets/:key/comments -------------------------------------------

export const commentRequestSchema = z.object({
  body: z.string().trim().min(1).max(10_000),
  author,
});
export type CommentRequest = z.infer<typeof commentRequestSchema>;

export const commentResponseSchema = z.object({ comment: commentSchema });
export type CommentResponse = z.infer<typeof commentResponseSchema>;

// --- POST /api/tickets/:key/start ----------------------------------------------

/**
 * `brief-board start`: To Do or Blocked moves to In Progress through the
 * table and opens a run. On a ticket already In Progress it is a resume: a
 * comment, and the open run passes to this author (or a run opens if none is).
 */
export const startRequestSchema = z.object({
  message: z.string().max(10_000).optional(),
  author,
});
export type StartRequest = z.infer<typeof startRequestSchema>;

export const startResponseSchema = z.object({
  ticket: ticketSchema,
  /** The ticket was already In Progress. */
  resumed: z.boolean(),
  /** The move's message or the resume note, stored as a comment. */
  comment: commentSchema.nullable(),
  /** The open run as it stood before it passed to another author; null when there was none, or it was this author's. */
  passedFrom: runSchema.nullable(),
});
export type StartResponse = z.infer<typeof startResponseSchema>;

// --- POST /api/tickets/:key/release --------------------------------------------

/** The code of a `release` on a ticket with no open run. */
export const NO_OPEN_RUN = "no_open_run";

/** End a run without a move, for an agent that was stopped. The ticket stays In Progress. */
export const releaseRequestSchema = z.object({
  /** Why, and what the agent left running. */
  message: z.string().trim().min(1).max(10_000),
  author,
});
export type ReleaseRequest = z.infer<typeof releaseRequestSchema>;

export const releaseResponseSchema = z.object({
  ticket: ticketSchema,
  /** The run, ended as `released`. */
  run: runSchema,
  comment: commentSchema,
});
export type ReleaseResponse = z.infer<typeof releaseResponseSchema>;

// --- GET /api/runs ---------------------------------------------------------------

/** An open run with the ticket it works. */
export const openRunEntrySchema = z.object({
  key: z.string(),
  project: z.string(),
  title: z.string(),
  run: runSchema,
});
export type OpenRunEntry = z.infer<typeof openRunEntrySchema>;

/** Every open run across projects, stalest first (the oldest last write first). */
export const runsResponseSchema = z.object({ runs: z.array(openRunEntrySchema) });
export type RunsResponse = z.infer<typeof runsResponseSchema>;

// --- POST /api/sync --------------------------------------------------------------

/** Where a brief sits in its project's corpus. */
export const BRIEF_STATES = ["todo", "done", "superseded"] as const;
export const briefStateSchema = z.enum(BRIEF_STATES);
export type BriefState = z.infer<typeof briefStateSchema>;

export const syncBriefSchema = z.object({
  number: z.number().int().nonnegative(),
  title: z.string().min(1),
  summary: z.string(),
  briefPath: z.string().min(1),
  state: briefStateSchema,
});
export type SyncBrief = z.infer<typeof syncBriefSchema>;

/** An open todo: a `.md` file directly in `corpus/todos/` that is not dropped, closed, promoted or done. */
export const syncTodoSchema = z.object({
  slug: z.string().regex(TODO_SLUG),
  title: z.string().min(1),
  summary: z.string(),
  /** Relative to the project's repo root, e.g. `corpus/todos/linux-apps-sound.md`. */
  path: z.string().min(1),
});
export type SyncTodo = z.infer<typeof syncTodoSchema>;

export const syncProjectSchema = z.object({
  project: z.string().min(1),
  briefs: z.array(syncBriefSchema),
  /**
   * The project's open todos. A CLI from before Backlog leaves this out, and
   * then sync leaves the project's todo tickets alone rather than remove them.
   */
  todos: z.array(syncTodoSchema).optional(),
});
export type SyncProject = z.infer<typeof syncProjectSchema>;

/** Every project's briefs, read from the corpora in one pass and sent in one request. */
export const syncRequestSchema = z.object({ projects: z.array(syncProjectSchema) });
export type SyncRequest = z.infer<typeof syncRequestSchema>;

const count = z.number().int().nonnegative();

export const syncResponseSchema = z.object({
  /** Brief tickets. */
  created: count,
  updated: count,
  unchanged: count,
  /** Todo tickets, counted apart. */
  todos: z.object({ created: count, updated: count, unchanged: count, removed: count }),
  warnings: z.array(z.string()),
});
export type SyncResponse = z.infer<typeof syncResponseSchema>;
