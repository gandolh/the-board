import { boardResponseSchema, ticketDetailResponseSchema, type BoardResponse, type TicketDetailResponse } from "@brief-board/shared";
import { API_BASE } from "./base";

/**
 * The board reads and never writes (decisions.md "The UI is read-only"): the
 * only requests in this app are these two GETs, and the server refuses a
 * signed-in browser anything else. Answers are parsed with the shared
 * contract, so a server that drifted shows as an error, not as a half-drawn
 * board.
 *
 * A 401 means the session is over (or never was): the listeners hear of it
 * (`auth.ts` asks the server again, and the gate shows the login page), and
 * the request rejects with `Unauthorized`, which the polling does not count
 * as the API being down.
 */

/** The request was refused for want of a session. */
export class Unauthorized extends Error {
  override readonly name = "Unauthorized";
}

const unauthorizedListeners = new Set<() => void>();

/** Hear of every 401. Returns a function that stops listening. */
export function onUnauthorized(listener: () => void): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

/** The API's own default keeps 14 days of Done, which is what the board shows. */
async function get<T>(path: string, parse: (value: unknown) => T, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { method: "GET", headers: { accept: "application/json" }, signal });
  if (res.status === 401) {
    for (const listener of unauthorizedListeners) listener();
    throw new Unauthorized(`${path} needs a session`);
  }
  if (!res.ok) throw new Error(`${path} answered ${res.status}`);
  return parse(await res.json());
}

export function fetchBoard(signal?: AbortSignal): Promise<BoardResponse> {
  return get("/api/board", (v) => boardResponseSchema.parse(v), signal);
}

export function fetchTicket(key: string, signal?: AbortSignal): Promise<TicketDetailResponse> {
  return get(`/api/tickets/${encodeURIComponent(key)}`, (v) => ticketDetailResponseSchema.parse(v), signal);
}
