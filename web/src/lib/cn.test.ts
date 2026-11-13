import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("keeps a colour and a size that share the text- prefix", () => {
    expect(cn("text-ink-muted", "text-body")).toBe("text-ink-muted text-body");
    expect(cn("text-body", "text-ink-muted")).toBe("text-body text-ink-muted");
  });

  it("lets a later size or colour win over an earlier one", () => {
    expect(cn("text-body", "text-meta")).toBe("text-meta");
    expect(cn("text-ink", "text-accent")).toBe("text-accent");
  });

  it("keeps a line height beside a later size", () => {
    expect(cn("leading-none", "text-meta")).toBe("leading-none text-meta");
  });

  it("knows the app's radii, shadows, weights and z values", () => {
    expect(cn("rounded-badge", "rounded-pill")).toBe("rounded-pill");
    expect(cn("shadow-card", "shadow-panel")).toBe("shadow-panel");
    expect(cn("font-semibold", "font-strong")).toBe("font-strong");
    expect(cn("z-top", "z-panel")).toBe("z-panel");
    expect(cn("rounded-card", "rounded-band")).toBe("rounded-band");
    expect(cn("shadow-panel", "shadow-sheet")).toBe("shadow-sheet");
  });

  it("drops falsy values", () => {
    expect(cn("p-1", false, undefined, "p-2")).toBe("p-2");
  });
});
