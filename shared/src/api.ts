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

/** How a run ended: its ticket moved out of In Progress, someone released it, or sync closed its ticket (or put it in Backlog) while it was stale. */
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
  /** The column a `moved` run's ticket went to, or Backlog for a stale run sync ended there; null otherwise. */
  endedTo: statusSchema.nullable(),
});
export type Run = z.infer<typeof runSchema>;

/** What a run can hold: what an agent starts that outlives one command. */
export const HOLD_KINDS = ["port", "pid", "container", "path"] as const;
export const holdKindSchema = z.enum(HOLD_KINDS);
export type HoldKind = z.infer<typeof holdKindSchema>;

/**
 * Something a run declares it started: a dev server's port, a pid, a
 * container, a copied folder. Free text, checked against nothing on the
 * machine. A record, never a lock: another run may hold the same value.
 */
export const holdSchema = z.object({
  kind: holdKindSchema,
  value: z.string(),
  heldAt: timestamp,
});
export type Hold = z.infer<typeof holdSchema>;

/**
 * A run with its holds: what it holds while open, and once it ended, what
 * it still held then (its leftovers). The board's tickets carry a plain run.
 */
export const runWithHoldsSchema = runSchema.extend({ holds: z.array(holdSchema) });
export type RunWithHolds = z.infer<typeof runWithHoldsSchema>;

/**
 * A question for the owner, asked with `--question` on a move, a comment or
 * a start. It belongs to the ticket, not to a run: it outlives the end move,
 * and is open until someone records the owner's answer.
 */
export const questionSchema = z.object({
  /** Stable for its ticket: 1, 2, 3... */
  number: z.number().int().positive(),
  text: z.string(),
  author: z.string(),
  askedAt: timestamp,
  /** Null while the question is open. */
  answer: z.string().nullable(),
  answeredBy: z.string().nullable(),
  answeredAt: timestamp.nullable(),
});
export type Question = z.infer<typeof questionSchema>;

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
  /** How many of its questions wait for the owner's answer: the card's badge, in any column. */
  openQuestions: z.number().int().nonnegative(),
  /**
   * What its brief or todo waits on, from a file in a `blocked/` folder; null
   * when it waits on nothing. Not the Blocked status: sync keeps it, and such
   * a ticket waits in Backlog.
   */
  blockedBy: z.string().nullable(),
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

/** Questions for the owner, riding on a move, a comment or a start. */
const questions = z.array(z.string().trim().min(1).max(2000)).max(20).optional();

// --- GET /api/health ---------------------------------------------------------

export const healthResponseSchema = z.object({ ok: z.literal(true) });
export type HealthResponse = z.infer<typeof healthResponseSchema>;

// --- GET /api/board ------------------------------------------------------------

/** How many days of Done the board shows by default; older Done is on its own page (`GET /api/done`). */
export const DEFAULT_DONE_DAYS = 14;

/** A Done window in days: the board's `doneDays`, and the older Done page's `olderThanDays`. */
const doneDays = z.coerce.number().int().min(0).max(3650).default(DEFAULT_DONE_DAYS);

export const boardQuerySchema = z.object({
  /** Only tickets carrying this tag. */
  tag: z.string().min(1).optional(),
  doneDays,
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

// --- GET /api/done -------------------------------------------------------------

/**
 * Done tickets the board no longer shows. A ticket is on the board while
 * `statusChangedAt` is at or after the cutoff `doneDays` back, and here once
 * it is before the cutoff `olderThanDays` back: with the same number of days,
 * every Done ticket is in exactly one of the two.
 */
export const doneQuerySchema = z.object({
  /** Only tickets carrying this tag. */
  tag: z.string().min(1).optional(),
  olderThanDays: doneDays,
});
export type DoneQuery = z.infer<typeof doneQuerySchema>;

/**
 * Done, not hidden, older than the window: grouped by project
 * (alphabetical, as the board's lanes), newest Done first in each.
 */
export const doneResponseSchema = z.object({ tickets: z.array(ticketSchema) });
export type DoneResponse = z.infer<typeof doneResponseSchema>;

// --- GET /api/tickets/:key -----------------------------------------------------

export const ticketParamsSchema = z.object({ key: ticketKeySchema });

export const ticketDetailResponseSchema = z.object({
  ticket: ticketSchema,
  comments: z.array(commentSchema),
  history: z.array(historyEventSchema),
  /** Every run on the ticket, oldest first, each with its holds or leftovers. */
  runs: z.array(runWithHoldsSchema),
  /** Every question on the ticket, by number. */
  questions: z.array(questionSchema),
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
  questions,
});
export type MoveRequest = z.infer<typeof moveRequestSchema>;

export const moveResponseSchema = z.object({
  ticket: ticketSchema,
  /** The move's message, stored as a comment; null when it carried none. */
  comment: commentSchema.nullable(),
  /** The run this move ended, with what it still held; null when it ended none. */
  endedRun: runWithHoldsSchema.nullable(),
  /** The questions it asked, numbered. */
  questions: z.array(questionSchema),
});
export type MoveResponse = z.infer<typeof moveResponseSchema>;

// --- POST /api/tickets/:key/comments -------------------------------------------

export const commentRequestSchema = z.object({
  body: z.string().trim().min(1).max(10_000),
  author,
  questions,
});
export type CommentRequest = z.infer<typeof commentRequestSchema>;

export const commentResponseSchema = z.object({ comment: commentSchema, questions: z.array(questionSchema) });
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
  questions,
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
  /** The questions it asked, numbered. */
  questions: z.array(questionSchema),
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
  /** The run, ended as `released`, with what it still held. */
  run: runWithHoldsSchema,
  comment: commentSchema,
});
export type ReleaseResponse = z.infer<typeof releaseResponseSchema>;

// --- GET /api/runs ---------------------------------------------------------------

/** An open run with the ticket it works, and what it holds. */
export const openRunEntrySchema = z.object({
  key: z.string(),
  project: z.string(),
  title: z.string(),
  run: runWithHoldsSchema,
});
export type OpenRunEntry = z.infer<typeof openRunEntrySchema>;

/** Every open run across projects, stalest first (the oldest last write first). */
export const runsResponseSchema = z.object({ runs: z.array(openRunEntrySchema) });
export type RunsResponse = z.infer<typeof runsResponseSchema>;

// --- POST /api/tickets/:key/hold and /drop ----------------------------------------

/** The code of a `drop` of something the open run doesn't hold. */
export const NOT_HELD = "not_held";

/**
 * `hold` adds one to the ticket's open run, and `drop` takes one off; both
 * count as a write on the run. No open run is `no_open_run`.
 */
export const holdRequestSchema = z.object({
  kind: holdKindSchema,
  value: z.string().trim().min(1).max(500),
});
export type HoldRequest = z.infer<typeof holdRequestSchema>;

export const holdResponseSchema = z.object({
  /** False when the run held it already, which changes nothing. */
  held: z.boolean(),
  /** The open run, with everything it holds now. */
  run: runWithHoldsSchema,
  /**
   * The other open runs that hold the same kind and value, stalest first.
   * The hold goes ahead anyway: a hold is a record, never a lock.
   */
  clashes: z.array(openRunEntrySchema),
});
export type HoldResponse = z.infer<typeof holdResponseSchema>;

export const dropResponseSchema = z.object({
  /** The open run, with what it still holds. */
  run: runWithHoldsSchema,
});
export type DropResponse = z.infer<typeof dropResponseSchema>;

// --- POST /api/tickets/:key/questions/:number/answer ---------------------------

/** The code of an answer to a question that is answered already, or doesn't exist. */
export const QUESTION_NOT_OPEN = "question_not_open";

export const questionParamsSchema = z.object({ key: ticketKeySchema, number: z.coerce.number().int().positive() });

/** Record the owner's answer, which closes the question. */
export const answerRequestSchema = z.object({
  answer: z.string().trim().min(1).max(10_000),
  author,
});
export type AnswerRequest = z.infer<typeof answerRequestSchema>;

export const answerResponseSchema = z.object({
  ticket: ticketSchema,
  question: questionSchema,
  comment: commentSchema,
});
export type AnswerResponse = z.infer<typeof answerResponseSchema>;

// --- GET /api/questions ------------------------------------------------------------

export const questionsQuerySchema = z.object({
  /** Only this project's. */
  project: z.string().min(1).optional(),
});

/** An open question with the ticket it was asked on. */
export const openQuestionEntrySchema = z.object({
  key: z.string(),
  project: z.string(),
  title: z.string(),
  status: statusSchema,
  question: questionSchema,
});
export type OpenQuestionEntry = z.infer<typeof openQuestionEntrySchema>;

/** Every open question across projects, oldest first. */
export const questionsResponseSchema = z.object({ questions: z.array(openQuestionEntrySchema) });
export type QuestionsResponse = z.infer<typeof questionsResponseSchema>;

// --- GET /api/needs ----------------------------------------------------------------

/**
 * What waits on the owner, in the order the owner reads it: open questions,
 * Blocked tickets, stale runs, Ready for test, Ready for deploy. Derived from
 * the tickets, questions and runs; never a status, never a column.
 */
export const NEED_KINDS = ["question", "blocked", "stale_run", "ready_for_test", "ready_for_deploy"] as const;
export const needKindSchema = z.enum(NEED_KINDS);
export type NeedKind = z.infer<typeof needKindSchema>;

export const needsQuerySchema = z.object({
  /** Only this project's. */
  project: z.string().min(1).optional(),
});

/** One thing that waits on the owner: which ticket, why, and since when. */
export const needSchema = z.object({
  kind: needKindSchema,
  key: z.string(),
  project: z.string(),
  title: z.string(),
  status: statusSchema,
  /**
   * Why it is there: the question, the block reason, the stale run, or the
   * message of the move into Ready for test or Ready for deploy.
   */
  reason: z.string(),
  /** Who asked, whose run it is, or who made the move. */
  by: z.string(),
  /** When it was asked, when the run was last heard from, or when the ticket entered its column. */
  since: timestamp,
});
export type Need = z.infer<typeof needSchema>;

/** Grouped by kind in `NEED_KINDS` order, oldest first in each. */
export const needsResponseSchema = z.object({ needs: z.array(needSchema) });
export type NeedsResponse = z.infer<typeof needsResponseSchema>;

// --- POST /api/sync --------------------------------------------------------------

/** Where a brief sits in its project's corpus. `blocked` waits on a condition outside the work. */
export const BRIEF_STATES = ["todo", "blocked", "done", "superseded"] as const;
export const briefStateSchema = z.enum(BRIEF_STATES);
export type BriefState = z.infer<typeof briefStateSchema>;

export const syncBriefSchema = z.object({
  number: z.number().int().nonnegative(),
  title: z.string().min(1),
  summary: z.string(),
  briefPath: z.string().min(1),
  state: briefStateSchema,
  /**
   * The condition a brief in `blocked/` waits on. A CLI from before
   * `blocked/` leaves it out, and never sends that state.
   */
  blockedBy: z.string().nullable().optional(),
});
export type SyncBrief = z.infer<typeof syncBriefSchema>;

/** The condition sent for a file in a `blocked/` folder that names none. */
export const BLOCKED_BY_NOT_GIVEN = "not given";

/** An open todo: a `.md` file directly in `corpus/todos/` or `corpus/todos/blocked/` that is not dropped, closed, promoted or done. */
export const syncTodoSchema = z.object({
  slug: z.string().regex(TODO_SLUG),
  title: z.string().min(1),
  summary: z.string(),
  /** Relative to the project's repo root, e.g. `corpus/todos/linux-apps-sound.md`. */
  path: z.string().min(1),
  /**
   * The condition, for a todo in `corpus/todos/blocked/`; null for one in
   * `corpus/todos/`. A CLI from before `blocked/` leaves it out.
   */
  blockedBy: z.string().nullable().optional(),
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
