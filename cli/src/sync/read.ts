import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { BRIEF_STATES, type SyncBrief, type SyncProject } from "@brief-board/shared";
import { UsageError } from "../errors.js";
import { briefSummary, briefTitle } from "./parse.js";

/**
 * Read every project's briefs. It only reads: a project is a directory with
 * a `corpus/briefs/`, either directly under the projects directory or one
 * group folder down (`apps/`, `platform/`, ...), named by its own directory
 * name, never `group/name`, so its key matches the one `create` takes from
 * the git root. Nothing deeper is looked at. A brief is
 * `corpus/briefs/{todo,done,superseded}/<digits>-<slug>.md`, one level deep.
 * Anything else there (`.gitkeep`, a folder of templates, a non-markdown
 * file) is skipped.
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

/** A project's name and where it is. */
export interface ProjectRoot {
  name: string;
  root: string;
}

function isProject(path: string): boolean {
  return isDir(join(path, "corpus", "briefs"));
}

/** The directories worth looking in: no dot-directories, no `node_modules`. */
function subdirs(dir: string): string[] {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  return names.filter((name) => !name.startsWith(".") && name !== "node_modules" && isDir(join(dir, name)));
}

const byName = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base" });

/**
 * Every project under `dir`: a child with a `corpus/briefs/` is one;
 * any other child is a group folder, and each of its children with a
 * `corpus/briefs/` is one. Alphabetical by name.
 */
export function findProjects(dir: string): ProjectRoot[] {
  const found: ProjectRoot[] = [];
  for (const name of subdirs(dir)) {
    const path = join(dir, name);
    if (isProject(path)) {
      found.push({ name, root: path });
      continue;
    }
    for (const inner of subdirs(path)) {
      const innerPath = join(path, inner);
      if (isProject(innerPath)) found.push({ name: inner, root: innerPath });
    }
  }
  return found.sort((a, b) => byName(a.name, b.name) || byName(a.root, b.root));
}

/**
 * Every project under `dir` with its briefs, alphabetically, or just the one
 * named `only`, at either depth. Two projects sharing a name would share
 * their tickets' keys, so that stops the run before anything is read or sent.
 */
export function readProjects(dir: string, only?: string): SyncProject[] {
  const roots = findProjects(dir).filter((project) => only === undefined || project.name === only);
  const seen = new Map<string, string>();
  for (const { name, root } of roots) {
    const first = seen.get(name);
    if (first !== undefined) {
      throw new UsageError(`two projects are named "${name}": ${first} and ${root}. Rename one; ticket keys come from the directory name.`);
    }
    seen.set(name, root);
  }
  return roots.map(({ name, root }) => readProject(root, name));
}
