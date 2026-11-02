import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { fileURLToPath } from "node:url";
import { openAccounts, seedUser } from "./accounts.js";
import { openDatabase } from "./db.js";

/**
 * Creates one local user. There is no sign-up page: this is how the owner
 * gets an account. Anyone else gets in through "Sign in with Ward" once the
 * owner grants them brief-board there, or by running this again with their
 * name.
 *
 *     npm run seed -w @brief-board/server   (development, through tsx)
 *     node server/dist/seed.js              (built, from the repo root, as in the container)
 *
 * The username and password come from `SEED_USERNAME` and `SEED_PASSWORD` or,
 * for what is missing, a prompt on a terminal (the password is not echoed).
 * They are never read from a file in the repository; a local `.env` (which git
 * ignores) is read, as the server reads it. A user that already exists under
 * that name is left exactly as it is, password included, so it is safe to run
 * again. The database is `BRIEF_BOARD_DB`'s, as for the server.
 */

/** `src/` (tsx) and `dist/` (built) sit at the same depth, so this resolves the same from both. */
const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));

try {
  process.loadEnvFile(`${REPO_ROOT}.env`);
} catch (err) {
  if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
}

/**
 * The answer to `question`, with what is typed hidden when `secret`: readline
 * echoes through `output`, which goes quiet once the question is on screen.
 * Empty when there is no terminal to ask on.
 */
async function ask(question: string, secret = false): Promise<string> {
  if (!process.stdin.isTTY) return "";
  let muted = false;
  const output = new Writable({
    write(chunk: Buffer | string, encoding, done) {
      if (!muted) process.stdout.write(chunk, encoding);
      done();
    },
  });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  try {
    const answer = rl.question(question);
    muted = secret;
    // A password is taken as typed, spaces and all, as SEED_PASSWORD is.
    return secret ? await answer : (await answer).trim();
  } finally {
    rl.close();
    if (secret) process.stdout.write("\n");
  }
}

async function main(): Promise<void> {
  const username = process.env.SEED_USERNAME?.trim() || (await ask("Username: "));
  const password = process.env.SEED_PASSWORD || (await ask("Password: ", true));
  if (username === "" || password === "") {
    throw new Error("Set SEED_USERNAME and SEED_PASSWORD in the environment, or run this in a terminal to be asked.");
  }

  // The same rule as `index.ts`: BRIEF_BOARD_DB, else the repo's data/brief-board.sqlite.
  const configured = process.env.BRIEF_BOARD_DB?.trim();
  const db = openDatabase(configured ? resolve(configured) : resolve(REPO_ROOT, "data/brief-board.sqlite"));
  try {
    const created = await seedUser(openAccounts(db), { username, password });
    console.log(created ? `Created ${username}.` : `${username} already exists; left as it was.`);
  } finally {
    db.close();
  }
}

main().catch((err: unknown) => {
  // The library's policy errors say what is wrong ("…at least 8 characters"); nothing here echoes the password.
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
