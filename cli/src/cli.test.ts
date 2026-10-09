import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { boardUrl, DEFAULT_BOARD_URL, type Context } from "./context.js";
import { main } from "./main.js";

/**
 * Every command against a real board: brief 03's `buildApp` on a random port.
 * It is imported by URL rather than by name so the CLI's TypeScript project
 * does not take in the server's sources; Vitest compiles it all the same.
 */
interface Server {
  listen(options: { host: string; port: number }): Promise<string>;
  close(): Promise<void>;
}
const serverApp = new URL("../../server/src/app.ts", import.meta.url).href;
const { buildApp } = (await import(serverApp)) as { buildApp: (o: { dbPath: string }) => Promise<Server> };

const PACKAGE_ROOT = new URL("../", import.meta.url);

let server: Server;
let url: string;
let scratch: string;
let repo: string;
let home: string;

beforeAll(async () => {
  server = await buildApp({ dbPath: ":memory:" });
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
    env: options.env ?? { BRIEF_BOARD_URL: url },
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
    await run(["start", key], { env: { BRIEF_BOARD_URL: url, BRIEF_BOARD_AUTHOR: "night-shift" } });
    expect((await run(["show", key])).out).toMatch(/To Do → In Progress by night-shift/);
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

  it("prints the version, the placeholder guide, and says sync is not built yet", async () => {
    expect((await run(["--version"])).out).toMatch(/^\d+\.\d+\.\d+$/);
    expect((await run(["guide"])).code).toBe(0);
    const sync = await run(["sync"]);
    expect(sync.code).toBe(1);
    expect(sync.err).toContain("not implemented yet");
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
    expect((await run(["list", "--all"], { env: {} })).code).toBe(0);
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
