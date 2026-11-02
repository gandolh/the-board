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
import { openDatabase } from "./db.js";
import { Store } from "./store.js";
import { runSync } from "./sync.js";

/**
 * The brief-board API: the contract in `shared/src/api.ts` and
 * nothing beyond it. It runs on 127.0.0.1 with no sign-in; agents reach it
 * through the CLI, and the read-only board reads it.
 *
 * Paths: the API is `/api/*`. The browser reaches it at `/brief-board-api/api/*`;
 * Caddy strips that prefix in production, and this server strips it too
 * (`stripApiPrefix`), so the same build works behind Caddy and on its own.
 * The built board is served at `/brief-board/`, and `/` redirects there.
 */

/** Where the browser reaches the API (web/src/base.ts). */
export const API_PREFIX = "/brief-board-api";
/** Where the built board is served. */
export const BOARD_PATH = "/brief-board/";

/** A URL without a leading `/brief-board-api`, when `/`, `?` or the end follows it; any other URL as it is. */
export function stripApiPrefix(url: string): string {
  if (!url.startsWith(API_PREFIX)) return url;
  const rest = url.slice(API_PREFIX.length);
  if (rest === "") return "/";
  if (rest.startsWith("/")) return rest;
  if (rest.startsWith("?")) return `/${rest}`;
  return url;
}

export interface AppOptions {
  /** A file path, or `:memory:` for tests. */
  dbPath: string;
  /** The built board, served at `/brief-board/`; skipped when the directory does not exist. */
  webDist?: string;
  /**
   * The shared secret the CLI sends as `Authorization: Bearer <token>`. When
   * set, every `/api/*` request but `GET /api/health` needs it; unset, the
   * API is open, as on 127.0.0.1.
   */
  token?: string;
  /** The clock, for tests. */
  now?: () => Date;
  logger?: boolean;
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

/** The one API route anyone may call: vps-deploy's health check has no token. */
function isOpen(method: string, path: string): boolean {
  return path === "/api/health" && (method === "GET" || method === "HEAD");
}

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
  const app = Fastify({ logger: options.logger ?? false, rewriteUrl: (request) => stripApiPrefix(request.url ?? "/") });
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

  // The token guard. Fastify's default request log has the method and URL,
  // never the headers, so the token is not written anywhere.
  if (options.token) {
    const expected = digest(options.token);
    app.addHook("onRequest", async (request, reply) => {
      const path = request.url.split("?")[0]!;
      if (!path.startsWith("/api/") || isOpen(request.method, path)) return;
      if (bearerMatches(request.headers.authorization, expected)) return;
      return fail(reply, 401, { code: UNAUTHORIZED, message: "the board needs its token: send Authorization: Bearer <token>" });
    });
  }

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
    void fail(reply, 400, { code: "invalid_key", message: "a ticket key is <project>-<number>, like atrium-03" });
    return undefined;
  }

  const notFound = (reply: FastifyReply, key: string) =>
    fail(reply, 404, { code: "not_found", message: `no ticket ${key}; file a brief, then sync or PUT it` });

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
    const { project, number } = parseKey(key)!;
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
    if (!store.getTicket(key)) return notFound(reply, key);
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

  // The built board at `/brief-board/`; any other path under it is the board too (index.html).
  const webDist = options.webDist;
  const serving = webDist !== undefined && existsSync(webDist);
  if (serving) {
    await app.register(fastifyStatic, { root: webDist, prefix: BOARD_PATH });
  }
  app.get("/", async (_request, reply) => reply.redirect(BOARD_PATH));
  app.setNotFoundHandler((request, reply) => {
    const path = request.url.split("?")[0]!;
    if (serving && request.method === "GET" && path === BOARD_PATH.slice(0, -1)) return reply.redirect(BOARD_PATH);
    if (serving && (request.method === "GET" || request.method === "HEAD") && path.startsWith(BOARD_PATH)) {
      return reply.sendFile("index.html");
    }
    return fail(reply, 404, { code: "not_found", message: `no route ${request.method} ${path}` });
  });

  return app;
}

