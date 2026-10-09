import { describe, expect, it } from "vitest";
import { PRODUCT } from "./index.js";

// A smoke test, so `npm test` has something to run until brief 02 brings real
// ones: Vitest exits 1 when it finds no tests at all.
describe("@brief-board/shared", () => {
  it("names the product", () => {
    expect(PRODUCT).toBe("brief-board");
  });
});
