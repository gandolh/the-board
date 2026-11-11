import { parseArgs, type ParseArgsConfig } from "node:util";
import { formatKey, normalizeTicketKey, statusSchema, type Status } from "@brief-board/shared";
import { BoardClient } from "./client.js";
import { corpusRoot } from "./board-name.js";
import { boardToken, boardUrl, projectOf, repoRoot, type Context } from "./context.js";
import { UsageError } from "./errors.js";

/** Options every command takes. */
export const COMMON_OPTIONS = {
  project: { type: "string" },
  author: { type: "string" },
} as const satisfies ParseArgsConfig["options"];

/** What a command needs: arguments, the repo it runs in, and the board. */
export class Runtime {
  readonly root: string | null;
  private clientCache: BoardClient | undefined;

  readonly ctx: Context;

  constructor(ctx: Context) {
    this.ctx = ctx;
    this.root = repoRoot(ctx.cwd);
  }

  /** `parseArgs` with the common options added; a parse error is a usage error. */
  parse<O extends NonNullable<ParseArgsConfig["options"]>>(args: string[], options: O) {
    try {
      return parseArgs({ args, options: { ...COMMON_OPTIONS, ...options }, allowPositionals: true, strict: true });
    } catch (err) {
      throw new UsageError((err as Error).message);
    }
  }

  client(): BoardClient {
    this.clientCache ??= new BoardClient(boardUrl(this.ctx, this.root).url, boardToken(this.ctx));
    return this.clientCache;
  }

  /** The project tag, or a usage error outside a git repo without `--project`. */
  project(flag: string | undefined): string {
    const project = projectOf(this.ctx.cwd, this.root, flag);
    if (!project) throw new UsageError("not inside a git repo: pass --project <name>");
    return project;
  }

  /**
   * Where this command's corpus lives: the nearest directory with a
   * `corpus/` up to the git root (a nested corpus such as churchix), else the
   * git root; null outside a repo.
   */
  corpusDir(): string | null {
    return this.root === null ? null : corpusRoot(this.ctx.cwd, this.root);
  }

  /** `--author`, else `BRIEF_BOARD_AUTHOR`, else `agent`. */
  author(flag: string | undefined): string {
    return flag?.trim() || this.ctx.env.BRIEF_BOARD_AUTHOR?.trim() || "agent";
  }

  /** A full key (a brief's, or a todo's `<project>:<slug>`), or a bare number meaning this project. */
  ticketKey(arg: string | undefined, projectFlag: string | undefined): string {
    if (!arg) throw new UsageError("which ticket? Give a key (atrium-83) or a brief number (83)");
    if (/^\d+$/.test(arg)) return formatKey(this.project(projectFlag), Number.parseInt(arg, 10));
    const key = normalizeTicketKey(arg);
    if (!key) throw new UsageError(`"${arg}" is not a ticket key: use <project>-<number>, or the brief number alone`);
    return key;
  }

  out(line = ""): void {
    this.ctx.out(line);
  }
}

/** A status as an agent might type it: `ready_for_test`, `ready-for-test`, "Ready for test". */
export function statusArg(value: string | undefined): Status {
  if (!value) throw new UsageError("which status? One of: " + statusSchema.options.join(", "));
  const parsed = statusSchema.safeParse(
    value
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_"),
  );
  if (!parsed.success) throw new UsageError(`"${value}" is not a status. One of: ${statusSchema.options.join(", ")}`);
  return parsed.data;
}
