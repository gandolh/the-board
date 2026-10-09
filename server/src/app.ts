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
 * The brief-board API (brief 03): the contract in `shared/src/api.ts` and
 * nothing beyond it. It runs on 127.0.0.1 with no sign-in; agents reach it
 * through the CLI, and the read-only board reads it.
 */

export interface AppOptions {
  /** A file path, or `:memory:` for tests. */
  dbPath: string;
  /** The built board, served at `/`; skipped when the directory does not exist. */
  webDist?: string;
  /** The clock, for tests. */
  now?: () => Date;
  logger?: boolean;
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
  const app = Fastify({ logger: options.logger ?? false });
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

  // The built board at `/`; any other non-API path is the board too (index.html).
  const webDist = options.webDist;
  if (webDist && existsSync(webDist)) {
    await app.register(fastifyStatic, { root: webDist });
  }
  app.setNotFoundHandler((request, reply) => {
    if (!request.url.startsWith("/api/") && webDist && existsSync(webDist)) {
      return reply.sendFile("index.html");
    }
    return fail(reply, 404, { code: "not_found", message: `no route ${request.method} ${request.url.split("?")[0]}` });
  });

  return app;
}

