import { describe, expect, it } from "vitest";
import { pageOf } from "./route";

describe("pages by path", () => {
  const base = "/brief-board/";

  it("maps done, login and account to their pages, with or without a trailing slash", () => {
    expect(pageOf("/brief-board/done", base)).toBe("done");
    expect(pageOf("/brief-board/done/", base)).toBe("done");
    expect(pageOf("/brief-board/login", base)).toBe("login");
    expect(pageOf("/brief-board/account", base)).toBe("account");
  });

  it("maps the base, and anything else under it or outside it, to the board", () => {
    expect(pageOf("/brief-board/", base)).toBe("board");
    expect(pageOf("/brief-board/done/more", base)).toBe("board");
    expect(pageOf("/brief-board/Done", base)).toBe("board");
    expect(pageOf("/done", base)).toBe("board");
  });
});
