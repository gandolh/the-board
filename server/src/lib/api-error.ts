import {
  NO_OPEN_RUN,
  parseKey,
  STATUS_LABELS,
  SYNC_OWNED,
  type ErrorBody,
  type MoveCheck,
  type Status,
} from "@brief-board/shared";

/**
 * A refusal the handler throws: the status and the contract's flat error body
 * (`{ code, message, allowed? }`, which the CLI and the board both parse).
 * The error plugin sends it as it is.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly body: ErrorBody;

  constructor(status: number, body: ErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/** The 400 for a bad ticket key, set as a route's `badParams`. */
export const BAD_TICKET_KEY: ErrorBody = {
  code: "invalid_key",
  message: "a ticket key is <project>-<number>, like atrium-03, or <project>:<todo> for a todo's",
};

/** The 400 for a bad key or number on the answer route. */
export const BAD_QUESTION_PATH: ErrorBody = {
  code: "invalid_key",
  message: "answer a question as /api/tickets/<key>/questions/<number>/answer",
};

/** The 400 for a sprint that is not a number. */
export const BAD_SPRINT: ErrorBody = {
  code: "invalid_request",
  message: "a sprint is a number: /api/sprints/<number>",
};

export const notFound = (key: string) =>
  new ApiError(404, { code: "not_found", message: `no ticket ${key}; file a brief, then sync or PUT it` });

/** A move the table refuses, with the moves the ticket may make. */
export function refused(key: string, from: Status, target: Status, check: Extract<MoveCheck, { ok: false }>): ApiError {
  const fromLabel = STATUS_LABELS[from];
  const to = STATUS_LABELS[target];
  const rule = check.allowed.find((candidate) => candidate.to === target);
  return new ApiError(400, {
    code: check.code,
    message:
      check.code === "message_required"
        ? `${fromLabel} → ${to} needs a message (${rule?.role.replace("_", " ") ?? "message"})`
        : `${key} cannot go from ${fromLabel} to ${to}`,
    allowed: check.allowed,
  });
}

/**
 * A ticket in Backlog belongs to sync. A todo's goes when the todo is
 * promoted, and anything written on it would go with it; a blocked brief's
 * waits on its condition and leaves when the brief is back in `todo/`.
 */
export const syncOwned = (key: string, what: string) =>
  new ApiError(400, {
    code: SYNC_OWNED,
    message:
      parseKey(key) === null
        ? `${key} is a todo's ticket in Backlog, and only sync ${what}. Promote the todo to a brief instead: the next sync takes this ticket off and files the brief's in To Do.`
        : `${key} waits in Backlog because its brief is in blocked/, and only sync ${what}. When its condition is met, move the brief back to briefs/todo/: the next sync puts the ticket in To Do.`,
  });

/** A hold or a drop on a ticket with no open run. */
export const noRunToHold = (key: string, status: Status) =>
  new ApiError(400, {
    code: NO_OPEN_RUN,
    message: `${key} has no open run (it is ${STATUS_LABELS[status]}); brief-board start ${key} opens one`,
  });
