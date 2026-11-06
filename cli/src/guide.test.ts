import { describe, expect, it } from "vitest";
import { MOVES } from "@brief-board/shared";
import { renderGuide } from "./commands/guide.js";

const guide = renderGuide(new URL("../", import.meta.url));

describe("the guide", () => {
  it("lists every move in shared's table, with its message rule", () => {
    for (const rule of MOVES) {
      expect(guide).toMatch(new RegExp(`${rule.from} -> ${rule.to}\\s+[a-z ]+, ${rule.message}`));
    }
    expect(guide).not.toContain("{{moves}}");
  });

  it("covers every topic the brief names", () => {
    for (const topic of [
      "## 1. What the board is",
      "## 2. Filing a brief",
      "## 3. Starting or resuming",
      "## 4. Blocking",
      "## 5. Finishing",
      "## 6. When the owner reports back",
      "## 7. Running other agents",
      "## 8. When the board is down",
      "## 9. Hard rules",
      "## 10. The moves",
    ]) {
      expect(guide).toContain(topic);
    }
  });

  it("says Backlog belongs to sync, and promoting the todo is the way out", () => {
    expect(guide).toContain("Open todos have tickets in Backlog, keyed <project>:<slug>, owned by sync:");
    expect(guide).toContain("never move or comment on one. Promoting the todo to a brief takes it off.");
  });

  it("says where a corpus whose folder name isn't its board name puts the name", () => {
    expect(guide).toContain("A corpus whose folder name isn't\nits board name puts the name alone in corpus/board-name.");
  });

  it("puts the end move before the brief goes to done/, and says why", () => {
    const finishing = guide.slice(guide.indexOf("## 5. Finishing"), guide.indexOf("## 6."));
    expect(finishing).toContain("Make the end move before you move the brief to done/ and before the commit\nthat moves it");
    expect(finishing).toContain("a sync in between closes the ticket under you");
  });

  it("says start opens a run, what keeps it fresh, and how to run a dev server", () => {
    const starting = guide.slice(guide.indexOf("## 3."), guide.indexOf("## 4."));
    expect(starting).toContain("Start opens a run");
    expect(starting).toContain("after 4 hours with none it reads as stale");
    expect(starting).toContain("never with & or nohup");
    expect(starting).toContain("Stop\nwhat you started before your end move.");
  });

  it("tells a session that runs agents to name them, check runs before a sync, and release a stopped agent's run", () => {
    const controller = guide.slice(guide.indexOf("## 7. Running other agents"), guide.indexOf("## 8."));
    expect(controller).toContain("Give each agent a name to pass as --author");
    expect(controller).toContain("Before a sync the owner asks for, run `brief-board runs`");
    expect(controller).toContain("first ask it to wind down");
    expect(controller).toContain('brief-board release <ticket> -m "<why, and what it left running>"');
  });

  it("stays short enough to read before every brief", () => {
    // 80 until runs and the section for a session that runs other agents.
    expect(guide.split("\n").length).toBeLessThanOrEqual(100);
  });
});
