import { describe, expect, it } from "vitest";
import type { Need } from "./api.js";
import { groupNeeds, needCountText } from "./needs.js";

describe("the needs list's words", () => {
  it("counts each kind the way the strip and the CLI say it", () => {
    expect(needCountText("question", 1)).toBe("1 question");
    expect(needCountText("question", 3)).toBe("3 questions");
    expect(needCountText("blocked", 2)).toBe("2 blocked");
    expect(needCountText("stale_run", 2)).toBe("2 stale runs");
    expect(needCountText("ready_for_test", 1)).toBe("1 to test");
    expect(needCountText("ready_for_deploy", 7)).toBe("7 to deploy");
  });

  it("groups by kind in the owner's order and drops the empty kinds", () => {
    const need = (kind: Need["kind"], key: string): Need => ({
      kind,
      key,
      project: "p",
      title: "T",
      status: "blocked",
      reason: "r",
      by: "agent",
      since: "2026-11-06T10:00:00.000Z",
    });
    const groups = groupNeeds([need("ready_for_deploy", "p-03"), need("question", "p-01"), need("question", "p-02")]);
    expect(groups.map((group) => [group.kind, group.needs.map((n) => n.key)])).toEqual([
      ["question", ["p-01", "p-02"]],
      ["ready_for_deploy", ["p-03"]],
    ]);
  });
});
