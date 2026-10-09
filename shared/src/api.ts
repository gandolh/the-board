import { z } from "zod";
import { keySchema } from "./key.js";
import { messageRoleSchema, type MoveRule } from "./moves.js";
import { statusSchema } from "./status.js";

/**
 * The API contract: every route's request and response, as zod schemas. The
 * server validates with them, and the CLI and the board parse with them, so
 * the three cannot drift (briefs 03, 04 and 07 import this and nothing else).
 * Field names follow the glossary.
 */

const timestamp = z.string().datetime();

/** Where a ticket's summary came from: an agent's `PUT`, or the brief by way of sync. */
export const SUMMARY_SOURCES = ["agent", "sync"] as const;
export const summarySourceSchema = z.enum(SUMMARY_SOURCES);
export type SummarySource = z.infer<typeof summarySourceSchema>;

/** The board's record of one brief. */
export const ticketSchema = z.object({
  key: z.string(),
  /** The project tag: the lane, and the first half of the key. Never changes. */
  project: z.string(),
  number: z.number().int().nonnegative(),
  title: z.string(),
  summary: z.string(),
  summarySource: summarySourceSchema,
  /** The brief file, relative to the project's repo root, e.g. `corpus/briefs/todo/12-x.md`. */
  briefPath: z.string(),
  /** Labels, without the project tag. They filter the board and never make lanes. */
  tags: z.array(z.string()),
  status: statusSchema,
  /** Off the board, for a brief that was superseded. */
  hidden: z.boolean(),
  createdAt: timestamp,
  updatedAt: timestamp,
  statusChangedAt: timestamp,
});
export type Ticket = z.infer<typeof ticketSchema>;

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

export const ticketParamsSchema = z.object({ key: keySchema });

export const ticketDetailResponseSchema = z.object({
  ticket: ticketSchema,
  comments: z.array(commentSchema),
  history: z.array(historyEventSchema),
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

export const syncProjectSchema = z.object({
  project: z.string().min(1),
  briefs: z.array(syncBriefSchema),
});
export type SyncProject = z.infer<typeof syncProjectSchema>;

/** Every project's briefs, read from the corpora in one pass (brief 05) and sent in one request. */
export const syncRequestSchema = z.object({ projects: z.array(syncProjectSchema) });
export type SyncRequest = z.infer<typeof syncRequestSchema>;

export const syncResponseSchema = z.object({
  created: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  unchanged: z.number().int().nonnegative(),
  warnings: z.array(z.string()),
});
export type SyncResponse = z.infer<typeof syncResponseSchema>;
