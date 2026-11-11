import {
  boardQuerySchema,
  boardResponseSchema,
  doneQuerySchema,
  doneResponseSchema,
  needsQuerySchema,
  needsResponseSchema,
} from "@brief-board/shared";
import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import type { Store } from "../../db/store.js";

/** What this feature takes from the app's context. */
interface BoardOptions {
  store: Store;
}

/** The lanes, the Done tickets past the board's window, and what needs the owner. */
export const boardRoutes: FastifyPluginAsyncZod<BoardOptions> = async (app, { store }) => {
  app.get(
    "/api/board",
    { schema: { querystring: boardQuerySchema, response: { 200: boardResponseSchema } } },
    (request) => {
      const { number, startedOn } = store.activeSprint();
      return { sprint: { number, startedOn }, lanes: store.board(request.query.doneDays, request.query.tag) };
    },
  );

  app.get(
    "/api/done",
    { schema: { querystring: doneQuerySchema, response: { 200: doneResponseSchema } } },
    (request) => ({
      tickets: store.olderDone(request.query.olderThanDays, request.query.tag),
    }),
  );

  app.get(
    "/api/needs",
    { schema: { querystring: needsQuerySchema, response: { 200: needsResponseSchema } } },
    (request) => ({
      needs: store.needs(request.query.project),
    }),
  );
};
