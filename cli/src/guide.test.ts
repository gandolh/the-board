import { describe, expect, it } from "vitest";
import { MOVES } from "@brief-board/shared";
import { renderGuide } from "./commands/guide.js";

const guide = renderGuide(new URL("../", import.meta.url));

describe("the guide", () => {
  it("lists every move in shared's table, with its message rule", () => {
    for (const rule of MOVES) {
      expect(guide).toMatch(new RegExp(`${rule.from} -> ${rule.to}\\s+[a-z ]+, ${rule.message}`));
    }
    expect(guide).not.toContain("{{moves}}");
  });

  it("covers every topic the brief names", () => {
    for (const topic of [
      "## 1. What the board is",
      "## 2. Filing a brief",
      "## 3. Starting or resuming",
      "## 4. Blocking",
      "## 5. Finishing",
      "## 6. When the owner reports back",
      "## 7. When the board is down",
      "## 8. Hard rules",
      "## 9. The moves",
    ]) {
      expect(guide).toContain(topic);
    }
  });

  it("stays short enough to read before every brief", () => {
    expect(guide.split("\n").length).toBeLessThanOrEqual(80);
  });
});
