import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { boardToken, boardUrl, DEFAULT_BOARD_URL, type Context } from "./context.js";
import { main } from "./main.js";

/**
 * Every command against a real board: the server's `buildApp` on a random port.
 * It is imported by URL rather than by name so the CLI's TypeScript project
 * does not take in the server's sources; Vitest compiles it all the same.
 */
interface Server {
  listen(options: { host: string; port: number }): Promise<string>;
  close(): Promise<void>;
}
const serverApp = new URL("../../server/src/app.ts", import.meta.url).href;
const { buildApp } = (await import(serverApp)) as {
  buildApp: (o: { dbPath: string; token?: string; now?: () => Date }) => Promise<Server>;
};

const PACKAGE_ROOT = new URL("../", import.meta.url);

/** The test board's token: it is behind the same guard as the real one, so every command sends it. */
const TOKEN = "k".repeat(44);

let server: Server;
let url: string;
/** How far the board's clock is from the real one: a write made with it set back is that much older. */
let clockOffset = 0;
let scratch: string;
let repo: string;
let home: string;

beforeAll(async () => {
  server = await buildApp({ dbPath: ":memory:", token: TOKEN, now: () => new Date(Date.now() + clockOffset) });
  url = await server.listen({ host: "127.0.0.1", port: 0 });
});
afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), "brief-board-cli-"));
  // A project repo like any under ~/projects: the directory name is the project.
  repo = join(scratch, "sports-app");
  mkdirSync(join(repo, "corpus", "briefs", "todo"), { recursive: true });
  mkdirSync(join(repo, "corpus", "briefs", "done"), { recursive: true });
  writeFileSync(join(repo, "corpus", "briefs", "todo", "07-plan-a-run.md"), "# Task 07\n");
  writeFileSync(join(repo, "corpus", "briefs", "done", "03-old.md"), "# Task 03\n");
  execFileSync("git", ["init", "-q"], { cwd: repo });
  home = join(scratch, "home");
  mkdirSync(home);
  return () => rmSync(scratch, { recursive: true, force: true });
});

async function run(argv: string[], options: { env?: NodeJS.ProcessEnv; cwd?: string } = {}) {
  const out: string[] = [];
  const err: string[] = [];
  const ctx: Context = {
    env: options.env ?? { BRIEF_BOARD_URL: url, BRIEF_BOARD_TOKEN: TOKEN },
    cwd: options.cwd ?? repo,
    home,
    out: (line) => out.push(line),
    err: (line) => err.push(line),
  };
  const code = await main(argv, ctx, PACKAGE_ROOT);
  return { code, out: out.join("\n"), err: err.join("\n"), errLines: err.flatMap((l) => l.split("\n")) };
}

/** A unique brief number per test, since the board outlives each test. */
let next = 100;
async function ticket(): Promise<string> {
  const number = next++;
  writeFileSync(join(repo, "corpus", "briefs", "todo", `${number}-t.md`), "# T\n");
  const res = await run(["create", String(number), "--title", `Ticket ${number}`, "--summary", "s"]);
  expect(res.code).toBe(0);
  return `sports-app-${number}`;
}

describe("create", () => {
  it("finds the brief file and creates the ticket in the current project", async () => {
    const res = await run(["create", "7", "--title", "Plan a run", "--summary", "A first run", "--tag", "ui", "--tag", "api"]);
    expect(res).toMatchObject({ code: 0 });
    expect(res.out).toBe("Created sports-app-07 (To Do): Plan a run");
    const show = await run(["show", "7"]);
    expect(show.out).toContain("sports-app-07: Plan a run");
    expect(show.out).toContain("Brief:   corpus/briefs/todo/07-plan-a-run.md");
    expect(show.out).toContain("Tags:    api, ui");
  });

  it("finds a brief in done/ too, and refuses a number with no brief", async () => {
    expect((await run(["create", "3", "--title", "Old", "--summary", ""])).code).toBe(0);
    expect((await run(["show", "sports-app-3"])).out).toContain("corpus/briefs/done/03-old.md");
    const missing = await run(["create", "99", "--title", "Nope", "--summary", ""]);
    expect(missing.code).toBe(1);
    expect(missing.err).toContain("no brief numbered 99");
  });
});

describe("start, move and comment", () => {
  it("starts a To Do ticket, and a second start is a resume, not an error", async () => {
    const key = await ticket();
    expect((await run(["start", key])).out).toBe(`${key}: To Do → In Progress`);
    const resume = await run(["start", key]);
    expect(resume.code).toBe(0);
    expect(resume.out).toContain("resumed");
    const resumeWithNote = await run(["start", key, "-m", "Picking up the API half", "--author", "claude"]);
    expect(resumeWithNote.code).toBe(0);
    const show = (await run(["show", key])).out;
    expect(show).toContain("Resumed in a new session.");
    expect(show).toContain("claude (comment):");
    expect(show).toContain("Picking up the API half");
    expect(show).toMatch(/To Do → In Progress by agent/);
  });

  it("checks a move locally and prints what is allowed, without calling the board's move route", async () => {
    const key = await ticket();
    const tooEarly = await run(["move", key, "blocked", "-m", "why"]);
    expect(tooEarly.code).toBe(2);
    expect(tooEarly.errLines[0]).toBe(`${key} is To Do and cannot go to Blocked.`);
    expect(tooEarly.err).toContain("in_progress       In Progress: comment, optional");

    await run(["start", key]);
    const noReason = await run(["move", key, "blocked"]);
    expect(noReason.code).toBe(2);
    expect(noReason.err).toBe(`${key}: In Progress → Blocked needs a block reason. Pass it with -m "...".`);
    expect((await run(["show", key])).out).toContain("Status:  In Progress");

    const blocked = await run(["move", key, "Blocked", "-m", "The owner picks the colour"]);
    expect(blocked.out).toBe(`${key}: In Progress → Blocked`);
    const unblock = await run(["start", key]);
    expect(unblock.code).toBe(2);
    expect(unblock.err).toContain("needs a comment");
    expect((await run(["start", key, "-m", "Owner chose blue"])).code).toBe(0);
    expect((await run(["move", key, "ready-for-test", "-m", "Open /runs and plan one"])).code).toBe(0);
    expect((await run(["move", key, "done"])).out).toBe(`${key}: Ready for test → Done`);
    expect((await run(["move", key, "in_progress", "-m", "again"])).err).toContain("Nothing moves out of Done.");
  });

  it("adds a comment, and needs -m for it", async () => {
    const key = await ticket();
    expect((await run(["comment", key, "-m", "A note"])).code).toBe(0);
    expect((await run(["show", key])).out).toContain("A note");
    expect((await run(["comment", key])).code).toBe(1);
  });

  it("takes the author from BRIEF_BOARD_AUTHOR when --author is absent", async () => {
    const key = await ticket();
    await run(["start", key], { env: { BRIEF_BOARD_URL: url, BRIEF_BOARD_TOKEN: TOKEN, BRIEF_BOARD_AUTHOR: "night-shift" } });
    expect((await run(["show", key])).out).toMatch(/To Do → In Progress by night-shift/);
  });
});

describe("runs", () => {
  const HOUR = 60 * 60 * 1000;
  /** Run a command as if it happened `ms` ago on the board. */
  async function earlier<T>(ms: number, action: () => Promise<T>): Promise<T> {
    clockOffset = -ms;
    try {
      return await action();
    } finally {
      clockOffset = 0;
    }
  }

  it("start opens a run that show and list print, and a move ends it", async () => {
    const key = await ticket();
    expect((await run(["show", key])).out).toContain("Run:     no run");
    await earlier(2 * HOUR, () => run(["start", key, "--author", "ana"]));
    const show = (await run(["show", key])).out;
    expect(show).toContain("Run:     run by ana, started 2h ago, heard 2h ago, running 2h");
    expect(show).not.toContain("Earlier runs");
    expect((await run(["list", "--status", "in_progress"])).out).toContain(`Ticket ${key.split("-").pop()}  (run by ana)`);
    await run(["move", key, "ready_for_deploy", "-m", "npm run deploy", "--author", "ana"]);
    const after = (await run(["show", key])).out;
    expect(after).toContain("Run:     no run");
    expect(after).toMatch(/Earlier runs \(1\):\n {2}\[[^\]]+\] ana: moved to Ready for deploy, took 2h, ended /);
  });

  it("a second start passes the run on, and warns on stderr when it was fresh and someone else's", async () => {
    const key = await ticket();
    await earlier(HOUR, () => run(["start", key, "--author", "ana"]));
    const second = await run(["start", key, "--author", "bo"]);
    expect(second.code).toBe(0);
    expect(second.out).toBe(`${key}: resumed (already In Progress)`);
    expect(second.err).toBe(
      `brief-board: warning: ${key} had an open run by ana, heard 1h ago. It passes to bo; make sure ana has stopped.`,
    );
    const show = (await run(["show", key])).out;
    expect(show).toContain("Run:     run by bo");
    expect(show).toContain("The run passes from ana to bo.");
    // bo resuming its own run, and anyone taking over a stale one, warn about nothing.
    expect((await run(["start", key, "--author", "bo"])).err).toBe("");
    await earlier(5 * HOUR, () => run(["comment", key, "-m", "last word", "--author", "bo"]));
    expect((await run(["start", key, "--author", "cy"])).err).toBe("");
  });

  it("shows each run's duration: running, took, and at least start to last heard when stale", async () => {
    const key = await ticket();
    await earlier(6 * HOUR, () => run(["start", key, "--author", "ana"]));
    await earlier(5 * HOUR, () => run(["comment", key, "-m", "a first step", "--author", "ana"]));
    const stale = (await run(["show", key])).out;
    expect(stale).toContain("Run:     stale run by ana, started 6h ago, heard 5h ago, ran ≥ 1h");
    expect((await run(["runs"])).out.split("\n").find((line) => line.startsWith(key))).toMatch(/ ana +ran ≥ 1h +started 6h ago/);
    await run(["comment", key, "-m", "back", "--author", "ana"]);
    expect((await run(["show", key])).out).toContain("Run:     run by ana, started 6h ago, heard 0m ago, running 6h");
    await run(["move", key, "done", "--author", "ana"]);
    expect((await run(["show", key])).out).toMatch(/ana: moved to Done, took 6h, ended /);
  });

  it("marks a stale run in show and list", async () => {
    const key = await ticket();
    await earlier(5 * HOUR, () => run(["start", key, "--author", "ana"]));
    expect((await run(["show", key])).out).toContain("Run:     stale run by ana, started 5h ago, heard 5h ago, ran ≥ <1m");
    expect((await run(["list"])).out).toContain("(stale run by ana, heard 5h ago)");
  });

  it("release ends the run, keeps the ticket In Progress, and needs -m", async () => {
    const key = await ticket();
    await run(["start", key, "--author", "ana"]);
    expect((await run(["release", key])).code).toBe(1);
    const released = await run(["release", key, "-m", "Stopped; Vite left on 5173", "--author", "controller"]);
    expect(released.code).toBe(0);
    expect(released.out).toBe(`${key}: released the run by ana; the ticket stays In Progress`);
    const show = (await run(["show", key])).out;
    expect(show).toContain("Status:  In Progress");
    expect(show).toContain("Run:     no run");
    expect(show).toMatch(/ana: released, unfinished, took <1m, ended /);
    expect(show).toContain("Vite left on 5173");
    const again = await run(["release", key, "-m", "again"]);
    expect(again.code).toBe(2);
    expect(again.err).toContain("has no open run to release");
  });

  it("runs lists every open run, stalest first", async () => {
    const fresh = await ticket();
    const stale = await ticket();
    await run(["start", fresh, "--author", "ana"]);
    await earlier(6 * HOUR, () => run(["start", stale, "--author", "bo"]));
    const res = await run(["runs"]);
    expect(res.code).toBe(0);
    const lines = res.out.split("\n");
    const staleLine = lines.findIndex((line) => line.startsWith(stale));
    const freshLine = lines.findIndex((line) => line.startsWith(fresh));
    expect(staleLine).toBeGreaterThanOrEqual(0);
    expect(staleLine).toBeLessThan(freshLine);
    expect(lines[staleLine]).toMatch(/ bo +ran ≥ <1m +started 6h ago, heard 6h ago, stale$/);
    expect(lines[freshLine]).toMatch(/ ana +running <1m +started 0m ago, heard 0m ago$/);
    expect((await run(["runs", "--project", "nobody"])).out).toBe("No open runs in nobody.");
  });
});

describe("questions", () => {
  it("a move with two --question stores both, numbered, and show lists them", async () => {
    const key = await ticket();
    await run(["start", key]);
    const moved = await run(["move", key, "ready_for_deploy", "-m", "npm run deploy", "--question", "Tabs too?", "--question", "Keep the old parser?"]);
    expect(moved.code).toBe(0);
    expect(moved.out).toBe(`${key}: In Progress → Ready for deploy\n${key}: asked questions 1, 2`);
    const show = (await run(["show", key])).out;
    expect(show).toContain("Questions (2 open, 0 answered):");
    expect(show).toMatch(/#1 \[[^\]]+\] agent: Tabs too\?\n {4}open/);
  });

  it("answer closes one; a closed or unknown number is a usage mistake naming the open ones", async () => {
    const key = await ticket();
    await run(["start", key, "--question", "One?"]);
    expect((await run(["comment", key, "-m", "more", "--question", "Two?", "--question", "Three?"])).out).toBe(
      `${key}: comment added\n${key}: asked questions 2, 3`,
    );
    const answered = await run(["answer", key, "2", "-m", "Yes, both.", "--author", "owner"]);
    expect(answered.code).toBe(0);
    expect(answered.out).toBe(`${key}: question 2 answered`);
    const again = await run(["answer", key, "2", "-m", "again"]);
    expect(again.code).toBe(1);
    expect(again.err).toBe(`brief-board: ${key} has no open question 2; open: 1, 3`);
    expect((await run(["answer", key, "7", "-m", "x"])).err).toContain("no open question 7; open: 1, 3");
    expect((await run(["answer", key, "1"])).code).toBe(1);
    expect((await run(["answer", key, "first", "-m", "x"])).code).toBe(1);
    const show = (await run(["show", key])).out;
    expect(show).toContain("Questions (2 open, 1 answered):");
    // Open ones first, then the answered one with its answer.
    expect(show.indexOf("#3 [")).toBeLessThan(show.indexOf("#2 ["));
    expect(show).toMatch(/answered by owner \[[^\]]+\]: Yes, both\./);
    expect(show).toContain("Answered question 2: Two?");
  });

  it("questions lists open ones across projects, oldest first, and --project narrows it", async () => {
    const first = await ticket();
    await run(["start", first, "--question", "Asked first?"]);
    await run(["create", "1", "--title", "Elsewhere", "--summary", "", "--project", "quiz", "--brief", "corpus/briefs/todo/01-x.md"]);
    await run(["start", "quiz-01", "--question", "Asked second?"]);
    const all = (await run(["questions"])).out.split("\n");
    const a = all.findIndex((line) => line.includes("Asked first?"));
    const b = all.findIndex((line) => line.includes("Asked second?"));
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(b);
    expect(all[b]).toMatch(/^quiz-01 +#1 {3}agent, 0m ago: Asked second\?$/);
    expect((await run(["questions", "--project", "quiz"])).out.split("\n")).toEqual([all[b]]);
    expect((await run(["questions", "--project", "nobody"])).out).toBe("No open questions in nobody.");
  });
});

describe("list", () => {
  it("lists this project's tickets, every project's with --all, and filters on --status", async () => {
    const key = await ticket();
    await run(["start", key]);
    await run(["create", "1", "--title", "Elsewhere", "--summary", "", "--project", "trips", "--brief", "corpus/briefs/todo/01-x.md"]);
    const mine = (await run(["list"])).out;
    expect(mine).toContain(key);
    expect(mine).not.toContain("trips-01");
    expect((await run(["list", "--all"])).out).toContain("trips-01");
    const inProgress = (await run(["list", "--status", "in_progress"])).out;
    expect(inProgress).toContain(key);
    expect(inProgress).not.toContain("sports-app-07");
  });
});

describe("errors and exit codes", () => {
  it("exits 3 with exactly one line when nothing is listening", async () => {
    const port = await freePort();
    const dead = `http://127.0.0.1:${port}`;
    const res = await run(["list"], { env: { BRIEF_BOARD_URL: dead } });
    expect(res.code).toBe(3);
    expect(res.out).toBe("");
    expect(res.errLines).toEqual([`brief-board: the board isn't reachable at ${dead}. Tell the owner and carry on without it.`]);
  });

  it("exits 2 when the board refuses, and 1 for a usage mistake", async () => {
    expect((await run(["show", "sports-app-999"])).code).toBe(2);
    expect((await run(["frobnicate"])).code).toBe(1);
    expect((await run(["move", "7"])).code).toBe(1);
    expect((await run(["show", "not-a-key"])).code).toBe(1);
  });

  it("outside a git repo, a bare number needs --project", async () => {
    const outside = mkdtempSync(join(tmpdir(), "brief-board-nogit-"));
    try {
      const res = await run(["show", "7"], { cwd: outside });
      expect(res.code).toBe(1);
      expect(res.err).toContain("--project");
      expect((await run(["show", "7", "--project", "sports-app"], { cwd: outside })).code).toBe(0);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it("prints the version and the guide", async () => {
    expect((await run(["--version"])).out).toMatch(/^\d+\.\d+\.\d+$/);
    expect((await run(["guide"])).code).toBe(0);
  });
});

describe("a corpus nested in a repo", () => {
  /** A corpus one folder inside the repo, named in its board-name, like churchix in presentation-sites. */
  function nested(number: number): string {
    const dir = join(repo, "site");
    mkdirSync(join(dir, "corpus", "briefs", "todo"), { recursive: true });
    mkdirSync(join(dir, "src"), { recursive: true });
    writeFileSync(join(dir, "corpus", "board-name"), "nested-site\n");
    writeFileSync(join(dir, "corpus", "briefs", "todo", `${number}-nested.md`), `# Task ${number} — Nested\n`);
    return dir;
  }

  it("infers its board-name from anywhere inside it, and finds the brief in its own corpus", async () => {
    const number = next++;
    const dir = nested(number);
    const res = await run(["create", String(number), "--title", "Nested", "--summary", "S"], { cwd: join(dir, "src") });
    expect(res.out).toBe(`Created nested-site-${number} (To Do): Nested`);
    expect((await run(["show", `nested-site-${number}`])).out).toContain(`Brief:   corpus/briefs/todo/${number}-nested.md`);
  });

  it("is the git root's name outside the nested corpus, and --project wins over both", async () => {
    const number = next++;
    nested(number);
    writeFileSync(join(repo, "corpus", "briefs", "todo", `${number}-plain.md`), `# Task ${number}\n`);
    expect((await run(["create", String(number), "--title", "Plain", "--summary", "S"])).out).toBe(
      `Created sports-app-${number} (To Do): Plain`,
    );
    const flagged = await run(["create", String(number), "--project", "chosen", "--title", "Flag", "--summary", "S"], {
      cwd: join(repo, "site"),
    });
    expect(flagged.out).toBe(`Created chosen-${number} (To Do): Flag`);
  });

  it("refuses a board-name a key cannot hold", async () => {
    const dir = nested(next++);
    writeFileSync(join(dir, "corpus", "board-name"), "not a name\n");
    const res = await run(["show", "7"], { cwd: dir });
    expect(res.code).toBe(1);
    expect(res.err).toContain(join(dir, "corpus", "board-name"));
  });
});

describe("sync", () => {
  const fixtures = new URL("../test/fixtures/projects/", import.meta.url).pathname;
  const env = () => ({ BRIEF_BOARD_URL: url, BRIEF_BOARD_TOKEN: TOKEN, BRIEF_BOARD_PROJECTS_DIR: fixtures });

  it("--dry-run lists each project's briefs and sends nothing", async () => {
    const res = await run(["sync", "--dry-run"], { env: env() });
    expect(res.code).toBe(0);
    expect(res.out).toContain("alpha: 3 brief(s), 1 todo, 1 done, 1 superseded; in todo: 1; 3 open todo(s)");
    expect(res.out).toContain("beta: 2 brief(s), 1 todo, 1 done, 0 superseded; in todo: 7\n");
    expect(res.out).toContain("Todo tickets it would create: alpha:no-status, alpha:plain-line-open, alpha:walls-step-2");
    expect(res.out).toContain("Todo tickets it would remove: none");
    expect((await run(["show", "alpha-01"], { env: env() })).code).toBe(2);
  });

  it("sends every project in one request and prints the counts", async () => {
    const first = await run(["sync"], { env: env() });
    expect(first.code).toBe(0);
    expect(first.out).toBe(
      [
        "Synced 2 project(s), 5 brief(s): 2 created, 0 updated, 0 unchanged.",
        "Todo tickets, for 3 open todo(s): 3 created, 0 updated, 0 unchanged, 0 removed.",
      ].join("\n"),
    );
    expect((await run(["show", "alpha-01"], { env: env() })).out).toContain("A compass that matches the world");
    const again = await run(["sync", "--project", "alpha"], { env: env() });
    expect(again.out).toBe(
      [
        "Synced 1 project(s), 3 brief(s): 0 created, 0 updated, 1 unchanged.",
        "Todo tickets, for 3 open todo(s): 0 created, 0 updated, 3 unchanged, 0 removed.",
      ].join("\n"),
    );
  });

  it("shows a todo's ticket by its key, and refuses to move or comment on it", async () => {
    await run(["sync"], { env: env() });
    const shown = await run(["show", "alpha:walls-step-2"], { env: env() });
    expect(shown.out).toContain("alpha:walls-step-2: Walls meet at every step");
    expect(shown.out).toContain("Status:  Backlog");
    expect(shown.out).toContain("Todo:    corpus/todos/walls-step-2.md");
    const started = await run(["start", "alpha:walls-step-2"], { env: env() });
    expect(started.code).toBe(2);
    expect(started.err).toContain("Promote the todo to a brief instead");
    const commented = await run(["comment", "alpha:walls-step-2", "-m", "a note"], { env: env() });
    expect(commented.code).toBe(2);
    expect(commented.err).toContain("Promote the todo to a brief instead");
  });

  it("refuses an unknown --project, and exits 3 when the board is down", async () => {
    expect((await run(["sync", "--project", "gamma"], { env: env() })).code).toBe(1);
    const down = await run(["sync"], { env: { BRIEF_BOARD_URL: `http://127.0.0.1:${await freePort()}`, BRIEF_BOARD_PROJECTS_DIR: fixtures } });
    expect(down.code).toBe(3);
    expect(down.errLines).toHaveLength(1);
  });
});

describe("the board address", () => {
  const ctx = (env: NodeJS.ProcessEnv): Context => ({ env, cwd: repo, home, out: () => {}, err: () => {} });
  const userConfig = () => {
    mkdirSync(join(home, ".config", "brief-board"), { recursive: true });
    writeFileSync(join(home, ".config", "brief-board", "env"), "BRIEF_BOARD_URL=http://user.example:1\n");
  };

  it("checks the environment, the repo's .env, the user config, then the default, in that order", () => {
    expect(boardUrl(ctx({}), repo)).toEqual({ url: DEFAULT_BOARD_URL, source: "default" });
    userConfig();
    expect(boardUrl(ctx({}), repo)).toEqual({ url: "http://user.example:1", source: "user config" });
    writeFileSync(join(repo, ".env"), 'OTHER=1\nBRIEF_BOARD_URL="http://repo.example:2/"\n');
    expect(boardUrl(ctx({}), repo)).toEqual({ url: "http://repo.example:2", source: "repo .env" });
    expect(boardUrl(ctx({ BRIEF_BOARD_URL: "http://env.example:3" }), repo)).toEqual({
      url: "http://env.example:3",
      source: "environment",
    });
  });

  it("reaches the board through the repo's .env with nothing in the environment", async () => {
    writeFileSync(join(repo, ".env"), `BRIEF_BOARD_URL=${url}\n`);
    // The token is never a repo's: it comes from the user config.
    mkdirSync(join(home, ".config", "brief-board"), { recursive: true });
    writeFileSync(join(home, ".config", "brief-board", "env"), `BRIEF_BOARD_TOKEN=${TOKEN}\n`);
    expect((await run(["list", "--all"], { env: {} })).code).toBe(0);
  });
});

describe("the token", () => {
  const guardedUrl = () => url;
  const userFile = (line: string) => {
    mkdirSync(join(home, ".config", "brief-board"), { recursive: true });
    writeFileSync(join(home, ".config", "brief-board", "env"), `${line}\n`);
  };

  it("is sent when it comes from the environment", async () => {
    const res = await run(["list", "--all"], { env: { BRIEF_BOARD_URL: guardedUrl(), BRIEF_BOARD_TOKEN: TOKEN } });
    expect(res.code).toBe(0);
  });

  it("is sent when it comes from the user config", async () => {
    userFile(`BRIEF_BOARD_TOKEN="${TOKEN}"`);
    expect(boardToken({ env: {}, cwd: repo, home, out: () => {}, err: () => {} })).toBe(TOKEN);
    expect((await run(["list", "--all"], { env: { BRIEF_BOARD_URL: guardedUrl() } })).code).toBe(0);
  });

  it("is never read from a repo's .env", async () => {
    writeFileSync(join(repo, ".env"), `BRIEF_BOARD_URL=${guardedUrl()}\nBRIEF_BOARD_TOKEN=${TOKEN}\n`);
    expect(boardToken({ env: {}, cwd: repo, home, out: () => {}, err: () => {} })).toBeUndefined();
    const res = await run(["list", "--all"], { env: {} });
    expect(res.code).toBe(3);
  });

  it("refused, exits 3 with one line saying where to set it", async () => {
    for (const env of [{ BRIEF_BOARD_URL: guardedUrl() }, { BRIEF_BOARD_URL: guardedUrl(), BRIEF_BOARD_TOKEN: "w".repeat(44) }]) {
      const res = await run(["list", "--all"], { env });
      expect(res.code).toBe(3);
      expect(res.errLines).toHaveLength(1);
      expect(res.err).toContain("the board refused the token: set BRIEF_BOARD_TOKEN in ~/.config/brief-board/env");
    }
  });

  it("is refused by a board with no token configured, which lets no CLI in", async () => {
    const tokenless = await buildApp({ dbPath: ":memory:" });
    try {
      const tokenlessUrl = await tokenless.listen({ host: "127.0.0.1", port: 0 });
      const res = await run(["list", "--all"], { env: { BRIEF_BOARD_URL: tokenlessUrl, BRIEF_BOARD_TOKEN: TOKEN } });
      expect(res.code).toBe(3);
      expect(res.err).toContain("the board refused the token");
    } finally {
      await tokenless.close();
    }
  });
});

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : 0;
      probe.close(() => resolve(port));
    });
  });
}
