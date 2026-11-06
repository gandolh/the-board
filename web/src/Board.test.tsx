import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { STATUSES, type Lane, type Run, type Ticket } from "@brief-board/shared";
import { Board } from "./Board";
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
  ...fields,
});

describe("the board", () => {
  const lanes: Lane[] = [
    {
      project: "p",
      tickets: [
        ticket({ key: "p:walls-step-2", number: null, title: "Walls meet", status: "backlog", briefPath: "corpus/todos/walls-step-2.md" }),
        ticket({}),
      ],
    },
  ];
  const html = renderToStaticMarkup(<Board lanes={lanes} now={now} toggled={new Set()} onToggle={() => {}} onOpen={() => {}} />);

  it("puts Backlog first among the columns", () => {
    const heads = [...html.matchAll(/class="col-head col-([a-z_]+)"/g)].map((match) => match[1]);
    expect(heads).toEqual([...STATUSES]);
    expect(heads[0]).toBe("backlog");
  });

  it("files a todo's card in Backlog, showing its slug, and the brief's in To Do", () => {
    const cell = (status: string, next: string) =>
      new RegExp(`class="cell col-${status}">(.*?)</div><div class="cell col-${next}"`, "s").exec(html)?.[1] ?? "";
    const backlog = cell("backlog", "todo");
    expect(backlog).toContain('<span class="card-key">walls-step-2</span>');
    expect(backlog).toContain("Walls meet");
    expect(backlog).not.toContain("p-01");
    expect(cell("todo", "in_progress")).toContain('<span class="card-key">p-01</span>');
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
  const card = (fields: Partial<Ticket>) => renderToStaticMarkup(<Card ticket={ticket({ status: "in_progress", ...fields })} now={now} onOpen={() => {}} />);

  it("shows who runs an In Progress ticket, since when, and when the board last heard", () => {
    expect(card({ run: run({}) })).toContain('<span class="card-run">ana · started 2h ago · heard 20m ago</span>');
  });

  it("shows a stale run in the warning tone", () => {
    expect(card({ run: run({ stale: true, lastHeardAt: minutesAgo(300) }) })).toContain(
      '<span class="card-run card-run-stale">ana · stale run, heard 5h ago</span>',
    );
  });

  it("says an In Progress ticket has no run, including after its run ended", () => {
    expect(card({})).toContain('<span class="card-run">no run</span>');
    expect(card({ run: run({ endedAt: minutesAgo(5), ended: "released" }) })).toContain('<span class="card-run">no run</span>');
  });

  it("shows no run line outside In Progress", () => {
    expect(card({ status: "ready_for_deploy", run: run({ endedAt: minutesAgo(5), ended: "moved", endedTo: "ready_for_deploy" }) })).not.toContain(
      "card-run",
    );
  });

  it("words a run started this minute, and each way a run ends", () => {
    expect(runLine(run({ startedAt: now.toISOString(), lastHeardAt: now.toISOString() }), now).text).toBe(
      "ana · started just now · heard just now",
    );
    expect(runEnding(run({ ended: "moved", endedTo: "ready_for_test" }))).toBe("moved to Ready for test");
    expect(runEnding(run({ ended: "released" }))).toBe("released, unfinished");
    expect(runEnding(run({ ended: "stale" }))).toBe("stale; sync closed the ticket");
  });
});

describe("a card's questions", () => {
  const card = (fields: Partial<Ticket>) => renderToStaticMarkup(<Card ticket={ticket(fields)} now={now} onOpen={() => {}} />);

  it("counts open questions in a badge, in every column, Done included", () => {
    for (const status of STATUSES) {
      expect(card({ status, openQuestions: 2 })).toContain('<span class="badge-questions" title="2 questions for the owner">2 questions</span>');
    }
    expect(card({ status: "done", openQuestions: 1 })).toContain(">1 question</span>");
  });

  it("shows no badge when none are open", () => {
    expect(card({ openQuestions: 0 })).not.toContain("badge-questions");
  });
});
