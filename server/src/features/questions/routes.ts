import {
  answerRequestSchema,
  answerResponseSchema,
  QUESTION_NOT_OPEN,
  questionParamsSchema,
  questionsQuerySchema,
  questionsResponseSchema,
} from "@brief-board/shared";
import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import type { Store } from "../../db/store.js";
import { ApiError, BAD_QUESTION_PATH, notFound } from "../../lib/api-error.js";
import { DEFAULT_AUTHOR } from "../../lib/author.js";

/** What this feature takes from the app's context. */
interface QuestionOptions {
  store: Store;
}

/** The questions for the owner: the open ones across the board, and an answer to one. */
export const questionRoutes: FastifyPluginAsyncZod<QuestionOptions> = async (app, { store }) => {
  app.get(
    "/api/questions",
    { schema: { querystring: questionsQuerySchema, response: { 200: questionsResponseSchema } } },
    (request) => ({ questions: store.openQuestions(request.query.project) }),
  );

  app.post(
    "/api/tickets/:key/questions/:number/answer",
    {
      config: { badParams: BAD_QUESTION_PATH },
      schema: { params: questionParamsSchema, body: answerRequestSchema, response: { 200: answerResponseSchema } },
    },
    (request) => {
      const { key, number } = request.params;
      if (!store.getTicket(key)) throw notFound(key);
      const result = store.answer(key, number, request.body.answer, request.body.author ?? DEFAULT_AUTHOR);
      if (!result.ok) {
        const open = result.open.length ? `open: ${result.open.join(", ")}` : "it has no open questions";
        throw new ApiError(400, {
          code: QUESTION_NOT_OPEN,
          message: `${key} has no open question ${number}; ${open}`,
        });
      }
      return { ticket: result.ticket, question: result.question, comment: result.comment };
    },
  );
};
