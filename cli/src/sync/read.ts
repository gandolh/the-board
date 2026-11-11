import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  BLOCKED_BY_NOT_GIVEN,
  BRIEF_STATES,
  TODO_SLUG,
  type SyncBrief,
  type SyncProject,
  type SyncTodo,
} from "@brief-board/shared";
import { readBoardName } from "../board-name.js";
import { UsageError } from "../errors.js";
import { blockedBy, briefSummary, briefTitle, todoIsOpen, todoSummary, todoTitle } from "./parse.js";

/**
 * Read every project's briefs. It only reads: a project is a directory with
 * a `corpus/briefs/` one, two or three levels under the projects directory
 * (`solo/`, `apps/atrium/`, `websites/presentation-sites/churchix/`), named by
 * its `corpus/board-name` when it has one and else by its own directory name,
 * never the group's, so its key matches the one `create` infers. Nothing
 * deeper is looked at. A brief is
 * `corpus/briefs/{todo,blocked,done,superseded}/<digits>-<slug>.md`, one level
 * deep. Anything else there (`.gitkeep`, a folder of templates, a
 * non-markdown file) is skipped.
 *
 * A todo is a `.md` file directly in `corpus/todos/` or in
 * `corpus/todos/blocked/`; every other subfolder, such as a `closed/` archive,
 * is never read. Only open ones are sent (`todoIsOpen`).
 *
 * A file in a `blocked/` folder carries what it waits on (`blockedBy` in
 * parse.ts). One that names nothing is still sent, as "not given", and
 * `warn` names the file.
 */

/** Where reading reports a file it sent anyway; the sync command prints these. */
export type Warn = (message: string) => void;
const quiet: Warn = () => {};

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
    env.BRIEF_BOARD_PROJECTS_DIR?.trim() ||
    readVar(join(home, ".config", "brief-board", "env"), "BRIEF_BOARD_PROJECTS_DIR");
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

/** The condition of a file in a `blocked/` folder, or "not given" with a warning naming it. */
function conditionOf(markdown: string, file: string, warn: Warn): string {
  const condition = blockedBy(markdown);
  if (condition !== null) return condition;
  warn(
    `${file}: in blocked/ but names no condition (a "**Blocked by:**" line under the title, or blocked-by: in the frontmatter); sent as "${BLOCKED_BY_NOT_GIVEN}"`,
  );
  return BLOCKED_BY_NOT_GIVEN;
}

/**
 * A project's open todos, by slug: those in `corpus/todos/`, then those in
 * `corpus/todos/blocked/`. A todo's file name is its ticket's key, so one the
 * key cannot hold, or a slug in both folders, stops the run, naming the files.
 */
export function readTodos(root: string, warn: Warn = quiet): SyncTodo[] {
  const dir = join(root, "corpus", "todos");
  if (!isDir(dir)) return [];
  const todos: SyncTodo[] = [];
  const files = new Map<string, string>();
  const read = (folder: string, prefix: string, blocked: boolean) => {
    if (!isDir(folder)) return;
    for (const name of readdirSync(folder).sort()) {
      const file = join(folder, name);
      if (!name.endsWith(".md") || !statSync(file).isFile()) continue;
      const slug = name.slice(0, -".md".length);
      if (!TODO_SLUG.test(slug)) {
        throw new UsageError(
          `${file}: a todo's file name becomes its ticket key; use letters, digits, dots, dashes and underscores only`,
        );
      }
      const twin = files.get(slug);
      if (twin !== undefined) {
        throw new UsageError(`${twin} and ${file}: one todo in two places; its ticket key is the slug, so keep one`);
      }
      files.set(slug, file);
      const markdown = readFileSync(file, "utf8");
      if (!todoIsOpen(markdown)) continue;
      todos.push({
        slug,
        title: todoTitle(markdown, slug),
        summary: todoSummary(markdown),
        path: `${prefix}${name}`,
        blockedBy: blocked ? conditionOf(markdown, file, warn) : null,
      });
    }
  };
  read(dir, "corpus/todos/", false);
  read(join(dir, "blocked"), "corpus/todos/blocked/", true);
  return todos;
}

/** One project's briefs, in number order within each state, and its open todos. */
export function readProject(root: string, project: string, warn: Warn = quiet): SyncProject {
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
        ...(state === "blocked" ? { blockedBy: conditionOf(markdown, join(dir, name), warn) } : {}),
      });
    }
  }
  return { project, briefs, todos: readTodos(root, warn) };
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
export function readProjects(dir: string, only?: string, warn: Warn = quiet): SyncProject[] {
  const roots = findProjects(dir).filter((project) => only === undefined || project.name === only);
  const seen = new Map<string, string>();
  for (const { name, root } of roots) {
    const first = seen.get(name);
    if (first !== undefined) {
      throw new UsageError(
        `two projects are named "${name}": ${first} and ${root}. Rename one, or give one a corpus/board-name; ticket keys come from the name.`,
      );
    }
    seen.set(name, root);
  }
  return roots.map(({ name, root }) => readProject(root, name, warn));
}
