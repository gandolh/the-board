import { createHash, timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance, type FastifyReply } from "fastify";
import {
  boardQuerySchema,
  commentRequestSchema,

  moveRequestSchema,
  parseKey,
  STATUS_LABELS,
  SYNC_OWNED,
  syncRequestSchema,
  ticketParamsSchema,
  UNAUTHORIZED,
  upsertTicketRequestSchema,
  type BoardResponse,
  type CommentResponse,
  type ErrorBody,
  type HealthResponse,
  type MoveResponse,
  type SyncResponse,
  type TicketDetailResponse,
  type UpsertTicketResponse,
} from "@brief-board/shared";
import type { z } from "zod";
import { createWardClient, wardAuth, type Accounts, type WardClientOptions } from "../vendor/ward/ward-auth.js";
import { openAccounts, USER_ROLE } from "./accounts.js";
import { AUTH_ROUTE_PREFIX } from "./config.js";
import { openDatabase } from "./db.js";
import { Store } from "./store.js";
import { runSync } from "./sync.js";

/**
 * The brief-board API: the contract in `shared/src/api.ts` and nothing
 * beyond it, behind one guard. Agents reach it through the CLI with the shared
 * token; the read-only board reads it with a signed-in session.
 *
 * Paths: the API is `/api/*`, and sign-in is `/auth/*`. The browser reaches
 * them under `/brief-board-api`; Caddy strips that prefix in production, and
 * this server strips it too (`stripApiPrefix`), so the same build works behind
 * Caddy and on its own. The built board is served at `/brief-board/`, and `/`
 * redirects there.
 *
 * The guard is the vendored `wardAuth` plugin, registered before any route:
 * - `GET /api/health` is open (the deploy's check);
 * - any `/api/*` request with `Authorization: Bearer <token>` passes;
 * - otherwise `/api/*` needs a session, and a session may only read
 *   (`read_only_session`): on a shared origin, a script in another app could
 *   send the owner's cookie, and this keeps the worst case at reading the board;
 * - the library's rename route (`POST /auth/username`) is off: it sits outside
 *   `/api`, so the read-only rule would not cover it, and the board offers no rename;
 * - the board's own files are open, so the login page can load.
 */

/** The API prefix as the browser sees it, unless `BRIEF_BOARD_API_PREFIX` moves it (web/src/base.ts). */
export const API_PREFIX = "/brief-board-api";
/** Where the built board is served, unless `BRIEF_BOARD_BASE` moves it. */
export const BOARD_PATH = "/brief-board/";
/** The session cookie's name. Unique in the estate: every app shares one origin. */
export const SESSION_COOKIE = "brief_board_session";

/** A URL without a leading API prefix, when `/`, `?` or the end follows it; any other URL as it is. */
export function stripApiPrefix(url: string, prefix: string = API_PREFIX): string {
  if (!url.startsWith(prefix)) return url;
  const rest = url.slice(prefix.length);
  if (rest === "") return "/";
  if (rest.startsWith("/")) return rest;
  if (rest.startsWith("?")) return `/${rest}`;
  return url;
}

export interface AppOptions {
  /** A file path, or `:memory:` for tests. */
  dbPath: string;
  /** The built board, served at `webBase`; skipped when the directory does not exist. */
  webDist?: string;
  /**
   * The shared secret the CLI sends as `Authorization: Bearer <token>`. Unset,
   * the bearer path is closed, not open: only a signed-in browser gets in.
   */
  token?: string;
  /** The board's origin as the browser sees it. Default `http://localhost:5178`, the Vite dev server. */
  publicOrigin?: string;
  /** The API prefix as the browser sees it, and the session cookie's path. Default `/brief-board-api`. */
  apiPrefix?: string;
  /** The board's base path, with a trailing slash. Default `/brief-board/`. */
  webBase?: string;
  /** "Sign in with Ward". Unset, local accounts only. */
  ward?: WardClientOptions;
  /** Peers besides loopback whose `X-Forwarded-For` the login lockout believes. Default none. */
  trustedProxies?: readonly string[];
  /** The clock, for tests. */
  now?: () => Date;
  logger?: boolean;
}

declare module "fastify" {
  interface FastifyInstance {
    /** The local accounts, for the seed's tests. */
    accounts: Accounts;
  }
}

/** A path is `prefix` or under it. */
function isUnder(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function pathOf(url: string): string {
  return url.split("?")[0]!;
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/**
 * Whether an `Authorization` header carries the token. Both sides are
 * hashed first, so the comparison takes the same time whatever the length.
 */
export function bearerMatches(header: string | undefined, expected: Buffer): boolean {
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header ?? "");
  if (!match) return false;
  return timingSafeEqual(digest(match[1]!), expected);
}

/** The only API route with no session or token: vps-deploy's health check calls it bare. */
const PUBLIC_ROUTES: readonly string[] = ["GET /api/health"];

/** A session's methods under `/api`. Writes are the CLI's, with the token. */
const SESSION_METHODS: ReadonlySet<string> = new Set(["GET", "HEAD"]);

/** Who did it, when the client does not say. */
const DEFAULT_AUTHOR = "agent";

function fail(reply: FastifyReply, status: number, body: ErrorBody): FastifyReply {
  return reply.status(status).send(body);
}

/** Parse with a contract schema, or answer 400 and return undefined. */
function parse<S extends z.ZodType>(schema: S, value: unknown, reply: FastifyReply): z.output<S> | undefined {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  void fail(reply, 400, {
    code: "invalid_request",
    message: issue ? `${issue.path.join(".") || "request"}: ${issue.message}` : "invalid request",
  });
  return undefined;
}

export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
  const db = openDatabase(options.dbPath);
  const store = new Store(db, options.now);
  const apiPrefix = options.apiPrefix ?? API_PREFIX;
  const webBase = options.webBase ?? BOARD_PATH;
  const app = Fastify({ logger: options.logger ?? false, rewriteUrl: (request) => stripApiPrefix(request.url ?? "/", apiPrefix) });
  app.addHook("onClose", async () => db.close());

  // Fastify's own 4xx (bad JSON, wrong content type) in the contract's shape.
  app.setErrorHandler((error: Error & { statusCode?: number; code?: string }, request, reply) => {
    const status = error.statusCode ?? 500;
    if (status >= 500) {
      request.log.error({ err: error }, "unhandled error");
      return fail(reply, 500, { code: "internal", message: "the board hit an error; see its log" });
    }
    return fail(reply, status, { code: "invalid_request", message: error.message });
  });

  // The guard, first, so every route after it is behind it. Fastify's default
  // request log has the method and URL, never the headers, so neither the token
  // nor the cookie is written anywhere.
  const accounts = openAccounts(db);
  app.decorate("accounts", accounts);
  // Checks the settings and imports the key now; talks to Ward only on first use, so the board starts while Ward is down.
  const ward = options.ward && (await createWardClient(options.ward));
  const expected = options.token ? digest(options.token) : undefined;
  await app.register(wardAuth, {
    accounts,
    cookieName: SESSION_COOKIE,
    // The API prefix as the browser sees it: every request that needs the session is under it.
    cookiePath: apiPrefix,
    publicOrigin: options.publicOrigin ?? "http://localhost:5178",
    routePrefix: AUTH_ROUTE_PREFIX,
    publicRoutes: PUBLIC_ROUTES,
    // A session only reads; see the guard's notes above.
    allowRename: false,
    isPublic: (request) => {
      const path = pathOf(request.url);
      // The CLI: its token, compared in constant time. With no token configured this path is closed.
      if (isUnder(path, "/api")) return expected !== undefined && bearerMatches(request.headers.authorization, expected);
      // The plugin's own list says which sign-in routes are open.
      if (isUnder(path, AUTH_ROUTE_PREFIX)) return false;
      // The board's files, the redirect to them, and a 404: the login page has to load.
      return true;
    },
    validateSession: (_resolved, request) =>
      isUnder(pathOf(request.url), "/api") && !SESSION_METHODS.has(request.method)
        ? { ok: false, reason: "read_only_session" }
        : { ok: true },
    trustedProxies: options.trustedProxies ?? [],
    ...(ward && {
      ward: {
        client: ward,
        loginPath: `${webBase}login`,
        settingsPath: `${webBase}account`,
        afterSignInPath: webBase,
        roleFor: () => USER_ROLE,
      },
    }),
  });

  // The guard answers `{ error: "unauthorized" }`; under `/api` the contract's
  // error shape is `{ code, message }`, which the CLI reads for "the board
  // refused the token". The sign-in routes keep the plugin's shape for its hooks.
  app.addHook("onSend", async (request, reply, payload) => {
    if (reply.statusCode !== 401 || typeof payload !== "string" || !isUnder(pathOf(request.url), "/api")) return payload;
    let body: unknown;
    try {
      body = JSON.parse(payload);
    } catch {
      return payload;
    }
    if (typeof body !== "object" || body === null || !("error" in body) || "code" in body) return payload;
    const reason = (body as { reason?: unknown }).reason;
    const refused: ErrorBody & { reason?: string } = {
      code: UNAUTHORIZED,
      message:
        reason === "read_only_session"
          ? "a signed-in browser only reads the board; writes need the CLI's token"
          : "sign in, or send the CLI's token as Authorization: Bearer <token>",
      ...(typeof reason === "string" ? { reason } : {}),
    };
    return JSON.stringify(refused);
  });

  app.get("/api/health", async (): Promise<HealthResponse> => ({ ok: true }));

  app.get("/api/board", async (request, reply) => {
    const query = parse(boardQuerySchema, request.query, reply);
    if (!query) return reply;
    const body: BoardResponse = { lanes: store.board(query.doneDays, query.tag) };
    return body;
  });

  /** The key from the URL, canonical, or a 400. */
  function keyOf(params: unknown, reply: FastifyReply): string | undefined {
    const parsed = ticketParamsSchema.safeParse(params);
    if (parsed.success) return parsed.data.key;
    void fail(reply, 400, {
      code: "invalid_key",
      message: "a ticket key is <project>-<number>, like atrium-03, or <project>:<todo> for a todo's",
    });
    return undefined;
  }

  const notFound = (reply: FastifyReply, key: string) =>
    fail(reply, 404, { code: "not_found", message: `no ticket ${key}; file a brief, then sync or PUT it` });

  /**
   * A todo's ticket in Backlog belongs to sync: it goes when the todo is
   * promoted, and anything written on it would go with it.
   */
  const syncOwned = (reply: FastifyReply, key: string, what: string) =>
    fail(reply, 400, {
      code: SYNC_OWNED,
      message: `${key} is a todo's ticket in Backlog, and only sync ${what}. Promote the todo to a brief instead: the next sync takes this ticket off and files the brief's in To Do.`,
    });

  app.get("/api/tickets/:key", async (request, reply) => {
    const key = keyOf(request.params, reply);
    if (!key) return reply;
    const ticket = store.getTicket(key);
    if (!ticket) return notFound(reply, key);
    const body: TicketDetailResponse = { ticket, comments: store.comments(key), history: store.history(key) };
    return body;
  });

  app.put("/api/tickets/:key", async (request, reply) => {
    const key = keyOf(request.params, reply);
    if (!key) return reply;
    const fields = parse(upsertTicketRequestSchema, request.body, reply);
    if (!fields) return reply;
    const brief = parseKey(key);
    if (!brief) return syncOwned(reply, key, "makes or changes it");
    const { project, number } = brief;
    const created = db.transaction(() => {
      const existing = store.getTicket(key);
      if (existing) {
        // Never the status: an upsert describes the ticket, a move changes it.
        store.updateTicket(key, {
          title: fields.title,
          summary: fields.summary,
          summarySource: "agent",
          briefPath: fields.briefPath,
        });
      } else {
        store.insertTicket({
          key,
          project,
          number,
          title: fields.title,
          summary: fields.summary,
          summarySource: "agent",
          briefPath: fields.briefPath,
          author: DEFAULT_AUTHOR,
          via: "move",
        });
      }
      store.setTags(key, project, fields.tags);
      return !existing;
    })();
    const body: UpsertTicketResponse = { created, ticket: store.getTicket(key)! };
    return reply.status(created ? 201 : 200).send(body);
  });

  app.post("/api/tickets/:key/moves", async (request, reply) => {
    const key = keyOf(request.params, reply);
    if (!key) return reply;
    const move = parse(moveRequestSchema, request.body, reply);
    if (!move) return reply;
    if (store.getTicket(key)?.status === "backlog") return syncOwned(reply, key, "moves it");
    const result = store.move(key, move.to, move.message, move.author ?? DEFAULT_AUTHOR);
    if (!result) return notFound(reply, key);
    if (!result.ok) {
      const ticket = store.getTicket(key)!;
      const from = STATUS_LABELS[ticket.status];
      const to = STATUS_LABELS[move.to];
      const rule = result.check.allowed.find((candidate) => candidate.to === move.to);
      return fail(reply, 400, {
        code: result.check.code,
        message:
          result.check.code === "message_required"
            ? `${from} → ${to} needs a message (${rule?.role.replace("_", " ") ?? "message"})`
            : `${key} cannot go from ${from} to ${to}`,
        allowed: result.check.allowed,
      });
    }
    const body: MoveResponse = { ticket: result.ticket, comment: result.comment };
    return body;
  });

  app.post("/api/tickets/:key/comments", async (request, reply) => {
    const key = keyOf(request.params, reply);
    if (!key) return reply;
    const fields = parse(commentRequestSchema, request.body, reply);
    if (!fields) return reply;
    const ticket = store.getTicket(key);
    if (!ticket) return notFound(reply, key);
    if (ticket.status === "backlog") return syncOwned(reply, key, "writes on it");
    const comment = store.addComment(key, {
      author: fields.author ?? DEFAULT_AUTHOR,
      body: fields.body,
      role: null,
      move: null,
    });
    const body: CommentResponse = { comment };
    return reply.status(201).send(body);
  });

  app.post("/api/sync", { bodyLimit: 10 * 1024 * 1024 }, async (request, reply) => {
    const payload = parse(syncRequestSchema, request.body, reply);
    if (!payload) return reply;
    const body: SyncResponse = runSync(store, payload);
    return body;
  });

  // The built board at `webBase`; any other path under it is the board too (index.html).
  const webDist = options.webDist;
  const serving = webDist !== undefined && existsSync(webDist);
  if (serving) {
    await app.register(fastifyStatic, { root: webDist, prefix: webBase });
  }
  if (webBase !== "/") app.get("/", async (_request, reply) => reply.redirect(webBase));
  app.setNotFoundHandler((request, reply) => {
    const path = pathOf(request.url);
    if (serving && request.method === "GET" && webBase !== "/" && path === webBase.slice(0, -1)) return reply.redirect(webBase);
    if (serving && (request.method === "GET" || request.method === "HEAD") && path.startsWith(webBase)) {
      return reply.sendFile("index.html");
    }
    return fail(reply, 404, { code: "not_found", message: `no route ${request.method} ${path}` });
  });

  return app;
}

