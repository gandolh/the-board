import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { AuthError, useWardLink } from "../vendor/ward/ward-auth-react.js";
import { LinkWard } from "./LinkWard";
import { accountMessage } from "./messages";

type Link = ReturnType<typeof useWardLink>;
const link = (over: Partial<Link> = {}): Link => ({
  link: () => Promise.resolve(true),
  pending: false,
  error: null,
  linked: false,
  reset: () => undefined,
  ...over,
});

describe("Link Ward", () => {
  it("is a password field with the Link Ward button beside it", () => {
    const html = renderToStaticMarkup(<LinkWard link={link()} />);
    expect(html).toContain("Current password");
    expect(html).toContain('type="password"');
    expect(html).toContain('autoComplete="current-password"');
    expect(html).toContain("Link Ward");
    expect(html).not.toContain('role="alert"');
  });

  it("shows a wrong password beside the field, marked invalid", () => {
    const error: AuthError = { code: "invalid_credentials" };
    const html = renderToStaticMarkup(<LinkWard link={link({ error })} />);
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain(accountMessage(error));
  });
});

describe("what a refused link says", () => {
  it("names a wrong password", () => {
    expect(accountMessage({ code: "invalid_credentials" })).toContain("password is wrong");
  });
  it("says how long to wait", () => {
    expect(accountMessage({ code: "too_many_attempts", retryAfterSeconds: 45 })).toBe(
      "Too many tries. Wait 45 seconds, then try again.",
    );
  });
});
