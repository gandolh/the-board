import { healthResponseSchema } from "@brief-board/shared";
import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";

/** The deploy's check: open, with no token or session. */
export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/api/health", { schema: { response: { 200: healthResponseSchema } } }, () => ({ ok: true as const }));
};
