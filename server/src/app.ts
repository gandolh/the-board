import { existsSync } from "node:fs";
import fastifyStatic from "@fastify/static";
import { serializerCompiler, validatorCompiler } from "@fastify/type-provider-zod";
import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import type { ErrorBody } from "@brief-board/shared";
import type { WardClientOptions } from "../vendor/ward/ward-auth.js";
import { DEFAULT_STALE_HOURS } from "./config.js";
import { openDatabase, type Db } from "./db.js";
import { Store } from "./db/store.js";
import { boardRoutes } from "./features/board/index.js";
import { healthRoutes } from "./features/health/index.js";
import { questionRoutes } from "./features/questions/index.js";
import { runRoutes } from "./features/runs/index.js";
import { sprintRoutes } from "./features/sprints/index.js";
import { syncRoutes } from "./features/sync/index.js";
import { ticketRoutes } from "./features/tickets/index.js";
import { openAccounts } from "./plugins/auth/accounts.js";
import { auth, pathOf } from "./plugins/auth/index.js";
import { errors } from "./plugins/errors.js";

/**
 * The brief-board API: the contract in `shared/src/api.ts` and nothing
 * beyond it, behind one guard (`plugins/auth`). Agents reach it through the
 * CLI with the shared token; the read-only board reads it with a signed-in
 * session.
 *
 * Paths: the API is `/api/*`, and sign-in is `/auth/*`. The browser reaches
 * them under `/brief-board-api`; Caddy strips that prefix in production, and
 * this server strips it too (`stripApiPrefix`), so the same build works behind
 * Caddy and on its own. The built board is served at `/brief-board/`, and `/`
 * redirects there.
 */

/** The API prefix as the browser sees it, unless `BRIEF_BOARD_API_PREFIX` moves it (web/src/base.ts). */
export const API_PREFIX = "/brief-board-api";
/** Where the built board is served, unless `BRIEF_BOARD_BASE` moves it. */
export const BOARD_PATH = "/brief-board/";

/** A URL without a leading API prefix, when `/`, `?` or the end follows it; any other URL as it is. */
export function stripApiPrefix(url: string, prefix: string = API_PREFIX): string {
  if (!url.startsWith(prefix)) return url;
  const rest = url.slice(prefix.length);
  if (rest === "") return "/";
  if (rest.startsWith("/")) return rest;
  if (rest.startsWith("?")) return `/${rest}`;
  return url;
}

/** Fastify's options that belong to the process. `server.ts` sets them; a test leaves them out. */
export type ServerOptions = Pick<
  FastifyServerOptions,
  "trustProxy" | "connectionTimeout" | "requestTimeout" | "keepAliveTimeout"
>;

export interface AppOptions {
  /** A file path, or `:memory:` for tests. */
  dbPath: string;
  /**
   * An open database to use instead of `dbPath`: a test that seeds accounts
   * opens it first. The app closes it with itself.
   */
  db?: Db;
  /** The built board, served at `webBase`; skipped when the directory does not exist. */
  webDist?: string;
  /**
   * The shared secret the CLI sends as `Authorization: Bearer <token>`. Unset,
   * the bearer path is closed, not open: only a signed-in browser gets in.
   */
  token?: string;
  /** The board's origin as the browser sees it. Default `http://localhost:5178`, the Vite dev server. */
  publicOrigin?: string;
  /** The API prefix as the browser sees it, and the session cookie's path. Default `/brief-board-api`. */
  apiPrefix?: string;
  /** The board's base path, with a trailing slash. Default `/brief-board/`. */
  webBase?: string;
  /** "Sign in with Ward". Unset, local accounts only. */
  ward?: WardClientOptions;
  /** Peers besides loopback whose `X-Forwarded-For` the login lockout believes. Default none. */
  trustedProxies?: readonly string[];
  /** Hours without a write on its ticket before a run reads as stale. Default 4. */
  staleHours?: number;
  /** The clock, for tests. */
  now?: () => Date;
  logger?: boolean;
  /** The process's timeouts and proxy trust, from `server.ts`. */
  server?: ServerOptions;
}

/** What every feature is handed, built once here and passed to each as its plugin options. */
interface FeatureContext {
  db: Db;
  store: Store;
}

/**
 * The app, ready and not listening. It registers in a fixed order: the error
 * handler, the zod compilers, the guard (before every route), then the
 * features, then the board's files, the redirect and the 404 handler.
 * Closing it closes the database.
 */
export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
  const db = options.db ?? openDatabase(options.dbPath);
  const store = new Store(db, options.now, (options.staleHours ?? DEFAULT_STALE_HOURS) * 60 * 60 * 1000);
  const apiPrefix = options.apiPrefix ?? API_PREFIX;
  const webBase = options.webBase ?? BOARD_PATH;
  const app = Fastify({
    ...options.server,
    logger: options.logger ?? false,
    rewriteUrl: (request) => stripApiPrefix(request.url ?? "/", apiPrefix),
  });
  app.addHook("onClose", async () => db.close());

  await app.register(errors);
  // Zod checks every request and encodes every reply, in every plugin registered below.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(auth, {
    accounts: openAccounts(db),
    token: options.token,
    publicOrigin: options.publicOrigin ?? "http://localhost:5178",
    apiPrefix,
    webBase,
    ward: options.ward,
    trustedProxies: options.trustedProxies ?? [],
  });

  const context: FeatureContext = { db, store };
  await app.register(healthRoutes);
  await app.register(boardRoutes, context);
  await app.register(runRoutes, context);
  await app.register(questionRoutes, context);
  await app.register(sprintRoutes, context);
  await app.register(ticketRoutes, context);
  await app.register(syncRoutes, context);

  // The built board at `webBase`; any other path under it is the board too (index.html).
  const webDist = options.webDist;
  const serving = webDist !== undefined && existsSync(webDist);
  if (serving) {
    await app.register(fastifyStatic, { root: webDist, prefix: webBase });
  }
  if (webBase !== "/") app.get("/", async (_request, reply) => reply.redirect(webBase));
  app.setNotFoundHandler((request, reply) => {
    const path = pathOf(request.url);
    if (serving && request.method === "GET" && webBase !== "/" && path === webBase.slice(0, -1))
      return reply.redirect(webBase);
    if (serving && (request.method === "GET" || request.method === "HEAD") && path.startsWith(webBase)) {
      return reply.sendFile("index.html");
    }
    return reply
      .status(404)
      .send({ code: "not_found", message: `no route ${request.method} ${path}` } satisfies ErrorBody);
  });

  return app;
}
