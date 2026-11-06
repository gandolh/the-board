import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Need } from "@brief-board/shared";
import { needKeys, NeedsStrip } from "./NeedsStrip";

const need = (kind: Need["kind"], key: string): Need => ({
  kind,
  key,
  project: "p",
  title: "T",
  status: "blocked",
  reason: "why",
  by: "agent",
  since: "2026-11-06T10:00:00.000Z",
});

describe("the needs strip", () => {
  const strip = (needs: Need[], selected: Need["kind"] | null = null) =>
    renderToStaticMarkup(<NeedsStrip needs={needs} selected={selected} onSelect={() => {}} />);

  it("hides when nothing waits on the owner", () => {
    expect(strip([])).toBe("");
  });

  it("counts each kind in the owner's order, and leaves out the empty ones", () => {
    const html = strip([
      need("ready_for_deploy", "p-05"),
      need("question", "p-01"),
      need("ready_for_test", "p-04"),
      need("question", "p-02"),
      need("blocked", "p-02"),
    ]);
    const counts = [...html.matchAll(/class="needs-kind needs-([a-z_]+)" aria-pressed="false">([^<]+)</g)].map((m) => [m[1], m[2]]);
    expect(counts).toEqual([
      ["question", "2 questions"],
      ["blocked", "1 blocked"],
      ["ready_for_test", "1 to test"],
      ["ready_for_deploy", "1 to deploy"],
    ]);
    expect(html).not.toContain("stale");
    expect(html).not.toContain("Show all");
  });

  it("marks the chosen kind and offers to show all again", () => {
    const html = strip([need("question", "p-01"), need("stale_run", "p-03")], "stale_run");
    expect(html).toContain('class="needs-kind needs-stale_run" aria-pressed="true">1 stale run<');
    expect(html).toContain("Show all");
  });

  it("filters the board to the chosen kind's tickets, and not at all once that kind is empty", () => {
    const needs = [need("question", "p-01"), need("question", "p-02"), need("blocked", "p-02")];
    expect([...(needKeys(needs, "question") ?? [])]).toEqual(["p-01", "p-02"]);
    expect(needKeys(needs, null)).toBeNull();
    expect(needKeys(needs, "ready_for_test")).toBeNull();
  });
});
