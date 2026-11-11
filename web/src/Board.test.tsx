import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { STATUSES, type Lane, type Run, type Ticket } from "@brief-board/shared";
import { Board, CELL_CARDS, cellTickets } from "./Board";
import { Card } from "./Card";
import { runEnding, runLine } from "./runs";

/** The board as markup: no DOM needed to see which column holds which card. */
const now = new Date("2026-11-03T12:00:00.000Z");
const ticket = (fields: Partial<Ticket>): Ticket => ({
  key: "p-01",
  project: "p",
  number: 1,
  title: "A brief",
  summary: "",
  summarySource: "sync",
  briefPath: "corpus/briefs/todo/01-a.md",
  tags: [],
  status: "todo",
  hidden: false,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
  statusChangedAt: now.toISOString(),
  run: null,
  openQuestions: 0,
  blockedBy: null,
  sprint: 2,
  ...fields,
});

describe("the board", () => {
  const lanes: Lane[] = [
    {
      project: "p",
      tickets: [
        ticket({
          key: "p:walls-step-2",
          number: null,
          title: "Walls meet",
          status: "backlog",
          briefPath: "corpus/todos/walls-step-2.md",
        }),
        ticket({}),
      ],
    },
  ];
  const html = renderToStaticMarkup(
    <Board lanes={lanes} now={now} toggled={new Set()} onToggle={() => {}} onOpen={() => {}} />,
  );

  it("puts Backlog first among the columns", () => {
    const heads = [...html.matchAll(/data-column="([a-z_]+)"/g)].map((match) => match[1]);
    expect(heads).toEqual([...STATUSES]);
    expect(heads[0]).toBe("backlog");
  });

  it("files a todo's card in Backlog, showing its slug, and the brief's in To Do", () => {
    const cell = (status: string, next: string) =>
      new RegExp(`data-cell="${status}"[^>]*>(.*?)data-cell="${next}"`, "s").exec(html)?.[1] ?? "";
    const backlog = cell("backlog", "todo");
    expect(backlog).toMatch(/>walls-step-2<\/span>/);
    expect(backlog).toContain("Walls meet");
    expect(backlog).not.toContain("p-01");
    expect(cell("todo", "in_progress")).toMatch(/>p-01<\/span>/);
  });
});

describe("a long cell", () => {
  const done = (n: number) =>
    Array.from({ length: n }, (_, i) => ticket({ key: `p-${i + 1}`, number: i + 1, status: "done" }));
  const html = (tickets: Ticket[]) =>
    renderToStaticMarkup(
      <Board lanes={[{ project: "p", tickets }]} now={now} toggled={new Set()} onToggle={() => {}} onOpen={() => {}} />,
    );

  it("scrolls past five cards, and only that cell", () => {
    expect(CELL_CARDS).toBe(5);
    const long = html([...done(6), ticket({ key: "p-07", number: 7, status: "todo" })]);
    expect(long).toMatch(/data-cell="done" data-long="true"/);
    expect(long).toMatch(/data-cell="todo"(?! data-long)/);
    expect(long.match(/data-long/g)).toHaveLength(1);
  });

  it("stays as tall as its cards at five or fewer", () => {
    expect(html(done(5))).not.toContain("data-long");
  });
});

describe("a card's run", () => {
  const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();
  const run = (fields: Partial<Run>): Run => ({
    id: 1,
    author: "ana",
    message: null,
    startedAt: minutesAgo(120),
    lastHeardAt: minutesAgo(20),
    stale: false,
    endedAt: null,
    ended: null,
    endedTo: null,
    ...fields,
  });
  const card = (fields: Partial<Ticket>) =>
    renderToStaticMarkup(<Card ticket={ticket({ status: "in_progress", ...fields })} now={now} onOpen={() => {}} />);

  it("shows who runs an In Progress ticket, how long it has been running, and when the board last heard", () => {
    expect(card({ run: run({}) })).toMatch(/>ana · running 2h · heard 20m ago<\/span>/);
    expect(card({ run: run({}) })).not.toContain("data-stale");
  });

  it("shows a stale run in the warning tone, at least start to last heard", () => {
    expect(card({ run: run({ stale: true, startedAt: minutesAgo(490), lastHeardAt: minutesAgo(300) }) })).toMatch(
      /data-stale="true"[^>]*>ana · stale run, heard 5h ago · ran ≥ 3h 10m<\/span>/,
    );
  });

  it("says an In Progress ticket has no run, including after its run ended", () => {
    expect(card({})).toMatch(/>no run<\/span>/);
    expect(card({ run: run({ endedAt: minutesAgo(5), ended: "released" }) })).toMatch(/>no run<\/span>/);
  });

  it("shows how long the last run took outside In Progress, and nothing where none ran", () => {
    expect(
      card({
        status: "ready_for_deploy",
        run: run({ endedAt: minutesAgo(40), ended: "moved", endedTo: "ready_for_deploy" }),
      }),
    ).toMatch(/>ana · took 1h 20m<\/span>/);
    expect(
      card({ status: "done", run: run({ lastHeardAt: minutesAgo(50), endedAt: minutesAgo(5), ended: "stale" }) }),
    ).toMatch(/>ana · took ≥ 1h 10m<\/span>/);
    expect(card({ status: "todo" })).not.toMatch(/took|running|no run/);
  });

  it("words a run started this minute, and each way a run ends", () => {
    expect(runLine(run({ startedAt: now.toISOString(), lastHeardAt: now.toISOString() }), now).text).toBe(
      "ana · running <1m · heard just now",
    );
    expect(runEnding(run({ ended: "moved", endedTo: "ready_for_test" }))).toBe("moved to Ready for test");
    expect(runEnding(run({ ended: "released" }))).toBe("released, unfinished");
    expect(runEnding(run({ ended: "stale" }))).toBe("stale; sync closed the ticket");
    expect(runEnding(run({ ended: "stale", endedTo: "backlog" }))).toBe("stale; sync put the ticket in Backlog");
  });
});

describe("a card's questions", () => {
  const card = (fields: Partial<Ticket>) =>
    renderToStaticMarkup(<Card ticket={ticket(fields)} now={now} onOpen={() => {}} />);

  it("counts open questions in a badge, in every column, Done included", () => {
    for (const status of STATUSES) {
      expect(card({ status, openQuestions: 2 })).toContain('title="2 questions for the owner">2 questions</span>');
    }
    expect(card({ status: "done", openQuestions: 1 })).toContain(">1 question</span>");
  });

  it("shows no badge when none are open", () => {
    expect(card({ openQuestions: 0 })).not.toContain("for the owner");
  });
});

describe("a blocked card", () => {
  const card = (fields: Partial<Ticket>) =>
    renderToStaticMarkup(<Card ticket={ticket(fields)} now={now} onOpen={() => {}} />);

  it("says what it waits on in a badge, with the whole condition in its title", () => {
    const html = card({ key: "p-14", number: 14, status: "backlog", blockedBy: "a stronger machine" });
    expect(html).toContain('title="Blocked by: a stronger machine">Blocked by: a stronger machine</span>');
    expect(card({})).not.toContain("Blocked by:");
  });

  it("comes after the other cards in Backlog", () => {
    const tickets = [
      ticket({ key: "p-14", number: 14, status: "backlog", blockedBy: "a stronger machine" }),
      ticket({ key: "p:a", number: null, status: "backlog" }),
      ticket({ key: "p:b", number: null, status: "backlog", blockedBy: "the home media machine" }),
      ticket({ key: "p:c", number: null, status: "backlog" }),
      ticket({ key: "p-01", status: "todo" }),
    ];
    expect(cellTickets(tickets, "backlog").map((t) => t.key)).toEqual(["p:a", "p:c", "p-14", "p:b"]);
    const html = renderToStaticMarkup(
      <Board lanes={[{ project: "p", tickets }]} now={now} toggled={new Set()} onToggle={() => {}} onOpen={() => {}} />,
    );
    const order = ["p:a", "p:c", "p-14", "p:b"].map((key) => html.indexOf(`aria-label="${key}:`));
    expect(order.every((at) => at >= 0)).toBe(true);
    expect([...order].sort((x, y) => x - y)).toEqual(order);
  });
});
