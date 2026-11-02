import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "./config.js";

describe("the server's settings", () => {
  it("has defaults for local development, with no token and no Ward", () => {
    expect(loadConfig({})).toEqual({
      host: "127.0.0.1",
      port: 8806,
      dbPath: undefined,
      publicOrigin: "http://localhost:5178",
      apiPrefix: "/brief-board-api",
      webBase: "/brief-board/",
      ward: undefined,
      trustedProxies: [],
      token: undefined,
    });
  });

  it("treats an empty value as unset, and splits the trusted proxies", () => {
    const config = loadConfig({ BRIEF_BOARD_TOKEN: "", PUBLIC_ORIGIN: " ", AUTH_TRUSTED_PROXIES: "172.16.0.0/12, ,10.0.0.1" });
    expect(config.token).toBeUndefined();
    expect(config.publicOrigin).toBe("http://localhost:5178");
    expect(config.trustedProxies).toEqual(["172.16.0.0/12", "10.0.0.1"]);
  });

  it("refuses a token under 32 characters, naming the variable", () => {
    expect(() => loadConfig({ BRIEF_BOARD_TOKEN: "changeme" })).toThrow(ConfigError);
    expect(() => loadConfig({ BRIEF_BOARD_TOKEN: "changeme" })).toThrow(/BRIEF_BOARD_TOKEN/);
    expect(loadConfig({ BRIEF_BOARD_TOKEN: ` ${"a".repeat(32)} ` }).token).toBe("a".repeat(32));
  });

  it("names every bad variable at once", () => {
    try {
      loadConfig({ PORT: "99999", PUBLIC_ORIGIN: "https://example.com/board", BRIEF_BOARD_BASE: "/brief-board" });
      expect.unreachable();
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain("PORT");
      expect(message).toContain("PUBLIC_ORIGIN");
      expect(message).toContain("BRIEF_BOARD_BASE");
    }
  });

  it("wants all of Ward's settings or none, and the callback under the API prefix", () => {
    expect(() => loadConfig({ WARD_OIDC_ISSUER: "http://localhost:8792/ward-api/oidc" })).toThrow(ConfigError);
  });
});
