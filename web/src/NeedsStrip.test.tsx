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

/** The strip's radios in order: their kind class, text and `aria-checked`. */
const radios = (html: string) =>
  [...html.matchAll(/<span ([^>]*role="radio"[^>]*)>([^<]+)<\/span>/g)].map((m) => ({
    kind: /class="needs-kind needs-([a-z_]+)"/.exec(m[1] ?? "")?.[1],
    text: m[2],
    checked: /aria-checked="(true|false)"/.exec(m[1] ?? "")?.[1],
  }));

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
    const counts = radios(html).map((radio) => [radio.kind, radio.text, radio.checked]);
    expect(counts).toEqual([
      ["question", "2 questions", "false"],
      ["blocked", "1 blocked", "false"],
      ["ready_for_test", "1 to test", "false"],
      ["ready_for_deploy", "1 to deploy", "false"],
    ]);
    expect(html).not.toContain("stale");
    expect(html).not.toContain("Show all");
  });

  it("checks no radio while the filter is off", () => {
    expect(strip([need("question", "p-01")])).not.toContain('aria-checked="true"');
  });

  it("marks the chosen kind and offers to show all again", () => {
    const html = strip([need("question", "p-01"), need("stale_run", "p-03")], "stale_run");
    expect(radios(html)).toEqual([
      { kind: "question", text: "1 question", checked: "false" },
      { kind: "stale_run", text: "1 stale run", checked: "true" },
    ]);
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
    expect(html).toContain("Show all");
  });

  it("is one radio group named Needs you", () => {
    const html = strip([need("question", "p-01"), need("blocked", "p-02")]);
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-label="Needs you"');
  });

  it("filters the board to the chosen kind's tickets, and not at all once that kind is empty", () => {
    const needs = [need("question", "p-01"), need("question", "p-02"), need("blocked", "p-02")];
    expect([...(needKeys(needs, "question") ?? [])]).toEqual(["p-01", "p-02"]);
    expect(needKeys(needs, null)).toBeNull();
    expect(needKeys(needs, "ready_for_test")).toBeNull();
  });
});
