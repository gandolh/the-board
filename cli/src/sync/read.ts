import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { BRIEF_STATES, TODO_SLUG, type SyncBrief, type SyncProject, type SyncTodo } from "@brief-board/shared";
import { readBoardName } from "../board-name.js";
import { UsageError } from "../errors.js";
import { briefSummary, briefTitle, todoIsOpen, todoSummary, todoTitle } from "./parse.js";

/**
 * Read every project's briefs. It only reads: a project is a directory with
 * a `corpus/briefs/` one, two or three levels under the projects directory
 * (`solo/`, `apps/atrium/`, `websites/presentation-sites/churchix/`), named by
 * its `corpus/board-name` when it has one and else by its own directory name,
 * never the group's, so its key matches the one `create` infers. Nothing
 * deeper is looked at. A brief is
 * `corpus/briefs/{todo,done,superseded}/<digits>-<slug>.md`, one level deep.
 * Anything else there (`.gitkeep`, a folder of templates, a non-markdown
 * file) is skipped.
 *
 * A todo is a `.md` file directly in `corpus/todos/`; subfolders, such as a
 * `closed/` archive, are never read. Only open ones are sent (`todoIsOpen`).
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

/**
 * A project's open todos, by slug. A todo's file name is its ticket's key, so
 * one the key cannot hold stops the run, naming the file.
 */
export function readTodos(root: string): SyncTodo[] {
  const dir = join(root, "corpus", "todos");
  if (!isDir(dir)) return [];
  const todos: SyncTodo[] = [];
  for (const name of readdirSync(dir).sort()) {
    if (!name.endsWith(".md") || !statSync(join(dir, name)).isFile()) continue;
    const slug = name.slice(0, -".md".length);
    if (!TODO_SLUG.test(slug)) {
      throw new UsageError(`${join(dir, name)}: a todo's file name becomes its ticket key; use letters, digits, dots, dashes and underscores only`);
    }
    const markdown = readFileSync(join(dir, name), "utf8");
    if (!todoIsOpen(markdown)) continue;
    todos.push({ slug, title: todoTitle(markdown, slug), summary: todoSummary(markdown), path: `corpus/todos/${name}` });
  }
  return todos;
}

/** One project's briefs, in number order within each state, and its open todos. */
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
  return { project, briefs, todos: readTodos(root) };
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

/** How deep a project may sit: a repo in a folder in a group, or a corpus inside a grouped repo. */
const MAX_DEPTH = 3;

/**
 * Every project under `dir`, at depth one to three, alphabetical by name.
 * Discovery looks into every directory down to that depth, projects as well
 * as plain folders, so a corpus inside a repo (churchix in
 * presentation-sites) and a repo in a plain folder (the scoala-ramna theme)
 * are found, each beside the repo around it.
 */
export function findProjects(dir: string): ProjectRoot[] {
  const found: ProjectRoot[] = [];
  const walk = (path: string, depth: number): void => {
    for (const name of subdirs(path)) {
      const child = join(path, name);
      if (isProject(child)) found.push({ name: readBoardName(child) ?? name, root: child });
      if (depth < MAX_DEPTH) walk(child, depth + 1);
    }
  };
  walk(dir, 1);
  return found.sort((a, b) => byName(a.name, b.name) || byName(a.root, b.root));
}

/**
 * Every project under `dir` with its briefs, alphabetically, or just the one
 * named `only`, at any depth. Two projects sharing a name would share their
 * tickets' keys, so that stops the run before anything is read or sent.
 */
export function readProjects(dir: string, only?: string): SyncProject[] {
  const roots = findProjects(dir).filter((project) => only === undefined || project.name === only);
  const seen = new Map<string, string>();
  for (const { name, root } of roots) {
    const first = seen.get(name);
    if (first !== undefined) {
      throw new UsageError(`two projects are named "${name}": ${first} and ${root}. Rename one, or give one a corpus/board-name; ticket keys come from the name.`);
    }
    seen.set(name, root);
  }
  return roots.map(({ name, root }) => readProject(root, name));
}
