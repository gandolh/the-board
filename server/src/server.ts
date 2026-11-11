import closeWithGrace from "close-with-grace";
import { buildApp } from "./app.js";
import { ConfigError, loadConfig, loadEnvFile, resolveDbPath, WEB_DIST, type Config } from "./config.js";

/**
 * Start the board: the API under `/api`, sign-in under `/auth`, and the
 * built board at `/brief-board/`, from one origin. Locally the owner runs it
 * with `npm start`; on the VPS it is the `brief-board-api` container, which
 * starts this file. The only file that listens.
 *
 * Settings come from the environment, and from the repo root's `.env` for
 * what the environment leaves unset. `config.ts` lists them and stops the
 * start with a message naming any that is wrong. The database is
 * `BRIEF_BOARD_DB`, or `data/brief-board.sqlite` under the repo root.
 */

loadEnvFile();
let config: Config;
try {
  config = loadConfig();
} catch (err) {
  if (!(err instanceof ConfigError)) throw err;
  console.error(`brief-board cannot start:\n${err.message}`);
  process.exit(1);
}

const dbPath = resolveDbPath(config.dbPath);

const app = await buildApp({
  dbPath,
  webDist: WEB_DIST,
  token: config.token,
  publicOrigin: config.publicOrigin,
  apiPrefix: config.apiPrefix,
  webBase: config.webBase,
  ward: config.ward,
  trustedProxies: config.trustedProxies,
  staleHours: config.staleHours,
  logger: true,
  server: {
    // Loopback (Caddy on the host, a dev proxy) plus the configured peers, so `request.ip` in the log is the client.
    trustProxy: ["loopback", ...config.trustedProxies],
    // A socket silent this long mid-request is cut.
    connectionTimeout: 10_000,
    // The whole request must arrive within this; the longest is a sync, one transaction over every project.
    requestTimeout: 30_000,
    // Longer than Caddy keeps an idle upstream connection (two minutes), so it never reuses a socket closed under it.
    keepAliveTimeout: 125_000,
  },
});
app.log.info(`database: ${dbPath}`);
app.log.info(
  config.token
    ? "the CLI's token is set"
    : "no BRIEF_BOARD_TOKEN: the CLI is shut out, only a signed-in browser reads the board",
);
app.log.info(
  config.ward ? "Sign in with Ward is on" : "WARD_OIDC_ISSUER is not set: local accounts only, no Sign in with Ward",
);

// SIGINT, SIGTERM or an uncaught error: stop taking requests, finish the ones in flight, run
// every onClose hook (the database closes there), and exit. After 10 s it exits anyway.
closeWithGrace({ delay: 10_000, logger: app.log }, async ({ signal, err }) => {
  if (err) app.log.error({ err }, "closing after an uncaught error");
  else app.log.info(`closing on ${signal ?? "request"}`);
  await app.close();
});

try {
  await app.listen({ host: config.host, port: config.port });
} catch (err) {
  app.log.error({ err }, `brief-board cannot listen on ${config.host}:${config.port}`);
  process.exit(1);
}
