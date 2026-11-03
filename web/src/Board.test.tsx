import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { STATUSES, type Lane, type Ticket } from "@brief-board/shared";
import { Board } from "./Board";

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
