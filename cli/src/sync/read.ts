import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { BRIEF_STATES, type SyncBrief, type SyncProject } from "@brief-board/shared";
import { briefSummary, briefTitle } from "./parse.js";

/**
 * Read every project's briefs (brief 05). It only reads: a project is any
 * child of the projects directory with a `corpus/briefs/`, named by its
 * directory; a brief is `corpus/briefs/{todo,done,superseded}/<digits>-<slug>.md`,
 * one level deep. Anything else there (`.gitkeep`, a folder of templates, a
 * non-markdown file) is skipped.
 */

const BRIEF_FILE = /^(\d+)-(.+)\.md$/;

/** One variable from a dotenv-style file, if it is set there. */
function readVar(file: string, name: string): string | undefined {
  if (!existsSync(file)) return undefined;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=\\s*(.*?)\\s*$`).exec(line);
    const value = match?.[1]?.replace(/^(['"])(.*)\1$/, "$2").trim();
    if (value) return value;
  }
  return undefined;
}

/** `BRIEF_BOARD_PROJECTS_DIR` from the environment or `~/.config/brief-board/env`, else `~/projects`. */
export function projectsDir(env: NodeJS.ProcessEnv, home: string = homedir()): string {
  const configured =
    env.BRIEF_BOARD_PROJECTS_DIR?.trim() || readVar(join(home, ".config", "brief-board", "env"), "BRIEF_BOARD_PROJECTS_DIR");
  const dir = configured ?? join(home, "projects");
  return dir.startsWith("~/") ? join(home, dir.slice(2)) : dir;
}

function isDir(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/** One project's briefs, in number order within each state. */
export function readProject(root: string, project: string): SyncProject {
  const briefs: SyncBrief[] = [];
  for (const state of BRIEF_STATES) {
    const dir = join(root, "corpus", "briefs", state);
    if (!isDir(dir)) continue;
    for (const name of readdirSync(dir).sort()) {
      const match = BRIEF_FILE.exec(name);
      if (!match || !statSync(join(dir, name)).isFile()) continue;
      const markdown = readFileSync(join(dir, name), "utf8");
      briefs.push({
        number: Number.parseInt(match[1]!, 10),
        title: briefTitle(markdown, match[2]!),
        summary: briefSummary(markdown),
        briefPath: `corpus/briefs/${state}/${name}`,
        state,
      });
    }
  }
  return { project, briefs };
}

/** Every project under `dir` that has a `corpus/briefs/`, alphabetically, or just `only`. */
export function readProjects(dir: string, only?: string): SyncProject[] {
  const names = only ? [only] : readdirSync(dir).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  return names
    .filter((name) => isDir(join(dir, name, "corpus", "briefs")))
    .map((name) => readProject(join(dir, name), name));
}
