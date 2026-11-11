import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { formatKey, parseKey } from "@brief-board/shared";
import { UsageError } from "./errors.js";

/**
 * A corpus whose folder name isn't its name on the board says so in
 * `corpus/board-name`: one line, the name alone (decisions.md "A corpus nested
 * deeper names itself"). churchix, a corpus inside the presentation-sites
 * repo, and the scoala-ramna theme, a repo in a folder named `theme`, are the
 * two that need it. Sync and every command that infers the project read it.
 */
export const BOARD_NAME_FILE = join("corpus", "board-name");

/**
 * The project's name from `<dir>/corpus/board-name`, or null without one. The
 * name must be one a key can hold, or nothing could be filed under it, so a
 * bad one stops the command, naming the file.
 */
export function readBoardName(dir: string): string | null {
  const file = join(dir, BOARD_NAME_FILE);
  if (!existsSync(file)) return null;
  const name = readFileSync(file, "utf8").split(/\r?\n/)[0]!.trim();
  if (parseKey(formatKey(name, 1))?.project !== name) {
    throw new UsageError(
      `${file}: "${name}" is not a project name; use letters, digits, dots, dashes and underscores, ending in a letter, digit, dot or underscore`,
    );
  }
  return name;
}

function hasCorpus(dir: string): boolean {
  try {
    return statSync(join(dir, "corpus")).isDirectory();
  } catch {
    return false;
  }
}

/**
 * The directory whose `corpus/` a command in `cwd` belongs to: the nearest
 * one holding a `corpus/`, from `cwd` up to the git root. Without one, or
 * outside the repo, the git root itself.
 */
export function corpusRoot(cwd: string, root: string): string {
  if (relative(root, cwd).startsWith("..")) return root;
  for (let dir = cwd; ; dir = dirname(dir)) {
    if (hasCorpus(dir)) return dir;
    if (dir === root || dirname(dir) === dir) return root;
  }
}
