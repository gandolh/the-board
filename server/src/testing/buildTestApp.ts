import type {
  BoardResponse,
  DoneResponse,
  Status,
  SyncBrief,
  SyncResponse,
  TicketDetailResponse,
} from "@brief-board/shared";
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify";
import { afterEach, beforeEach, expect } from "vitest";
import type { Accounts } from "../../vendor/ward/ward-auth.js";
import { buildApp, type AppOptions } from "../app.js";
import { openDatabase } from "../db.js";
import { openAccounts } from "../plugins/auth/accounts.js";

/** The CLI's token on every test app; `call` sends it, as the CLI does. */
const TOKEN = "s".repeat(44);
export const BEARER = { authorization: `Bearer ${TOKEN}` };

/** The clock every test app starts on. */
const START = "2026-10-09T12:00:00.000Z";

/**
 * A whole app on an in-memory database, never listening, with the CLI's token
 * and the local accounts it reads, for a test that seeds a user. Anything in
 * `overrides` wins, an explicit `token: undefined` included. Close it after
 * the test: that closes the database.
 */
export async function buildTestApp(
  overrides: Partial<AppOptions> = {},
): Promise<{ app: FastifyInstance; accounts: Accounts }> {
  const db = openDatabase(":memory:");
  const accounts = openAccounts(db);
  const app = await buildApp({ dbPath: ":memory:", db, token: TOKEN, ...overrides });
  return { app, accounts };
}

/** The app of the test running, and the clock it reads; `useTestBoard` makes a fresh pair before each test. */
export let app: FastifyInstance;
export let accounts: Accounts;
export let clock: Date;

export function setClock(next: Date): void {
  clock = next;
}

/** Call inside a `describe`: a fresh test app on a fresh clock before each test, closed after it. */
export function useTestBoard(): void {
  beforeEach(async () => {
    clock = new Date(START);
    ({ app, accounts } = await buildTestApp({ now: () => clock }));
  });
  afterEach(async () => {
    await app.close();
  });
}

/** `app.inject` as the CLI: with the token. */
export function call(options: InjectOptions): Promise<LightMyRequestResponse> {
  return app.inject({ ...options, headers: { ...BEARER, ...options.headers } });
}

export const put = (
  key: string,
  fields: Partial<{ title: string; summary: string; briefPath: string; tags: string[] }> = {},
) =>
  call({
    method: "PUT",
    url: `/api/tickets/${key}`,
    payload: { title: "A brief", summary: "", briefPath: "corpus/briefs/todo/01-a.md", ...fields },
  });
export const move = (key: string, to: Status, message?: string) =>
  call({ method: "POST", url: `/api/tickets/${key}/moves`, payload: { to, message } });
export const detail = async (key: string) => (await call({ url: `/api/tickets/${key}` })).json<TicketDetailResponse>();
export const board = async (query = "") => (await call({ url: `/api/board${query}` })).json<BoardResponse>();
export const olderDone = async (query = "") => (await call({ url: `/api/done${query}` })).json<DoneResponse>();
export const sync = async (project: string, briefs: Partial<SyncBrief>[]) =>
  (
    await call({
      method: "POST",
      url: "/api/sync",
      payload: {
        projects: [
          {
            project,
            briefs: briefs.map((b) => ({
              title: `Brief ${b.number}`,
              summary: `Summary ${b.number}`,
              briefPath: `corpus/briefs/${b.state ?? "todo"}/${b.number}-x.md`,
              state: "todo",
              ...b,
            })),
          },
        ],
      },
    })
  ).json<SyncResponse>();

/** A route to each status from To Do, through the table. */
export const PATH_TO: Record<Status, [Status, string?][]> = {
  // Never reached through the table: only sync puts a ticket in Backlog.
  backlog: [],
  todo: [],
  in_progress: [["in_progress"]],
  blocked: [["in_progress"], ["blocked", "owner decides"]],
  ready_for_test: [["in_progress"], ["ready_for_test", "try it"]],
  ready_for_deploy: [["in_progress"], ["ready_for_deploy", "npm run deploy"]],
  done: [["in_progress"], ["done"]],
};

export async function ticketIn(key: string, status: Status) {
  await put(key);
  for (const [to, message] of PATH_TO[status]) expect((await move(key, to, message)).statusCode).toBe(200);
}
