import {
  commentRequestSchema,
  commentResponseSchema,
  moveRequestSchema,
  moveResponseSchema,
  NO_OPEN_RUN,
  parseKey,
  releaseRequestSchema,
  releaseResponseSchema,
  startRequestSchema,
  startResponseSchema,
  STATUS_LABELS,
  MAX_TAGS,
  tagsRequestSchema,
  tagsResponseSchema,
  ticketDetailResponseSchema,
  TOO_MANY_TAGS,
  ticketParamsSchema,
  upsertTicketRequestSchema,
  upsertTicketResponseSchema,
} from "@brief-board/shared";
import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import type { Store } from "../../db/store.js";
import type { Db } from "../../db.js";
import { ApiError, BAD_TICKET_KEY, notFound, refused, syncOwned } from "../../lib/api-error.js";
import { DEFAULT_AUTHOR } from "../../lib/author.js";

/** What this feature takes from the app's context. */
interface TicketOptions {
  db: Db;
  store: Store;
}

const config = { badParams: BAD_TICKET_KEY };

/** A ticket by its key: read it, file it, move it, start it, release it, tag it, comment on it. */
export const ticketRoutes: FastifyPluginAsyncZod<TicketOptions> = async (app, { db, store }) => {
  app.get(
    "/api/tickets/:key",
    { config, schema: { params: ticketParamsSchema, response: { 200: ticketDetailResponseSchema } } },
    (request) => {
      const { key } = request.params;
      const ticket = store.getTicket(key);
      if (!ticket) throw notFound(key);
      return {
        ticket,
        comments: store.comments(key),
        history: store.history(key),
        runs: store.runs(key),
        questions: store.questions(key),
        tagEvents: store.tagEvents(key),
      };
    },
  );

  app.put(
    "/api/tickets/:key",
    {
      config,
      schema: {
        params: ticketParamsSchema,
        body: upsertTicketRequestSchema,
        response: { 200: upsertTicketResponseSchema, 201: upsertTicketResponseSchema },
      },
    },
    (request, reply) => {
      const { key } = request.params;
      const fields = request.body;
      const brief = parseKey(key);
      if (!brief) throw syncOwned(key, "makes or changes it");
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
        // Left out, the tags stay: re-filing a ticket must not undo `tag`.
        if (fields.tags !== undefined) store.setTags(key, project, fields.tags);
        store.touchRun(key);
        return !existing;
      })();
      reply.code(created ? 201 : 200);
      return { created, ticket: store.requireTicket(key) };
    },
  );

  app.post(
    "/api/tickets/:key/moves",
    {
      config,
      schema: { params: ticketParamsSchema, body: moveRequestSchema, response: { 200: moveResponseSchema } },
    },
    (request) => {
      const { key } = request.params;
      const move = request.body;
      if (store.getTicket(key)?.status === "backlog") throw syncOwned(key, "moves it");
      const result = store.move(key, move.to, move.message, move.author ?? DEFAULT_AUTHOR, move.questions);
      if (!result) throw notFound(key);
      if (!result.ok) throw refused(key, store.requireTicket(key).status, move.to, result.check);
      return {
        ticket: result.ticket,
        comment: result.comment,
        questions: result.questions,
        endedRun: result.endedRun,
      };
    },
  );

  app.post(
    "/api/tickets/:key/start",
    {
      config,
      schema: { params: ticketParamsSchema, body: startRequestSchema, response: { 200: startResponseSchema } },
    },
    (request) => {
      const { key } = request.params;
      const fields = request.body;
      if (store.getTicket(key)?.status === "backlog") throw syncOwned(key, "moves it");
      const result = store.start(key, fields.message, fields.author ?? DEFAULT_AUTHOR, fields.questions);
      if (!result) throw notFound(key);
      if (!result.ok) throw refused(key, store.requireTicket(key).status, "in_progress", result.check);
      return {
        ticket: result.ticket,
        resumed: result.resumed,
        comment: result.comment,
        passedFrom: result.passedFrom,
        questions: result.questions,
      };
    },
  );

  app.post(
    "/api/tickets/:key/release",
    {
      config,
      schema: { params: ticketParamsSchema, body: releaseRequestSchema, response: { 200: releaseResponseSchema } },
    },
    (request) => {
      const { key } = request.params;
      const fields = request.body;
      const ticket = store.getTicket(key);
      if (!ticket) throw notFound(key);
      const result = store.release(key, fields.message, fields.author ?? DEFAULT_AUTHOR);
      if (!result) {
        throw new ApiError(400, {
          code: NO_OPEN_RUN,
          message: `${key} has no open run to release (it is ${STATUS_LABELS[ticket.status]})`,
        });
      }
      return result;
    },
  );

  app.post(
    "/api/tickets/:key/tags",
    {
      config,
      schema: { params: ticketParamsSchema, body: tagsRequestSchema, response: { 200: tagsResponseSchema } },
    },
    (request) => {
      const { key } = request.params;
      const fields = request.body;
      const ticket = store.getTicket(key);
      if (!ticket) throw notFound(key);
      if (ticket.status === "backlog") throw syncOwned(key, "changes its tags");
      const changed = db.transaction(() =>
        store.changeTags(key, ticket.project, {
          add: fields.add,
          remove: fields.remove,
          author: fields.author ?? DEFAULT_AUTHOR,
          max: MAX_TAGS,
        }),
      )();
      if (!changed) {
        throw new ApiError(400, {
          code: TOO_MANY_TAGS,
          message: `${key} would carry more than ${MAX_TAGS} tags; untag some first`,
        });
      }
      return { ticket: store.requireTicket(key), ...changed };
    },
  );

  app.post(
    "/api/tickets/:key/comments",
    {
      config,
      schema: { params: ticketParamsSchema, body: commentRequestSchema, response: { 201: commentResponseSchema } },
    },
    (request, reply) => {
      const { key } = request.params;
      const fields = request.body;
      const ticket = store.getTicket(key);
      if (!ticket) throw notFound(key);
      if (ticket.status === "backlog") throw syncOwned(key, "writes on it");
      const author = fields.author ?? DEFAULT_AUTHOR;
      const body = db.transaction(() => {
        store.touchRun(key);
        const comment = store.addComment(key, { author, body: fields.body, role: null, move: null });
        return { comment, questions: store.ask(key, fields.questions, author) };
      })();
      reply.code(201);
      return body;
    },
  );
};
