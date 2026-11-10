import { readFileSync } from "node:fs";
import { blocked } from "./commands/blocked.js";
import { create } from "./commands/create.js";
import { guide } from "./commands/guide.js";
import { drop, hold } from "./commands/holds.js";
import { comment, move, start } from "./commands/moves.js";
import { needs } from "./commands/needs.js";
import { answer, questions } from "./commands/questions.js";
import { list, show } from "./commands/read.js";
import { release, runs } from "./commands/runs.js";
import { sprint } from "./commands/sprint.js";
import { sync } from "./commands/sync.js";
import { TokenRefused } from "./client.js";
import type { Context } from "./context.js";
import { Rejected, Unreachable, UsageError } from "./errors.js";
import { Runtime } from "./runtime.js";

/**
 * `brief-board`: how agents read and move tickets. It runs inside
 * any project's repo with no setup there. Exit codes: 0 success, 1 a usage
 * mistake, 2 the board (or the local move check) refused, 3 the board is not
 * reachable or refused the token, which an agent reports once and then works
 * on without the board.
 */

const USAGE = `brief-board: track corpus briefs on the board.

  create <number> --title <t> --summary <s> [--tag <label>]... [--brief <path>]
  start <ticket> [-m <message>]       To Do or Blocked to In Progress, opening a run; resumes one already In Progress
  move <ticket> <status> [-m <message>]
  comment <ticket> -m <message>
  release <ticket> -m <message>       end the run of an agent that was stopped; the ticket stays In Progress
  hold <ticket> <kind> <value>        the open run holds a port, pid, container or path it started
  drop <ticket> <kind> <value>        the open run no longer holds it
  answer <ticket> <n> -m <answer>     record the owner's answer to question n
  show <ticket>
  list [--status <status>] [--all] [--sprint <n>]
                                       the active sprint's, or sprint n's with --sprint
  runs                                 every open run across projects, stalest first, with what each holds
  questions                            every open question across projects, oldest first
  needs                                everything waiting on the owner: questions, Blocked, stale runs, to test, to deploy
  blocked                              every brief and todo in a blocked/ folder, grouped by what it waits on
  sync                                 read every project's briefs into the board
  sprint                               the active sprint: its number, start and ticket count
  sprint start <n>                     close the active sprint and start sprint n (the owner's call only)
  guide                                the rules for using the board

<ticket> is a key (atrium-83) or a brief number in this project (83).
Every command takes --project <name> (default: this git repo's directory name);
every write takes --author <name> (default: $BRIEF_BOARD_AUTHOR, else "agent");
start, move and comment take --question "<question for the owner>", once per question.`;

type Command = (rt: Runtime, args: string[], packageRoot: URL) => Promise<void>;

const COMMANDS: Record<string, Command> = {
  create,
  start,
  move,
  comment,
  release,
  hold,
  drop,
  answer,
  show,
  list,
  runs,
  questions,
  needs,
  blocked,
  sync,
  sprint,
  guide,
};

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
    if (err instanceof Unreachable || err instanceof TokenRefused) {
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
