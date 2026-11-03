import { describe, expect, it } from "vitest";
import { formatKey, formatTodoKey, keySchema, normalizeKey, parseKey, parseTodoKey, ticketKeySchema } from "./key.js";

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

describe("todo keys", () => {
  it("round-trips <project>:<slug>", () => {
    expect(formatTodoKey("imbatranimOS", "linux-apps-sound")).toBe("imbatranimOS:linux-apps-sound");
    expect(parseTodoKey("imbatranimOS:linux-apps-sound")).toEqual({ project: "imbatranimOS", slug: "linux-apps-sound" });
    expect(parseTodoKey("3D-sandbox:walls-step-2")).toEqual({ project: "3D-sandbox", slug: "walls-step-2" });
  });

  it("never reads as a brief key, even when the slug ends in digits", () => {
    for (const key of ["3D-sandbox:walls-step-2", "atrium:12", "p:step-07"]) {
      expect(parseKey(key)).toBeNull();
      expect(keySchema.safeParse(key).success).toBe(false);
    }
  });

  it("refuses what is not a todo key", () => {
    for (const bad of ["atrium", "atrium:", ":slug", "atrium-12", "a:b:c", "a:has space", ""]) {
      expect(parseTodoKey(bad)).toBeNull();
    }
  });

  it("the ticket routes take either form, a brief key normalised", () => {
    expect(ticketKeySchema.parse("trips-4")).toBe("trips-04");
    expect(ticketKeySchema.parse("trips:a-new-city")).toBe("trips:a-new-city");
    expect(ticketKeySchema.safeParse("trips").success).toBe(false);
  });
});
