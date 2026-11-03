import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { UsageError } from "../errors.js";
import { briefSummary, briefTitle, cut, SUMMARY_MAX, todoIsOpen, todoStatus, todoTitle } from "./parse.js";
import { findProjects, projectsDir, readProjects, readTodos } from "./read.js";

const FIXTURES = fileURLToPath(new URL("../../test/fixtures/projects/", import.meta.url));
/**
 * Group folders: a flat project beside them, one a group folder down, an empty
 * group, a corpus inside a grouped repo and a repo in a plain folder (both at
 * depth three, each with a board-name), one too deep, one under a dot-directory.
 */
const GROUPED = fileURLToPath(new URL("../../test/fixtures/grouped/", import.meta.url));

describe("brief titles", () => {
  it("strips Task, Brief and Wave numbers before an em dash, a hyphen or a colon", () => {
    expect(briefTitle("# Task 72 — A compass that matches the world", "x")).toBe("A compass that matches the world");
    expect(briefTitle("# Brief 99 — Diff tool (Monaco's DiffEditor)", "x")).toBe("Diff tool (Monaco's DiffEditor)");
    expect(briefTitle("# Task 01: Workspace scaffold", "x")).toBe("Workspace scaffold");
    expect(briefTitle("# Wave 0 — Scaffold the v3 monorepo", "x")).toBe("Scaffold the v3 monorepo");
    expect(briefTitle("# 12 - Bare number", "x")).toBe("Bare number");
  });

  it("keeps a heading with no number as written", () => {
    expect(briefTitle("# Design Brief — Public Resource Map", "x")).toBe("Design Brief — Public Resource Map");
  });

  it("falls back to the slug in words without an H1", () => {
    expect(briefTitle("Status: draft\n\nText", "no-heading-here")).toBe("No heading here");
  });
});

describe("brief summaries", () => {
  it("takes the first paragraph under Context, links turned into text", () => {
    const md = "# Task 1 — T\n\n## Context\n\nOne [link](../x.md) and\na second line.\n\nNot this.";
    expect(briefSummary(md)).toBe("One link and a second line.");
  });

  it("reads a paragraph that starts right under the heading", () => {
    expect(briefSummary("# T\n## Context\nGreenfield.\n## Next")).toBe("Greenfield.");
  });

  it("falls back to Problem, then to the first paragraph after the H1 that is not Status:", () => {
    expect(briefSummary("# T\n\nStatus: x\n\n## Problem\n\nThe problem. ![img](a.png) here.")).toBe("The problem. img here.");
    expect(briefSummary("# T\n\nStatus: draft\n\nThe first real paragraph.")).toBe("The first real paragraph.");
    expect(briefSummary("Status: draft\n\nNo heading, just this.")).toBe("No heading, just this.");
  });

  it("cuts a long summary at a sentence end inside the limit", () => {
    const long = Array.from({ length: 40 }, (_, i) => `Sentence ${i} says one more thing.`).join(" ");
    const summary = cut(long);
    expect(summary.length).toBeLessThanOrEqual(SUMMARY_MAX);
    expect(summary.endsWith(".")).toBe(true);
  });
});

describe("reading the corpora", () => {
  const projects = readProjects(FIXTURES);

  it("finds only projects with corpus/briefs/, by directory name", () => {
    expect(projects.map((p) => p.project)).toEqual(["alpha", "beta"]);
  });

  it("reads every brief one level deep and skips everything else", () => {
    const alpha = projects.find((p) => p.project === "alpha")!;
    expect(alpha.briefs).toEqual([
      {
        number: 1,
        title: "A compass that matches the world",
        summary: "The compass points north while the world is rotated, so it lies. See the scene doc for the axes.",
        briefPath: "corpus/briefs/todo/01-em-dash-heading.md",
        state: "todo",
      },
      {
        number: 2,
        title: "Workspace scaffold",
        summary: "Greenfield. The repo holds only `corpus/`.",
        briefPath: "corpus/briefs/done/02-colon-heading.md",
        state: "done",
      },
      {
        number: 3,
        title: "Diff tool (Monaco's DiffEditor is already on the disk)",
        summary: "Comparing two files means opening both. diagram shows the flow.",
        briefPath: "corpus/briefs/superseded/03-brief-heading.md",
        state: "superseded",
      },
    ]);
    const beta = projects.find((p) => p.project === "beta")!;
    expect(beta.briefs.map((b) => [b.number, b.title, b.state])).toEqual([
      [7, "No heading here", "todo"],
      [10, "Scaffold the long one", "done"],
    ]);
    expect(beta.briefs[0]!.summary).toBe("Just a paragraph with no heading at all.");
    expect(beta.briefs[1]!.summary.length).toBeLessThanOrEqual(SUMMARY_MAX);
  });

  it("limits the run to one project", () => {
    expect(readProjects(FIXTURES, "beta").map((p) => p.project)).toEqual(["beta"]);
    expect(readProjects(FIXTURES, "gamma")).toEqual([]);
  });
});

describe("todos", () => {
  it("reads a status from frontmatter, from a plain line under the title, or not at all", () => {
    expect(todoStatus("---\ntitle: T\nstatus: open\n---\n\n# T\n")).toBe("open");
    expect(todoStatus("---\nstatus: 'dropped'\n---\n")).toBe("dropped");
    expect(todoStatus("# T\n\nstatus: done\n\nText.")).toBe("done");
    expect(todoStatus("# T\n\n**Status:** Promoted to brief 12\n")).toBe("promoted");
    expect(todoStatus("# T\n\nText that mentions a status: later.\n")).toBeNull();
    expect(todoStatus("Just prose.")).toBeNull();
  });

  it("is open unless dropped, closed, promoted or done", () => {
    for (const status of ["open", "parked", "grill-first"]) expect(todoIsOpen(`---\nstatus: ${status}\n---\n`)).toBe(true);
    for (const status of ["dropped", "closed", "promoted", "done"]) expect(todoIsOpen(`---\nstatus: ${status}\n---\n`)).toBe(false);
    expect(todoIsOpen("No status here.")).toBe(true);
  });

  it("titles a todo from frontmatter, else its H1, else its slug", () => {
    expect(todoTitle("---\ntitle: From frontmatter\n---\n\n# From the heading\n", "s")).toBe("From frontmatter");
    expect(todoTitle("# From the heading\n", "s")).toBe("From the heading");
    expect(todoTitle("Prose only.", "a-slug")).toBe("a-slug");
  });

  it("sends the open ones directly in corpus/todos/, and never a subfolder's", () => {
    expect(readTodos(join(FIXTURES, "alpha"))).toEqual([
      { slug: "no-status", title: "no-status", summary: "Just prose, no heading and no status.", path: "corpus/todos/no-status.md" },
      {
        slug: "plain-line-open",
        title: "A plain status line",
        summary: "The first paragraph after the status line.",
        path: "corpus/todos/plain-line-open.md",
      },
      {
        slug: "walls-step-2",
        title: "Walls meet at every step",
        summary: "A slug that ends in digits. Its ticket key must never read as a brief number.",
        path: "corpus/todos/walls-step-2.md",
      },
    ]);
  });

  it("finds none in a project with no corpus/todos/, and stops on a file name a key cannot hold", () => {
    expect(readProjects(FIXTURES, "beta")[0]!.todos).toEqual([]);
    const dir = mkdtempSync(join(tmpdir(), "brief-board-todos-"));
    try {
      mkdirSync(join(dir, "corpus", "todos"), { recursive: true });
      writeFileSync(join(dir, "corpus", "todos", "two words.md"), "# T\n");
      expect(() => readTodos(dir)).toThrow(UsageError);
      expect(() => readTodos(dir)).toThrow("two words.md");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("group folders", () => {
  it("finds a project directly under the projects directory, one a group folder down, and two at depth three", () => {
    expect(findProjects(GROUPED)).toEqual([
      { name: "epsilon", root: join(GROUPED, "apps", "epsilon") },
      { name: "inner-site", root: join(GROUPED, "websites", "sites-repo", "inner") },
      { name: "plain-theme", root: join(GROUPED, "websites", "plain", "theme") },
      { name: "sites-repo", root: join(GROUPED, "websites", "sites-repo") },
      { name: "solo", root: join(GROUPED, "solo") },
    ]);
  });

  it("files a corpus inside a project under its board-name, and the project keeps its own", () => {
    const [inner] = readProjects(GROUPED, "inner-site");
    expect(inner!.briefs.map((b) => [b.number, b.title, b.briefPath])).toEqual([
      [1, "A corpus inside a repo", "corpus/briefs/todo/01-inner.md"],
    ]);
    const [parent] = readProjects(GROUPED, "sites-repo");
    expect(parent!.briefs.map((b) => b.title)).toEqual(["The repo around a nested corpus"]);
    expect(readProjects(GROUPED, "inner")).toEqual([]);
  });

  it("files a repo in a plain folder under its board-name, not its folder's name", () => {
    expect(readProjects(GROUPED, "plain-theme").map((p) => p.briefs.map((b) => b.number))).toEqual([[2]]);
    expect(readProjects(GROUPED, "theme")).toEqual([]);
  });

  it("stops on a board-name a key cannot hold, naming the file", () => {
    const dir = mkdtempSync(join(tmpdir(), "brief-board-names-"));
    try {
      const root = join(dir, "websites", "site", "nested");
      mkdirSync(join(root, "corpus", "briefs", "todo"), { recursive: true });
      for (const bad of ["two words", "ends-with-", ""]) {
        writeFileSync(join(root, "corpus", "board-name"), `${bad}\n`);
        expect(() => readProjects(dir)).toThrow(UsageError);
        expect(() => readProjects(dir)).toThrow(join(root, "corpus", "board-name"));
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("names a grouped project by its own directory, not group/name", () => {
    const [epsilon] = readProjects(GROUPED, "epsilon");
    expect(epsilon!.project).toBe("epsilon");
    expect(epsilon!.briefs.map((b) => [b.number, b.title, b.briefPath])).toEqual([
      [4, "A project one group folder down", "corpus/briefs/todo/04-grouped.md"],
    ]);
  });

  it("finds nothing in a group folder with no project, nothing deeper, nothing under a dot-directory", () => {
    const names = findProjects(GROUPED).map((p) => p.name);
    for (const missing of ["websites", "notes", "zeta", "eta", "omega"]) expect(names).not.toContain(missing);
  });

  it("finds --project at either depth, and not one nested too deep", () => {
    expect(readProjects(GROUPED, "solo").map((p) => p.project)).toEqual(["solo"]);
    expect(readProjects(GROUPED, "epsilon").map((p) => p.project)).toEqual(["epsilon"]);
    expect(readProjects(GROUPED, "eta")).toEqual([]);
  });

  it("stops on two projects with one name, naming both paths", () => {
    const dir = mkdtempSync(join(tmpdir(), "brief-board-projects-"));
    try {
      for (const root of [join(dir, "apps", "twin"), join(dir, "games", "twin"), join(dir, "solo")]) {
        mkdirSync(join(root, "corpus", "briefs", "todo"), { recursive: true });
        writeFileSync(join(root, "corpus", "briefs", "todo", "01-a.md"), "# Task 01 — A\n");
      }
      expect(() => readProjects(dir)).toThrow(UsageError);
      expect(() => readProjects(dir)).toThrow(`${join(dir, "apps", "twin")} and ${join(dir, "games", "twin")}`);
      expect(() => readProjects(dir, "twin")).toThrow(UsageError);
      expect(readProjects(dir, "solo").map((p) => p.project)).toEqual(["solo"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("the projects directory", () => {
  it("is the environment's, else the user config's, else ~/projects", () => {
    const home = mkdtempSync(join(tmpdir(), "brief-board-home-"));
    try {
      expect(projectsDir({}, home)).toBe(join(home, "projects"));
      mkdirSync(join(home, ".config", "brief-board"), { recursive: true });
      writeFileSync(join(home, ".config", "brief-board", "env"), "BRIEF_BOARD_PROJECTS_DIR=~/code\n");
      expect(projectsDir({}, home)).toBe(join(home, "code"));
      expect(projectsDir({ BRIEF_BOARD_PROJECTS_DIR: "/srv/projects" }, home)).toBe("/srv/projects");
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });
});
