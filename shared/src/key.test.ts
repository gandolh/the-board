import { describe, expect, it } from "vitest";
import { formatKey, keySchema, normalizeKey, parseKey } from "./key.js";

describe("ticket keys", () => {
  it("splits on the last hyphen before the number", () => {
    expect(parseKey("public-resource-map-07")).toEqual({ project: "public-resource-map", number: 7 });
    expect(parseKey("3D-sandbox-12")).toEqual({ project: "3D-sandbox", number: 12 });
  });

  it("keeps capitals in the project", () => {
    expect(parseKey("imbatranimOS-05")).toEqual({ project: "imbatranimOS", number: 5 });
  });

  it("reads padded and unpadded numbers as the same ticket", () => {
    expect(parseKey("sports-app-01")).toEqual(parseKey("sports-app-1"));
    expect(normalizeKey("sports-app-1")).toBe("sports-app-01");
  });

  it("handles three-digit numbers", () => {
    expect(parseKey("imbatranimOS-137")).toEqual({ project: "imbatranimOS", number: 137 });
    expect(formatKey("imbatranimOS", 137)).toBe("imbatranimOS-137");
  });

  it("formats with at least two digits, to match brief filenames", () => {
    expect(formatKey("atrium", 3)).toBe("atrium-03");
    expect(formatKey("atrium", 82)).toBe("atrium-82");
  });

  it("refuses what is not a key", () => {
    for (const bad of ["atrium", "atrium-", "-12", "atrium-12a", "atrium 12", ""]) {
      expect(parseKey(bad)).toBeNull();
    }
  });

  it("the schema normalises a valid key and rejects the rest", () => {
    expect(keySchema.parse("newspapper-105")).toBe("newspapper-105");
    expect(keySchema.parse("trips-4")).toBe("trips-04");
    expect(keySchema.safeParse("no-number").success).toBe(false);
  });
});
