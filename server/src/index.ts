import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildApp } from "./app.js";

/**
 * Start the board: the API under `/api` and the built board at `/`, from one
 * origin. The owner runs it by hand (`npm start`); nothing restarts it, and a
 * down board never stops agent work (decisions.md).
 *
 * `HOST` defaults to 127.0.0.1 and `PORT` to 8806. The database is
 * `BRIEF_BOARD_DB`, or `data/brief-board.sqlite` under the repo root.
 * `BRIEF_BOARD_TOKEN`, when set, is the token the CLI must send; empty counts
 * as unset, and one shorter than 32 characters stops the start, since it is
 * most likely a placeholder.
 */
const HOST = process.env.HOST ?? "127.0.0.1";
const PORT = Number(process.env.PORT ?? 8806);

/** `src/` (tsx in dev) and `dist/` (built) sit at the same depth, so these resolve the same from both. */
const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const dbPath = process.env.BRIEF_BOARD_DB ? resolve(process.env.BRIEF_BOARD_DB) : resolve(REPO_ROOT, "data/brief-board.sqlite");

/** The smallest token the server accepts: `openssl rand -base64 32` makes 44 characters. */
const MIN_TOKEN_LENGTH = 32;
const token = process.env.BRIEF_BOARD_TOKEN?.trim() || undefined;
if (token !== undefined && token.length < MIN_TOKEN_LENGTH) {
  console.error(
    `brief-board: BRIEF_BOARD_TOKEN is shorter than ${MIN_TOKEN_LENGTH} characters. Make one with \`openssl rand -base64 32\`, or leave it empty.`,
  );
  process.exit(1);
}

const app = await buildApp({ dbPath, webDist: resolve(REPO_ROOT, "web/dist"), token, logger: true });
app.log.info(`database: ${dbPath}`);
app.log.info(token ? "the API needs the CLI's token" : "no BRIEF_BOARD_TOKEN: the API is open");
await app.listen({ host: HOST, port: PORT });
