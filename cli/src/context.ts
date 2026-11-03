import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { corpusRoot, readBoardName } from "./board-name.js";

/**
 * Where the CLI is running and which board it talks to. Agents call
 * it from inside some other project's repo, which holds no setting for it: the
 * project is the git root's directory name (or its corpus's `board-name`), the address comes from the
 * environment, that repo's `.env`, or the user-level config, and the token
 * from the environment or the user-level config only.
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

/** One variable from a dotenv-style file, if it is set there. Nothing else in the file is read. */
function readVarFrom(file: string, name: "BRIEF_BOARD_URL" | "BRIEF_BOARD_TOKEN"): string | undefined {
  if (!existsSync(file)) return undefined;
  const pattern = new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=\\s*(.*?)\\s*$`);
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = pattern.exec(line);
    if (!match) continue;
    const value = match[1]!.replace(/^(['"])(.*)\1$/, "$2").trim();
    if (value) return value;
  }
  return undefined;
}

/** `BRIEF_BOARD_URL` from a dotenv-style file, if it is there. */
export function readBoardUrlFrom(file: string): string | undefined {
  return readVarFrom(file, "BRIEF_BOARD_URL");
}

/** The user-level config the owner keeps for the CLI. */
function userConfig(ctx: Context): string {
  return join(ctx.home, ".config", "brief-board", "env");
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
  const fromUser = readBoardUrlFrom(userConfig(ctx));
  if (fromUser) return { url: trim(fromUser), source: "user config" };
  return { url: DEFAULT_BOARD_URL, source: "default" };
}

/**
 * The token the board wants, if any: `BRIEF_BOARD_TOKEN` in the environment,
 * else in `~/.config/brief-board/env`. Never a repo's `.env`: the address may
 * live there, but a secret shouldn't sit in every repo.
 */
export function boardToken(ctx: Context): string | undefined {
  return ctx.env.BRIEF_BOARD_TOKEN?.trim() || readVarFrom(userConfig(ctx), "BRIEF_BOARD_TOKEN");
}

/**
 * The project tag: `--project`; else the `board-name` of the nearest corpus
 * from `cwd` up to the git root; else the git root's directory name.
 */
export function projectOf(cwd: string, root: string | null, flag: string | undefined): string | null {
  if (flag) return flag;
  if (!root) return null;
  return readBoardName(corpusRoot(cwd, root)) ?? basename(root);
}
