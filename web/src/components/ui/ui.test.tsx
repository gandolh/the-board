import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Collapsible } from "./Collapsible";
import { Panel } from "./Dialog";
import { RadioGroup } from "./RadioGroup";

describe("Collapsible", () => {
  const render = (open: boolean, heading?: "h3") =>
    renderToStaticMarkup(
      <Collapsible open={open} onOpenChange={() => {}} label="Project p" trigger="Name" heading={heading}>
        <p>Inside</p>
      </Collapsible>,
    );

  it("is a named section whose trigger says whether it is open", () => {
    const html = render(true);
    expect(html).toContain('<section aria-label="Project p"');
    expect(html).toMatch(/<button[^>]*aria-expanded="true"/);
    expect(html).toContain("Inside");
  });

  it("closes to a trigger that says so", () => {
    expect(render(false)).toMatch(/<button[^>]*aria-expanded="false"/);
  });

  it("puts the trigger in a heading when asked", () => {
    expect(render(true, "h3")).toMatch(/<h3[^>]*><button/);
  });
});

describe("RadioGroup", () => {
  const options = [
    { value: "a", label: "Alpha" },
    { value: "b", label: "Beta" },
  ] as const;
  const render = (value: "a" | "b" | null) =>
    renderToStaticMarkup(<RadioGroup label="Pick" options={options} value={value} onValueChange={() => {}} />);

  it("is a named group of radios with the chosen one checked", () => {
    const html = render("b");
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-label="Pick"');
    expect(html.match(/role="radio"/g)).toHaveLength(2);
    expect(html.match(/<span[^>]*aria-checked="true"[^>]*>Beta</g)).toHaveLength(1);
  });

  it("checks nothing while the value is null", () => {
    expect(render(null)).not.toContain("<span data-checked");
    expect(render(null)).not.toMatch(/<span[^>]*aria-checked="true"/);
  });
});

describe("Panel", () => {
  it("renders into a portal, so the server markup is empty", () => {
    expect(renderToStaticMarkup(<Panel label="Ticket p-01" onClose={() => {}} />)).toBe("");
  });
});
