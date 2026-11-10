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

  it("says Backlog belongs to sync, holds todos and blocked briefs, and how each leaves", () => {
    expect(guide).toContain("Backlog belongs to sync. It holds open todos' tickets, keyed <project>:<slug>,");
    expect(guide).toContain("and blocked briefs' tickets: never start, move or comment on one.");
    expect(guide).toContain("the todo, or moving the brief back to briefs/todo/, takes it off.");
  });

  it("tells an agent to move a brief that waits on something outside it to blocked/, then release", () => {
    const blocking = guide.slice(guide.indexOf("## 4. Blocking"), guide.indexOf("## 5."));
    expect(blocking).toContain("That is for a step the owner takes.");
    expect(blocking).toContain('corpus/briefs/blocked/ with "**Blocked by:** <condition>" under its title');
    expect(blocking).toContain("todo goes to corpus/todos/blocked/ with blocked-by: in its frontmatter");
    expect(blocking).toContain('  brief-board release <ticket> -m "Blocked by: <condition>"');
    expect(blocking).toContain("The next sync puts the ticket in Backlog; `brief-board blocked` lists them all.");
    expect(blocking).toContain("When the condition is met, move the file back and delete the line.");
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

  it("says to hold what outlives a command and drop it when stopped, and that a release's holds are the leftovers", () => {
    const starting = guide.slice(guide.indexOf("## 3."), guide.indexOf("## 4."));
    expect(starting).toContain("Hold what you start that outlives a command, and drop it when you stop it:");
    expect(starting).toContain("brief-board hold|drop <ticket> port|pid|container|path <value>");
    const controller = guide.slice(guide.indexOf("## 7."), guide.indexOf("## 8."));
    expect(controller).toContain("Release prints what the run still held; stop those, or tell the owner.");
  });

  it("tells a session that runs agents to name them, check runs before a sync, and release a stopped agent's run", () => {
    const controller = guide.slice(guide.indexOf("## 7. Running other agents"), guide.indexOf("## 8."));
    expect(controller).toContain("Give each agent a name to pass as --author");
    expect(controller).toContain("Before a sync the owner asks for, run `brief-board runs`");
    expect(controller).toContain("first ask it to wind down");
    expect(controller).toContain('brief-board release <ticket> -m "<why, and what it left running: a port, a container>"');
    expect(controller).toContain("At a hand-back, show the owner `brief-board needs` first.");
  });

  it("asks for the report lines in the end move, and questions as --question", () => {
    const finishing = guide.slice(guide.indexOf("## 5. Finishing"), guide.indexOf("## 6."));
    for (const line of ["  Commits: ", "  Checks run: ", "  Checks skipped: ", "  Owner steps: "]) expect(finishing).toContain(line);
    expect(finishing).toContain("the full report goes in the brief's outcome note");
    expect(finishing).toContain('Ask each question for the owner with --question "<question>"');
    expect(finishing).toContain("never as prose in the message");
    const reportsBack = guide.slice(guide.indexOf("## 6."), guide.indexOf("## 7."));
    expect(reportsBack).toContain('brief-board answer <ticket> <n> -m "<the answer>"');
    const controller = guide.slice(guide.indexOf("## 7."), guide.indexOf("## 8."));
    expect(controller).toContain('-m "Tokens: <count>". Else leave it out.');
  });

  it("says not to start a sprint unless the owner asks, what a start does, and that the sprint reads only read", () => {
    const rules = guide.slice(guide.indexOf("## 9. Hard rules"), guide.indexOf("## 10."));
    expect(rules).toContain("- Don't run `brief-board sync` unless the owner asks.\n- Don't run `brief-board sprint start` unless the owner asks.");
    expect(rules).toContain(
      "It closes the\n  active sprint and moves every ticket that is not Done into the next one,\n  and nothing undoes it.",
    );
    const board = guide.slice(guide.indexOf("## 1."), guide.indexOf("## 2."));
    expect(board).toContain("A Done\nticket in a closed sprint is frozen: nothing writes to it.");
    expect(board).toContain("`brief-board sprint`\nand `brief-board list --sprint <n>` only read.");
  });

  it("stays short enough to read before every brief", () => {
    // 80 until runs, the section for a session that runs other agents, the report lines and holds;
    // 115 until blocked/ folders; 125 until sprints.
    expect(guide.split("\n").length).toBeLessThanOrEqual(130);
  });
});
