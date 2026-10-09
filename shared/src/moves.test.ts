import { describe, expect, it } from "vitest";
import { checkMove, MOVES, movesFrom } from "./moves.js";
import { STATUSES, type Status } from "./status.js";

describe("the move table", () => {
  it("has the twelve moves decisions.md lists", () => {
    expect(MOVES).toHaveLength(12);
  });

  for (const rule of MOVES) {
    const name = `${rule.from} → ${rule.to}`;
    it(`${name} is allowed with a message`, () => {
      expect(checkMove(rule.from, rule.to, "a message")).toEqual({ ok: true, rule });
    });
    if (rule.message === "required") {
      it(`${name} needs its ${rule.role}`, () => {
        for (const missing of [undefined, null, "", "   \n"]) {
          const result = checkMove(rule.from, rule.to, missing);
          expect(result).toMatchObject({ ok: false, code: "message_required" });
        }
      });
    } else {
      it(`${name} goes through without a message`, () => {
        expect(checkMove(rule.from, rule.to)).toEqual({ ok: true, rule });
      });
    }
  }
});

describe("moves the table does not list", () => {
  const unlisted: [Status, Status][] = [
    ["todo", "blocked"],
    ["todo", "done"],
    ["todo", "ready_for_test"],
    ["blocked", "ready_for_test"],
    ["ready_for_deploy", "ready_for_test"],
    ["done", "in_progress"],
    ["done", "todo"],
  ];
  for (const [from, to] of unlisted) {
    it(`${from} → ${to} is move_not_allowed, and says what is`, () => {
      const result = checkMove(from, to, "even with a message");
      expect(result).toMatchObject({ ok: false, code: "move_not_allowed" });
      if (!result.ok) expect(result.allowed).toEqual(movesFrom(from));
    });
  }

  it("staying in the same status is never a move", () => {
    for (const status of STATUSES) {
      expect(checkMove(status, status, "note")).toMatchObject({ ok: false, code: "move_not_allowed" });
    }
  });

  it("nothing moves out of Done", () => {
    expect(movesFrom("done")).toEqual([]);
  });
});
