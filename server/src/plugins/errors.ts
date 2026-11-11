import type { ErrorBody } from "@brief-board/shared";
import { SPRINT_CLOSED } from "@brief-board/shared";
import { hasZodFastifySchemaValidationErrors, isResponseSerializationError } from "@fastify/type-provider-zod";
import type { FastifyError } from "fastify";
import fp from "fastify-plugin";
import { SprintClosedError } from "../db/store.js";
import { ApiError } from "../lib/api-error.js";

const INTERNAL: ErrorBody = { code: "internal", message: "the board hit an error; see its log" };

declare module "fastify" {
  interface FastifyContextConfig {
    /** What a route answers when its params fail validation; the default is the first issue's message under `invalid_request`. */
    badParams?: ErrorBody;
  }
}

/**
 * The one error handler, in the contract's flat body (`{ code, message, allowed? }`),
 * which the CLI and the board both parse. In order:
 * 1. a request the route's schemas refuse: 400, with the code by what failed;
 * 2. a refusal a handler threw (`ApiError`), and a write on a closed sprint's ticket;
 * 3. a 4xx Fastify raised itself (bad JSON, wrong content type, too large): its status;
 * 4. a reply that fails its response schema, and anything else: 500, logged, never shown.
 */
export const errors = fp(
  async (app) => {
    app.setErrorHandler((error: FastifyError | Error, request, reply) => {
      if (hasZodFastifySchemaValidationErrors(error)) {
        const params = error.validationContext === "params";
        const badParams = request.routeOptions.config.badParams;
        if (params && badParams) return reply.status(400).send(badParams);
        const issue = error.validation[0];
        const path = (issue?.instancePath ?? "").replace(/^\//, "").replaceAll("/", ".");
        const message = issue ? `${path || "request"}: ${issue.message}` : "invalid request";
        return reply.status(400).send({ code: "invalid_request", message } satisfies ErrorBody);
      }
      if (error instanceof ApiError) return reply.status(error.status).send(error.body);
      if (error instanceof SprintClosedError)
        return reply.status(409).send({ code: SPRINT_CLOSED, message: error.message } satisfies ErrorBody);
      if (isResponseSerializationError(error)) {
        // The cause's issues name fields of the reply, so only the route is logged.
        request.log.error({ method: request.method, url: request.url }, "a reply failed its response schema");
        return reply.status(500).send(INTERNAL);
      }
      const status = "statusCode" in error ? error.statusCode : undefined;
      if (status !== undefined && status >= 400 && status < 500)
        return reply.status(status).send({ code: "invalid_request", message: error.message } satisfies ErrorBody);
      request.log.error({ err: error }, "unhandled error");
      return reply.status(500).send(INTERNAL);
    });
  },
  { name: "errors" },
);
