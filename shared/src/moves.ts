import { z } from "zod";
import type { Status } from "./status.js";

/**
 * What a message on a move is for (glossary "Messages on a transition"). A
 * move to Done carries a conclusion; Blocked → Done a confirmation; the moves
 * that hand work back to an agent, and the optional ones with no named role,
 * a plain comment.
 */
export const MESSAGE_ROLES = [
  "conclusion",
  "block_reason",
  "test_notes",
  "deploy_steps",
  "confirmation",
  "comment",
] as const;
export const messageRoleSchema = z.enum(MESSAGE_ROLES);
export type MessageRole = z.infer<typeof messageRoleSchema>;

export interface MoveRule {
  from: Status;
  to: Status;
  /** Required whenever work goes to the owner, or comes back from the owner to an agent. */
  message: "optional" | "required";
  role: MessageRole;
}

/**
 * Every allowed move (decisions.md "Which moves are allowed, and which need a
 * message"), as data. Anything not here is refused, and so is a required
 * message left out. Sync is the one writer that bypasses this table.
 */
export const MOVES: readonly MoveRule[] = [
  { from: "todo", to: "in_progress", message: "optional", role: "comment" },
  { from: "in_progress", to: "blocked", message: "required", role: "block_reason" },
  { from: "in_progress", to: "ready_for_test", message: "required", role: "test_notes" },
  { from: "in_progress", to: "ready_for_deploy", message: "required", role: "deploy_steps" },
  { from: "in_progress", to: "done", message: "optional", role: "conclusion" },
  { from: "blocked", to: "in_progress", message: "required", role: "comment" },
  { from: "blocked", to: "done", message: "required", role: "confirmation" },
  { from: "ready_for_test", to: "in_progress", message: "required", role: "comment" },
  { from: "ready_for_test", to: "ready_for_deploy", message: "optional", role: "comment" },
  { from: "ready_for_test", to: "done", message: "optional", role: "conclusion" },
  { from: "ready_for_deploy", to: "in_progress", message: "required", role: "comment" },
  { from: "ready_for_deploy", to: "done", message: "optional", role: "conclusion" },
];

/** The moves a ticket in `from` may make, for a client to print. */
export function movesFrom(from: Status): MoveRule[] {
  return MOVES.filter((rule) => rule.from === from);
}

export type MoveErrorCode = "move_not_allowed" | "message_required";

export type MoveCheck =
  | { ok: true; rule: MoveRule }
  | { ok: false; code: MoveErrorCode; allowed: MoveRule[] };

/**
 * Whether `from` → `to` is allowed with this message. A message counts only if
 * it has something besides whitespace. Staying put is not a move: resuming an
 * In Progress ticket is the CLI's business, not the board's.
 */
export function checkMove(from: Status, to: Status, message?: string | null): MoveCheck {
  const allowed = movesFrom(from);
  const rule = allowed.find((candidate) => candidate.to === to);
  if (!rule) return { ok: false, code: "move_not_allowed", allowed };
  if (rule.message === "required" && !message?.trim()) return { ok: false, code: "message_required", allowed };
  return { ok: true, rule };
}
