import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { UsageError } from "../errors.js";
import { briefSummary, briefTitle, cut, SUMMARY_MAX } from "./parse.js";
import { findProjects, projectsDir, readProjects } from "./read.js";

const FIXTURES = fileURLToPath(new URL("../../test/fixtures/projects/", import.meta.url));
/** Group folders: a flat project beside them, one a group folder down, an empty group, one too deep, one under a dot-directory. */
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

describe("group folders", () => {
  it("finds a project directly under the projects directory and one a group folder down", () => {
    expect(findProjects(GROUPED)).toEqual([
      { name: "epsilon", root: join(GROUPED, "apps", "epsilon") },
      { name: "solo", root: join(GROUPED, "solo") },
    ]);
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
