import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ThemeSwitch } from "./ThemeSwitch";

describe("the theme switch", () => {
  const html = renderToStaticMarkup(<ThemeSwitch />);

  it("is one radio group named Theme, with Light, Dark and System", () => {
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-label="Theme"');
    const radios = [...html.matchAll(/<span [^>]*role="radio"[^>]*aria-checked="(true|false)"[^>]*>([^<]+)<\/span>/g)];
    expect(radios.map((match) => match[2])).toEqual(["Light", "Dark", "System"]);
  });

  it("starts on Light, the first visit's theme", () => {
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-checked="true"[^>]*>Light</);
  });
});
