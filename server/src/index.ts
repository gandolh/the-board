import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";

/**
 * The brief-board server: the API under `/api`, and the built board at `/`
 * from one origin. Placeholder until brief 03 adds storage and the routes.
 *
 * The owner starts it by hand (`npm start`). It listens on 127.0.0.1 only: the
 * board holds no secrets, but nothing outside this machine needs it until it
 * moves to the VPS behind a token.
 */
const HOST = process.env.HOST ?? "127.0.0.1";
const PORT = Number(process.env.PORT ?? 8806);

/** `web/dist`, the same distance from `src/` (tsx in dev) and `dist/` (built). */
const WEB_DIST = fileURLToPath(new URL("../../web/dist/", import.meta.url));

const app = Fastify({ logger: true });

app.get("/api/health", async () => ({ ok: true }));

if (existsSync(WEB_DIST)) {
  await app.register(fastifyStatic, { root: WEB_DIST });
} else {
  app.log.info(`no built board at ${WEB_DIST}; run "npm run build" to serve it here`);
}

await app.listen({ host: HOST, port: PORT });
