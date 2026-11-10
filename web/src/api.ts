import {
  boardResponseSchema,
  doneResponseSchema,
  needsResponseSchema,
  sprintDetailResponseSchema,
  sprintsResponseSchema,
  ticketDetailResponseSchema,
  type BoardResponse,
  type DoneResponse,
  type NeedsResponse,
  type SprintDetailResponse,
  type SprintsResponse,
  type TicketDetailResponse,
} from "@brief-board/shared";
import { API_BASE } from "./base";

/**
 * The board reads and never writes (decisions.md "The UI is read-only"): the
 * only requests in this app are these GETs, and the server refuses a
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

async function get<T>(path: string, parse: (value: unknown) => T, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { method: "GET", headers: { accept: "application/json" }, signal });
  if (res.status === 401) {
    for (const listener of unauthorizedListeners) listener();
    throw new Unauthorized(`${path} needs a session`);
  }
  if (!res.ok) throw new Error(`${path} answered ${res.status}`);
  return parse(await res.json());
}

/** The API's own default keeps 14 days of Done, which is what the board shows. */
export function fetchBoard(signal?: AbortSignal): Promise<BoardResponse> {
  return get("/api/board", (v) => boardResponseSchema.parse(v), signal);
}

/** Done older than the board's 14 days, by the API's same default: the older Done page. */
export function fetchDone(signal?: AbortSignal): Promise<DoneResponse> {
  return get("/api/done", (v) => doneResponseSchema.parse(v), signal);
}

/** What waits on the owner, for the strip above the lanes. */
export function fetchNeeds(signal?: AbortSignal): Promise<NeedsResponse> {
  return get("/api/needs", (v) => needsResponseSchema.parse(v), signal);
}

/** The active sprint and the closed ones, newest first, for the Sprints page. */
export function fetchSprints(signal?: AbortSignal): Promise<SprintsResponse> {
  return get("/api/sprints", (v) => sprintsResponseSchema.parse(v), signal);
}

/** One sprint and its tickets, when the Sprints page opens it. */
export function fetchSprint(number: number, signal?: AbortSignal): Promise<SprintDetailResponse> {
  return get(`/api/sprints/${number}`, (v) => sprintDetailResponseSchema.parse(v), signal);
}

export function fetchTicket(key: string, signal?: AbortSignal): Promise<TicketDetailResponse> {
  return get(`/api/tickets/${encodeURIComponent(key)}`, (v) => ticketDetailResponseSchema.parse(v), signal);
}
