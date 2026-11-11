import { syncRequestSchema, syncResponseSchema } from "@brief-board/shared";
import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import type { Store } from "../../db/store.js";
import { runSync } from "./service.js";

/** What this feature takes from the app's context. */
interface SyncOptions {
  store: Store;
}

/** Sync: every project's briefs and todos from their corpora, in one request. */
export const syncRoutes: FastifyPluginAsyncZod<SyncOptions> = async (app, { store }) => {
  app.post(
    "/api/sync",
    {
      // Every project's briefs and todos in one body.
      bodyLimit: 10 * 1024 * 1024,
      schema: { body: syncRequestSchema, response: { 200: syncResponseSchema } },
    },
    (request) => runSync(store, request.body),
  );
};
