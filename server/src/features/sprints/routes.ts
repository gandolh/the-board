import {
  SPRINT_CHANGED,
  sprintDetailResponseSchema,
  sprintParamsSchema,
  sprintsResponseSchema,
  startSprintRequestSchema,
  startSprintResponseSchema,
} from "@brief-board/shared";
import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import type { Store } from "../../db/store.js";
import { ApiError, BAD_SPRINT } from "../../lib/api-error.js";

/** What this feature takes from the app's context. */
interface SprintOptions {
  store: Store;
}

/** The active sprint and the closed ones, one sprint's tickets, and starting the next. */
export const sprintRoutes: FastifyPluginAsyncZod<SprintOptions> = async (app, { store }) => {
  app.get("/api/sprints", { schema: { response: { 200: sprintsResponseSchema } } }, () => ({
    active: store.activeSprint(),
    closed: store.sprints().filter((sprint) => sprint.endedOn !== null),
  }));

  app.get(
    "/api/sprints/:number",
    {
      config: { badParams: BAD_SPRINT },
      schema: { params: sprintParamsSchema, response: { 200: sprintDetailResponseSchema } },
    },
    (request) => {
      const sprint = store.sprint(request.params.number);
      if (!sprint) {
        throw new ApiError(404, {
          code: "not_found",
          message: `no sprint ${request.params.number}; the active sprint is ${store.activeSprint().number}`,
        });
      }
      return { sprint, tickets: store.sprintTickets(sprint.number) };
    },
  );

  app.post(
    "/api/sprints",
    { schema: { body: startSprintRequestSchema, response: { 201: startSprintResponseSchema } } },
    (request, reply) => {
      const { number } = request.body;
      const result = store.startSprint(number, store.today());
      if (!result.ok) {
        const active = result.active.number;
        throw new ApiError(409, {
          code: SPRINT_CHANGED,
          message: `sprint ${active} is the active one, so the next is ${active + 1}, not ${number}; nothing changed`,
        });
      }
      reply.code(201);
      return { sprint: result.sprint, closed: result.closed, moved: result.moved };
    },
  );
};
