import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getTheme, setTheme, THEME_KEY } from "./theme";

const fakeDocument = () => ({ documentElement: { dataset: {} as Record<string, string> } });
const fakeStorage = (stored: Record<string, string> = {}) => ({
  getItem: (key: string) => stored[key] ?? null,
  setItem: (key: string, value: string) => {
    stored[key] = value;
  },
});

afterEach(() => vi.unstubAllGlobals());

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

describe("the boot script in index.html", () => {
  const source = /<script>([\s\S]*?)<\/script>/.exec(
    readFileSync(new URL("../../index.html", import.meta.url), "utf8"),
  )?.[1];
  const boot = (storage: unknown): string | undefined => {
    const doc = fakeDocument();
    new Function("localStorage", "document", source ?? "")(storage, doc);
    return doc.documentElement.dataset.theme;
  };

  it("is there", () => {
    expect(source).toBeTruthy();
  });

  it("maps each stored choice to the attribute", () => {
    expect(boot(fakeStorage({ theme: "dark" }))).toBe("dark");
    expect(boot(fakeStorage({ theme: "system" }))).toBe("system");
    expect(boot(fakeStorage({ theme: "light" }))).toBe("light");
  });

  it("is light on a first visit, for an unknown value, and when storage is blocked", () => {
    expect(boot(fakeStorage())).toBe("light");
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
