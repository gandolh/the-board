import { describe, expect, it } from "vitest";
import { boardQuerySchema, moveRequestSchema, syncRequestSchema, ticketSchema, upsertTicketRequestSchema } from "./api.js";

const now = new Date().toISOString();

describe("the API contract", () => {
  it("parses a ticket", () => {
    const ticket = {
      key: "atrium-82",
      project: "atrium",
      number: 82,
      title: "The Jukebox page",
      summary: "A remote for the Discord bot.",
      summarySource: "sync",
      briefPath: "corpus/briefs/done/82-jukebox-page.md",
      tags: ["jukebox"],
      status: "done",
      hidden: false,
      createdAt: now,
      updatedAt: now,
      statusChangedAt: now,
    };
    expect(ticketSchema.parse(ticket)).toEqual(ticket);
  });

  it("defaults the board to 14 days of Done", () => {
    expect(boardQuerySchema.parse({})).toEqual({ doneDays: 14 });
    expect(boardQuerySchema.parse({ doneDays: "30", tag: "ui" })).toEqual({ doneDays: 30, tag: "ui" });
  });

  it("defaults a ticket's tags to none", () => {
    expect(upsertTicketRequestSchema.parse({ title: "T", summary: "", briefPath: "corpus/briefs/todo/01-t.md" }).tags).toEqual([]);
  });

  it("rejects a move to a status that does not exist", () => {
    expect(moveRequestSchema.safeParse({ to: "closed" }).success).toBe(false);
  });

  it("takes a brief's state as todo, done or superseded only", () => {
    const brief = { number: 1, title: "T", summary: "", briefPath: "corpus/briefs/todo/01-t.md" };
    expect(syncRequestSchema.safeParse({ projects: [{ project: "p", briefs: [{ ...brief, state: "done" }] }] }).success).toBe(true);
    expect(syncRequestSchema.safeParse({ projects: [{ project: "p", briefs: [{ ...brief, state: "archived" }] }] }).success).toBe(false);
  });
});
