import { readFileSync } from "node:fs";
import { create } from "./commands/create.js";
import { guide } from "./commands/guide.js";
import { comment, move, start } from "./commands/moves.js";
import { list, show } from "./commands/read.js";
import { sync } from "./commands/sync.js";
import type { Context } from "./context.js";
import { Rejected, Unreachable, UsageError } from "./errors.js";
import { Runtime } from "./runtime.js";

/**
 * `brief-board`: how agents read and move tickets (brief 04). It runs inside
 * any project's repo with no setup there. Exit codes: 0 success, 1 a usage
 * mistake, 2 the board (or the local move check) refused, 3 the board is not
 * reachable, which an agent reports once and then works on without the board.
 */

const USAGE = `brief-board: track corpus briefs on the board.

  create <number> --title <t> --summary <s> [--tag <label>]... [--brief <path>]
  start <ticket> [-m <message>]       To Do or Blocked to In Progress; resumes one already In Progress
  move <ticket> <status> [-m <message>]
  comment <ticket> -m <message>
  show <ticket>
  list [--status <status>] [--all]
  sync                                 read every project's briefs into the board
  guide                                the rules for using the board

<ticket> is a key (atrium-83) or a brief number in this project (83).
Every command takes --project <name> (default: this git repo's directory name);
every write takes --author <name> (default: $BRIEF_BOARD_AUTHOR, else "agent").`;

type Command = (rt: Runtime, args: string[], packageRoot: URL) => Promise<void>;

const COMMANDS: Record<string, Command> = { create, start, move, comment, show, list, sync, guide };

/** Run one invocation and return its exit code. `packageRoot` is the cli package's directory. */
export async function main(argv: string[], ctx: Context, packageRoot: URL): Promise<number> {
  const [name, ...args] = argv;
  if (!name || name === "help" || name === "--help" || name === "-h") {
    ctx.out(USAGE);
    return name ? 0 : 1;
  }
  if (name === "--version" || name === "-v") {
    const pkg = JSON.parse(readFileSync(new URL("package.json", packageRoot), "utf8")) as { version: string };
    ctx.out(pkg.version);
    return 0;
  }
  const command = COMMANDS[name];
  if (!command) {
    ctx.err(`brief-board: unknown command "${name}". Run brief-board --help.`);
    return 1;
  }
  try {
    await command(new Runtime(ctx), args, packageRoot);
    return 0;
  } catch (err) {
    if (err instanceof Unreachable) {
      ctx.err(err.message);
      return err.exitCode;
    }
    if (err instanceof UsageError || err instanceof Rejected) {
      ctx.err(err instanceof UsageError ? `brief-board: ${err.message}` : err.message);
      return err.exitCode;
    }
    ctx.err(`brief-board: ${(err as Error).message}`);
    return 1;
  }
}
