import { boardResponseSchema, ticketDetailResponseSchema, type BoardResponse, type TicketDetailResponse } from "@brief-board/shared";

/**
 * The board reads and never writes (decisions.md "The UI is read-only"): the
 * only requests in this app are these two GETs. Answers are parsed with the
 * shared contract, so a server that drifted shows as an error, not as a
 * half-drawn board.
 */

/** The API's own default keeps 14 days of Done, which is what the board shows. */
async function get<T>(path: string, parse: (value: unknown) => T, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, { method: "GET", headers: { accept: "application/json" }, signal });
  if (!res.ok) throw new Error(`${path} answered ${res.status}`);
  return parse(await res.json());
}

export function fetchBoard(signal?: AbortSignal): Promise<BoardResponse> {
  return get("/api/board", (v) => boardResponseSchema.parse(v), signal);
}

export function fetchTicket(key: string, signal?: AbortSignal): Promise<TicketDetailResponse> {
  return get(`/api/tickets/${encodeURIComponent(key)}`, (v) => ticketDetailResponseSchema.parse(v), signal);
}
