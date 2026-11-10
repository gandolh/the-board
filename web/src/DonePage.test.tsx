import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Ticket } from "@brief-board/shared";
import { DoneList } from "./DonePage";
import { day } from "./time";

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
  sprint: 2,
  ...fields,
});

const list = (tickets: Ticket[], tag = "") => renderToStaticMarkup(<DoneList tickets={tickets} tag={tag} onOpen={() => {}} />);

describe("older Done", () => {
  it("says so when nothing is older than 14 days yet", () => {
    expect(list([])).toBe('<p class="empty">Nothing older than 14 days yet.</p>');
    expect(list([], "ui")).toContain("Nothing older than 14 days yet.");
  });

  it("says when no older ticket carries the tag", () => {
    expect(list([ticket({ tags: ["api"] })], "ui")).toBe('<p class="empty">No ticket older than 14 days carries the tag &quot;ui&quot;.</p>');
  });

  it("groups by project in the order given, a row per ticket with its key, title and the day it reached Done", () => {
    const html = list([
      ticket({ key: "alpha-07", project: "alpha", title: "Seventh", statusChangedAt: "2026-10-22T09:00:00.000Z" }),
      ticket({ key: "alpha-03", project: "alpha", title: "Third", statusChangedAt: "2026-10-12T09:00:00.000Z" }),
      ticket({ key: "beta-01", project: "beta", title: "First", statusChangedAt: "2026-10-15T09:00:00.000Z" }),
    ]);
    const groups = [...html.matchAll(/<section class="done-group" aria-label="Project ([^"]+)">/g)].map((match) => match[1]);
    expect(groups).toEqual(["alpha", "beta"]);
    expect(html).toContain('<h3 class="done-project">alpha <span class="count">2</span></h3>');
    const rows = [...html.matchAll(/<button type="button" class="done-row" aria-label="([^"]+)">/g)].map((match) => match[1]);
    expect(rows).toEqual(["alpha-07: Seventh", "alpha-03: Third", "beta-01: First"]);
    expect(html).toContain('<span class="done-key">alpha-07</span><span class="done-title">Seventh</span>');
    expect(html).toMatch(/<time class="done-date" datetime="2026-10-22T09:00:00.000Z"/i);
    expect(html).toContain(`>${day("2026-10-22T09:00:00.000Z")}</time>`);
  });

  it("keeps only the tickets carrying the tag", () => {
    const html = list(
      [ticket({ key: "p-01", tags: ["ui"] }), ticket({ key: "p-02", tags: ["api"] }), ticket({ key: "q-01", project: "q", tags: ["api"] })],
      "ui",
    );
    expect(html).toContain('aria-label="p-01: A brief"');
    expect(html).not.toContain("p-02");
    expect(html).not.toContain('aria-label="Project q"');
  });
});
