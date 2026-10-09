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
 */
const HOST = process.env.HOST ?? "127.0.0.1";
const PORT = Number(process.env.PORT ?? 8806);

/** `src/` (tsx in dev) and `dist/` (built) sit at the same depth, so these resolve the same from both. */
const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const dbPath = process.env.BRIEF_BOARD_DB ? resolve(process.env.BRIEF_BOARD_DB) : resolve(REPO_ROOT, "data/brief-board.sqlite");

const app = await buildApp({ dbPath, webDist: resolve(REPO_ROOT, "web/dist"), logger: true });
app.log.info(`database: ${dbPath}`);
await app.listen({ host: HOST, port: PORT });
