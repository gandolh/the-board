import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getTheme, setTheme, THEME_KEY } from "./theme";

const fakeDocument = () => ({ documentElement: { dataset: {} as Record<string, string> } });
const fakeStorage = (stored: Record<string, string> = {}, writes: string[] = []) => ({
  getItem: (key: string) => stored[key] ?? null,
  setItem: (key: string, value: string) => {
    writes.push(key);
    stored[key] = value;
  },
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

/** Loads the store fresh, since it reads storage once when the module loads. */
async function loadStore(stored: Record<string, string>) {
  const writes: string[] = [];
  vi.resetModules();
  vi.stubGlobal("window", {});
  vi.stubGlobal("document", fakeDocument());
  vi.stubGlobal("localStorage", fakeStorage(stored, writes));
  const store = await import("./theme");
  return { ...store, writes };
}

describe("the theme store", () => {
  it("sets data-theme on <html>, keeps the choice, and says what is in force", () => {
    const doc = fakeDocument();
    const stored: Record<string, string> = {};
    vi.stubGlobal("document", doc);
    vi.stubGlobal("localStorage", fakeStorage(stored));
    for (const theme of ["dark", "system", "light"] as const) {
      setTheme(theme);
      expect(doc.documentElement.dataset.theme).toBe(theme);
      expect(stored[THEME_KEY]).toBe(theme);
      expect(getTheme()).toBe(theme);
    }
  });

  it("still applies the choice when storage is blocked", () => {
    const doc = fakeDocument();
    vi.stubGlobal("document", doc);
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(() => setTheme("dark")).not.toThrow();
    expect(doc.documentElement.dataset.theme).toBe("dark");
  });
});

describe("the stored choice at start-up", () => {
  it("keeps the choice under brief-board.theme", () => {
    expect(THEME_KEY).toBe("brief-board.theme");
  });

  it("prefers brief-board.theme over the bare theme key", async () => {
    const stored = { "brief-board.theme": "light", theme: "dark" };
    const { getTheme: read, writes } = await loadStore(stored);
    expect(read()).toBe("light");
    expect(writes).toEqual([]);
  });

  it("carries a bare dark over once, writing only brief-board.theme", async () => {
    const stored: Record<string, string> = { theme: "dark" };
    const { getTheme: read, writes } = await loadStore(stored);
    expect(read()).toBe("dark");
    expect(stored["brief-board.theme"]).toBe("dark");
    expect(stored.theme).toBe("dark");
    expect(writes).toEqual(["brief-board.theme"]);
  });

  it("reads an unknown value, in either key, as light and writes nothing", async () => {
    const cases: Record<string, string>[] = [
      { theme: "sepia" },
      { "brief-board.theme": "sepia" },
      { "brief-board.theme": "sepia", theme: "sepia" },
      {},
    ];
    for (const stored of cases) {
      const { getTheme: read, writes } = await loadStore({ ...stored });
      expect(read()).toBe("light");
      expect(writes).toEqual([]);
    }
  });

  it("falls back to the bare key when brief-board.theme is unknown", async () => {
    const { getTheme: read } = await loadStore({ "brief-board.theme": "sepia", theme: "system" });
    expect(read()).toBe("system");
  });

  it("never writes the bare key when a theme is picked", async () => {
    const stored: Record<string, string> = { theme: "dark" };
    const { setTheme: set, writes } = await loadStore(stored);
    set("light");
    expect(stored).toEqual({ theme: "dark", "brief-board.theme": "light" });
    expect(writes.every((key) => key === "brief-board.theme")).toBe(true);
  });
});

describe("the boot script in index.html", () => {
  const source = /<script>([\s\S]*?)<\/script>/.exec(
    readFileSync(new URL("../../index.html", import.meta.url), "utf8"),
  )?.[1];
  const boot = (storage: unknown): string | undefined => {
    const doc = fakeDocument();
    new Function("localStorage", "document", source ?? "")(storage, doc);
    return doc.documentElement.dataset.theme;
  };
  const key = "brief-board.theme";

  it("is there", () => {
    expect(source).toBeTruthy();
  });

  it("maps each stored choice to the attribute", () => {
    expect(boot(fakeStorage({ [key]: "dark" }))).toBe("dark");
    expect(boot(fakeStorage({ [key]: "system" }))).toBe("system");
    expect(boot(fakeStorage({ [key]: "light" }))).toBe("light");
  });

  it("prefers its own key over the bare one", () => {
    expect(boot(fakeStorage({ [key]: "light", theme: "dark" }))).toBe("light");
  });

  it("carries a bare value over once, writing only its own key", () => {
    const stored: Record<string, string> = { theme: "dark" };
    const writes: string[] = [];
    expect(boot(fakeStorage(stored, writes))).toBe("dark");
    expect(stored[key]).toBe("dark");
    expect(writes).toEqual([key]);
  });

  it("is light on a first visit, for an unknown value, and when storage is blocked", () => {
    expect(boot(fakeStorage())).toBe("light");
    expect(boot(fakeStorage({ [key]: "sepia" }))).toBe("light");
    expect(boot(fakeStorage({ theme: "sepia" }))).toBe("light");
    expect(
      boot({
        getItem: () => {
          throw new Error("blocked");
        },
      }),
    ).toBe("light");
  });
});
