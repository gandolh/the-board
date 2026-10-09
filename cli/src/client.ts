import {
  type BoardResponse,
  type CommentResponse,
  type ErrorBody,
  type MoveRequest,
  type MoveResponse,
  type SyncRequest,
  type SyncResponse,
  type TicketDetailResponse,
  type UpsertTicketRequest,
  type UpsertTicketResponse,
} from "@brief-board/shared";
import { Rejected, Unreachable } from "./errors.js";

/** How long the board gets before the CLI calls it down (brief 04). */
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

/** The board's API, as the CLI uses it. A refused or silent connection is `Unreachable`; a 4xx is `ApiRejected`. */
export class BoardClient {
  constructor(readonly url: string) {}

  private async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.url}${path}`, {
        method,
        headers: body === undefined ? undefined : { "content-type": "application/json" },
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

  comment(key: string, body: { body: string; author?: string }): Promise<CommentResponse> {
    return this.call("POST", `/api/tickets/${encodeURIComponent(key)}/comments`, body);
  }

  sync(body: SyncRequest): Promise<SyncResponse> {
    return this.call("POST", "/api/sync", body);
  }
}
