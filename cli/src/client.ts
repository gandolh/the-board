import {
  type AnswerRequest,
  type AnswerResponse,
  type BoardResponse,
  type CommentResponse,
  type DropResponse,
  type ErrorBody,
  type HoldRequest,
  type HoldResponse,
  type MoveRequest,
  type MoveResponse,
  type NeedsResponse,
  type QuestionsResponse,
  type ReleaseRequest,
  type ReleaseResponse,
  type RunsResponse,
  type SprintDetailResponse,
  type SprintsResponse,
  type StartRequest,
  type StartResponse,
  type StartSprintRequest,
  type StartSprintResponse,
  type SyncRequest,
  type SyncResponse,
  type TicketDetailResponse,
  type UpsertTicketRequest,
  type UpsertTicketResponse,
  UNAUTHORIZED,
} from "@brief-board/shared";
import { Rejected, Unreachable } from "./errors.js";

/** How long the board gets before the CLI calls it down. */
const TIMEOUT_MS = 2_000;

/** A refusal from the board, with its error body. */
export class ApiRejected extends Rejected {
  constructor(
    readonly status: number,
    readonly body: ErrorBody,
  ) {
    super(body.message);
  }
}

/**
 * The board turned the CLI's token away (or got none). Exit 3, like a board
 * that can't be reached: the agent tells the owner once and carries on.
 */
export class TokenRefused extends Error {
  readonly exitCode = 3;
  constructor() {
    super("brief-board: the board refused the token: set BRIEF_BOARD_TOKEN in ~/.config/brief-board/env. Tell the owner and carry on without it.");
  }
}

/**
 * The board's API, as the CLI uses it. A refused or silent connection is
 * `Unreachable`; a 401 is `TokenRefused`; another 4xx is `ApiRejected`. With a
 * token, every request carries `Authorization: Bearer <token>`.
 */
export class BoardClient {
  constructor(
    readonly url: string,
    private readonly token?: string,
  ) {}

  private async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["content-type"] = "application/json";
    if (this.token) headers.authorization = `Bearer ${this.token}`;
    let res: Response;
    try {
      res = await fetch(`${this.url}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new Unreachable(this.url);
    }
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : undefined;
    } catch {
      parsed = undefined;
    }
    if (res.ok) return parsed as T;
    const error = parsed as Partial<ErrorBody> | undefined;
    if (res.status === 401 && error?.code === UNAUTHORIZED) throw new TokenRefused();
    if (res.status >= 500 || !error?.code) {
      // Something answered, but not the board as the contract describes it.
      if (res.status >= 500) throw new ApiRejected(res.status, { code: "internal", message: `the board failed (${res.status})` });
      throw new Unreachable(this.url);
    }
    throw new ApiRejected(res.status, error as ErrorBody);
  }

  board(query: { tag?: string; doneDays?: number } = {}): Promise<BoardResponse> {
    const params = new URLSearchParams();
    if (query.tag) params.set("tag", query.tag);
    if (query.doneDays !== undefined) params.set("doneDays", String(query.doneDays));
    const qs = params.toString();
    return this.call("GET", `/api/board${qs ? `?${qs}` : ""}`);
  }

  ticket(key: string): Promise<TicketDetailResponse> {
    return this.call("GET", `/api/tickets/${encodeURIComponent(key)}`);
  }

  upsert(key: string, body: UpsertTicketRequest): Promise<UpsertTicketResponse> {
    return this.call("PUT", `/api/tickets/${encodeURIComponent(key)}`, body);
  }

  move(key: string, body: MoveRequest): Promise<MoveResponse> {
    return this.call("POST", `/api/tickets/${encodeURIComponent(key)}/moves`, body);
  }

  comment(key: string, body: { body: string; author?: string; questions?: string[] }): Promise<CommentResponse> {
    return this.call("POST", `/api/tickets/${encodeURIComponent(key)}/comments`, body);
  }

  start(key: string, body: StartRequest): Promise<StartResponse> {
    return this.call("POST", `/api/tickets/${encodeURIComponent(key)}/start`, body);
  }

  release(key: string, body: ReleaseRequest): Promise<ReleaseResponse> {
    return this.call("POST", `/api/tickets/${encodeURIComponent(key)}/release`, body);
  }

  hold(key: string, body: HoldRequest): Promise<HoldResponse> {
    return this.call("POST", `/api/tickets/${encodeURIComponent(key)}/hold`, body);
  }

  drop(key: string, body: HoldRequest): Promise<DropResponse> {
    return this.call("POST", `/api/tickets/${encodeURIComponent(key)}/drop`, body);
  }

  runs(): Promise<RunsResponse> {
    return this.call("GET", "/api/runs");
  }

  answer(key: string, number: number, body: AnswerRequest): Promise<AnswerResponse> {
    return this.call("POST", `/api/tickets/${encodeURIComponent(key)}/questions/${number}/answer`, body);
  }

  needs(project?: string): Promise<NeedsResponse> {
    return this.call("GET", `/api/needs${project ? `?${new URLSearchParams({ project })}` : ""}`);
  }

  questions(project?: string): Promise<QuestionsResponse> {
    return this.call("GET", `/api/questions${project ? `?${new URLSearchParams({ project })}` : ""}`);
  }

  sync(body: SyncRequest): Promise<SyncResponse> {
    return this.call("POST", "/api/sync", body);
  }

  sprints(): Promise<SprintsResponse> {
    return this.call("GET", "/api/sprints");
  }

  sprint(number: number): Promise<SprintDetailResponse> {
    return this.call("GET", `/api/sprints/${number}`);
  }

  startSprint(body: StartSprintRequest): Promise<StartSprintResponse> {
    return this.call("POST", "/api/sprints", body);
  }
}
