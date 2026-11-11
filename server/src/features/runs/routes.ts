import {
  dropResponseSchema,
  holdRequestSchema,
  holdResponseSchema,
  NOT_HELD,
  runsResponseSchema,
  ticketParamsSchema,
} from "@brief-board/shared";
import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import type { Store } from "../../db/store.js";
import { ApiError, BAD_TICKET_KEY, noRunToHold, notFound, syncOwned } from "../../lib/api-error.js";

/** What this feature takes from the app's context. */
interface RunOptions {
  store: Store;
}

/** The open runs, and what a run holds: ports, pids, containers and paths an agent started. */
export const runRoutes: FastifyPluginAsyncZod<RunOptions> = async (app, { store }) => {
  app.get("/api/runs", { schema: { response: { 200: runsResponseSchema } } }, () => ({ runs: store.openRuns() }));

  app.post(
    "/api/tickets/:key/hold",
    {
      config: { badParams: BAD_TICKET_KEY },
      schema: { params: ticketParamsSchema, body: holdRequestSchema, response: { 200: holdResponseSchema } },
    },
    (request) => {
      const { key } = request.params;
      const ticket = store.getTicket(key);
      if (!ticket) throw notFound(key);
      if (ticket.status === "backlog") throw syncOwned(key, "writes on it");
      const result = store.hold(key, request.body.kind, request.body.value);
      if (!result) throw noRunToHold(key, ticket.status);
      return result;
    },
  );

  app.post(
    "/api/tickets/:key/drop",
    {
      config: { badParams: BAD_TICKET_KEY },
      schema: { params: ticketParamsSchema, body: holdRequestSchema, response: { 200: dropResponseSchema } },
    },
    (request) => {
      const { key } = request.params;
      const { kind, value } = request.body;
      const ticket = store.getTicket(key);
      if (!ticket) throw notFound(key);
      if (ticket.status === "backlog") throw syncOwned(key, "writes on it");
      const result = store.drop(key, kind, value);
      if (!result.ok && result.reason === "no_open_run") throw noRunToHold(key, ticket.status);
      if (!result.ok) {
        const holds = result.holds.length
          ? `it holds ${result.holds.map((hold) => `${hold.kind} ${hold.value}`).join(", ")}`
          : "it holds nothing";
        throw new ApiError(400, { code: NOT_HELD, message: `${key}'s run holds no ${kind} ${value}; ${holds}` });
      }
      return { run: result.run };
    },
  );
};
