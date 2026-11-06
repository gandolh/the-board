import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildApp } from "./app.js";
import { ConfigError, loadConfig, type Config } from "./config.js";

/**
 * Start the board: the API under `/api`, sign-in under `/auth`, and the
 * built board at `/brief-board/`, from one origin. Locally the owner runs it
 * with `npm start`; on the VPS it is the `brief-board-api` container.
 *
 * Settings come from the environment, and from the repo root's `.env` for
 * what the environment leaves unset (Ward's local seed writes its
 * `WARD_OIDC_*` values there). `config.ts` lists them and stops the start
 * with a message naming any that is wrong. The database is `BRIEF_BOARD_DB`,
 * or `data/brief-board.sqlite` under the repo root.
 */

/** `src/` (tsx in dev) and `dist/` (built) sit at the same depth, so these resolve the same from both. */
const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));

try {
  process.loadEnvFile(`${REPO_ROOT}.env`);
} catch (err) {
  if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
}

let config: Config;
try {
  config = loadConfig(process.env);
} catch (err) {
  if (!(err instanceof ConfigError)) throw err;
  console.error(`brief-board cannot start:\n${err.message}`);
  process.exit(1);
}

const dbPath = config.dbPath ? resolve(config.dbPath) : resolve(REPO_ROOT, "data/brief-board.sqlite");

const app = await buildApp({
  dbPath,
  webDist: resolve(REPO_ROOT, "web/dist"),
  token: config.token,
  publicOrigin: config.publicOrigin,
  apiPrefix: config.apiPrefix,
  webBase: config.webBase,
  ward: config.ward,
  trustedProxies: config.trustedProxies,
  staleHours: config.staleHours,
  logger: true,
});
app.log.info(`database: ${dbPath}`);
app.log.info(config.token ? "the CLI's token is set" : "no BRIEF_BOARD_TOKEN: the CLI is shut out, only a signed-in browser reads the board");
app.log.info(config.ward ? "Sign in with Ward is on" : "WARD_OIDC_ISSUER is not set: local accounts only, no Sign in with Ward");

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    app.close().then(
      () => process.exit(0),
      (err: unknown) => {
        app.log.error({ err }, `shutdown on ${signal} failed`);
        process.exit(1);
      },
    );
  });
}

try {
  await app.listen({ host: config.host, port: config.port });
} catch (err) {
  app.log.error({ err }, `brief-board cannot listen on ${config.host}:${config.port}`);
  process.exit(1);
}
