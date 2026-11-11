import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Sprint, Ticket } from "@brief-board/shared";
import { SprintList, SprintTickets, sprintDates } from "./SprintsPage";
import { SprintName } from "./TopBar";

const sprint = (number: number, startedOn: string, endedOn: string | null, doneCount = 0): Sprint => ({
  number,
  startedOn,
  endedOn,
  doneCount,
});
const ticket = (fields: Partial<Ticket>): Ticket => ({
  key: "p-01",
  project: "p",
  number: 1,
  title: "A brief",
  summary: "",
  summarySource: "sync",
  briefPath: "corpus/briefs/done/01-a.md",
  tags: [],
  status: "done",
  hidden: false,
  createdAt: "2026-10-01T09:00:00.000Z",
  updatedAt: "2026-10-20T09:00:00.000Z",
  statusChangedAt: "2026-10-20T09:00:00.000Z",
  run: null,
  openQuestions: 0,
  blockedBy: null,
  sprint: 1,
  ...fields,
});

/** No control that could write: no form, no field, no select. */
const writeControls = /<(form|input|textarea|select)\b/;

describe("the header", () => {
  it("names the active sprint and the day it started, as stored", () => {
    const html = renderToStaticMarkup(<SprintName sprint={{ number: 2, startedOn: "2026-11-10" }} />);
    expect(html).toContain('<time dateTime="2026-11-10">2026-11-10</time>');
    expect(html.replace(/<[^>]+>/g, "")).toBe("Sprint 2 · since 2026-11-10");
  });
});

describe("the Sprints page", () => {
  const list = (closed: Sprint[], toggled: ReadonlySet<number> = new Set()) =>
    renderToStaticMarkup(<SprintList closed={closed} toggled={toggled} onToggle={() => {}} onOpen={() => {}} />);
  const closed = [
    sprint(1, "2026-11-10", "2026-11-10"),
    sprint(3, "2026-11-24", "2026-12-08", 4),
    sprint(2, "2026-11-10", "2026-11-24", 7),
  ];

  it("lists the closed sprints newest first, each a heading with its dates and Done count", () => {
    const html = list(closed);
    const sections = [...html.matchAll(/<section[^>]*aria-label="Sprint (\d+)"/g)].map((match) => match[1]);
    expect(sections).toEqual(["3", "2", "1"]);
    expect(html).toMatch(
      /<h3[^>]*><button[^>]*>.*Sprint 3<\/span><span[^>]*>2026-11-24 to 2026-12-08<\/span><span[^>]*>4 Done<\/span><\/button><\/h3>/,
    );
    expect(sprintDates(closed[2]!)).toBe("2026-11-10 to 2026-11-24");
  });

  it("opens the newest, which loads its tickets, and lets the owner open an empty one that says so", () => {
    expect(list(closed)).toContain("Loading…");
    const html = list(closed, new Set([3, 1]));
    expect(html).not.toContain("Loading…");
    expect(html).toMatch(/<p[^>]*>No Done tickets\.<\/p>/);
  });

  it("says so when no sprint has closed", () => {
    expect(list([])).toMatch(/^<p[^>]*>No sprint has closed yet\.<\/p>$/);
  });

  it("lists a sprint's Done tickets by project, as older Done does, and an empty one says so", () => {
    expect(renderToStaticMarkup(<SprintTickets tickets={[]} onOpen={() => {}} />)).toMatch(
      /^<p[^>]*>No Done tickets\.<\/p>$/,
    );
    const html = renderToStaticMarkup(
      <SprintTickets
        tickets={[
          ticket({ key: "alpha-07", project: "alpha", title: "Seventh" }),
          ticket({ key: "alpha-03", project: "alpha", title: "Third" }),
          ticket({ key: "beta-01", project: "beta", title: "First" }),
        ]}
        onOpen={() => {}}
      />,
    );
    expect([...html.matchAll(/aria-label="Project ([^"]+)"/g)].map((match) => match[1])).toEqual(["alpha", "beta"]);
    // Under the sprint's own heading.
    expect(html).toMatch(/<h4[^>]*>alpha <span[^>]*>2<\/span><\/h4>/);
    expect([...html.matchAll(/<li[^>]*><button[^>]*aria-label="([^"]+)"/g)].map((match) => match[1])).toEqual([
      "alpha-07: Seventh",
      "alpha-03: Third",
      "beta-01: First",
    ]);
    expect(html).not.toMatch(writeControls);
  });

  it("has no control that writes", () => {
    const html = list(closed, new Set([1]));
    expect(html).not.toMatch(writeControls);
    // The only buttons open a sprint or a ticket.
    for (const button of html.match(/<button[^>]*>/g) ?? []) expect(button).toMatch(/aria-expanded|aria-label=/);
  });
});
