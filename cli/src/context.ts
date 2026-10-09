import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

/**
 * Where the CLI is running and which board it talks to (brief 04). Agents call
 * it from inside some other project's repo, which holds no setting for it: the
 * project is the git root's directory name, and the address comes from the
 * environment, that repo's `.env`, or the user-level config.
 */

export const DEFAULT_BOARD_URL = "http://127.0.0.1:8806";

export interface Context {
  env: NodeJS.ProcessEnv;
  cwd: string;
  /** The user's home directory, for `~/.config/brief-board/env`. */
  home: string;
  out: (line: string) => void;
  err: (line: string) => void;
}

/** The repo root, or null outside a git repo. */
export function repoRoot(cwd: string): string | null {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

/** The one variable from a dotenv-style file, if it is there. Nothing else in the file is read. */
export function readBoardUrlFrom(file: string): string | undefined {
  if (!existsSync(file)) return undefined;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?BRIEF_BOARD_URL\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) continue;
    const value = match[1]!.replace(/^(['"])(.*)\1$/, "$2").trim();
    if (value) return value;
  }
  return undefined;
}

export type BoardUrlSource = "environment" | "repo .env" | "user config" | "default";

/**
 * The board's address, first found wins: `BRIEF_BOARD_URL` in the
 * environment, in this repo's `.env`, in `~/.config/brief-board/env`, then
 * the local default.
 */
export function boardUrl(ctx: Context, root: string | null): { url: string; source: BoardUrlSource } {
  const trim = (url: string) => url.replace(/\/+$/, "");
  const fromEnv = ctx.env.BRIEF_BOARD_URL?.trim();
  if (fromEnv) return { url: trim(fromEnv), source: "environment" };
  const fromRepo = root ? readBoardUrlFrom(join(root, ".env")) : undefined;
  if (fromRepo) return { url: trim(fromRepo), source: "repo .env" };
  const fromUser = readBoardUrlFrom(join(ctx.home, ".config", "brief-board", "env"));
  if (fromUser) return { url: trim(fromUser), source: "user config" };
  return { url: DEFAULT_BOARD_URL, source: "default" };
}

/** The project tag: `--project`, or the git root's directory name. */
export function projectOf(root: string | null, flag: string | undefined): string | null {
  if (flag) return flag;
  return root ? basename(root) : null;
}
