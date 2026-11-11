import { createHash, timingSafeEqual } from "node:crypto";
import { UNAUTHORIZED, type ErrorBody } from "@brief-board/shared";
import fp from "fastify-plugin";
import { createWardClient, wardAuth, type Accounts, type WardClientOptions } from "../../../vendor/ward/ward-auth.js";
import { AUTH_ROUTE_PREFIX } from "../../config.js";
import { USER_ROLE } from "./accounts.js";

/** The session cookie's name. Unique in the estate: every app shares one origin. */
export const SESSION_COOKIE = "brief_board_session";

/** What the guard takes from the app. */
export interface AuthOptions {
  accounts: Accounts;
  /** The CLI's shared secret. Unset, the bearer path is closed: only a signed-in browser gets in. */
  token: string | undefined;
  /** The board's origin as the browser sees it. */
  publicOrigin: string;
  /** The API prefix as the browser sees it, and the session cookie's path. */
  apiPrefix: string;
  /** The board's base path, with a trailing slash. */
  webBase: string;
  /** "Sign in with Ward". Unset, local accounts only. */
  ward: WardClientOptions | undefined;
  /** Peers besides loopback whose `X-Forwarded-For` the login lockout believes. */
  trustedProxies: readonly string[];
}

/** A path is `prefix` or under it. */
function isUnder(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

export function pathOf(url: string): string {
  return url.split("?")[0] ?? "";
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/**
 * Whether an `Authorization` header carries the token. Both sides are
 * hashed first, so the comparison takes the same time whatever the length.
 */
function bearerMatches(header: string | undefined, expected: Buffer): boolean {
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header ?? "");
  const token = match?.[1];
  if (token === undefined) return false;
  return timingSafeEqual(digest(token), expected);
}

/** The only API route with no session or token: vps-deploy's health check calls it bare. */
const PUBLIC_ROUTES: readonly string[] = ["GET /api/health"];

/** A session's methods under `/api`. Writes are the CLI's, with the token. */
const SESSION_METHODS: ReadonlySet<string> = new Set(["GET", "HEAD"]);

/**
 * The guard, the vendored `wardAuth` plugin, wrapped so it is a root hook:
 * every route registered after it is behind it. Fastify's default request log
 * has the method and URL, never the headers, so neither the token nor the
 * cookie is written anywhere.
 * - `GET /api/health` is open (the deploy's check);
 * - any `/api/*` request with `Authorization: Bearer <token>` passes;
 * - otherwise `/api/*` needs a session, and a session may only read
 *   (`read_only_session`): on a shared origin, a script in another app could
 *   send the owner's cookie, and this keeps the worst case at reading the board;
 * - the library's rename route (`POST /auth/username`) is off: it sits outside
 *   `/api`, so the read-only rule would not cover it, and the board offers no rename;
 * - the board's own files are open, so the login page can load.
 */
export const auth = fp<AuthOptions>(
  async (app, options) => {
    // Checks the settings and imports the key now; talks to Ward only on first use, so the board starts while Ward is down.
    const ward = options.ward && (await createWardClient(options.ward));
    const expected = options.token ? digest(options.token) : undefined;
    await app.register(wardAuth, {
      accounts: options.accounts,
      cookieName: SESSION_COOKIE,
      // The API prefix as the browser sees it: every request that needs the session is under it.
      cookiePath: options.apiPrefix,
      publicOrigin: options.publicOrigin,
      routePrefix: AUTH_ROUTE_PREFIX,
      publicRoutes: PUBLIC_ROUTES,
      // A session only reads; see the notes above.
      allowRename: false,
      isPublic: (request) => {
        const path = pathOf(request.url);
        // The CLI: its token, compared in constant time. With no token configured this path is closed.
        if (isUnder(path, "/api"))
          return expected !== undefined && bearerMatches(request.headers.authorization, expected);
        // The plugin's own list says which sign-in routes are open.
        if (isUnder(path, AUTH_ROUTE_PREFIX)) return false;
        // The board's files, the redirect to them, and a 404: the login page has to load.
        return true;
      },
      validateSession: (_resolved, request) =>
        isUnder(pathOf(request.url), "/api") && !SESSION_METHODS.has(request.method)
          ? { ok: false, reason: "read_only_session" }
          : { ok: true },
      trustedProxies: options.trustedProxies,
      ...(ward && {
        ward: {
          client: ward,
          loginPath: `${options.webBase}login`,
          settingsPath: `${options.webBase}account`,
          afterSignInPath: options.webBase,
          roleFor: () => USER_ROLE,
        },
      }),
    });

    // The guard answers `{ error: "unauthorized" }`; under `/api` the contract's
    // error shape is `{ code, message }`, which the CLI reads for "the board
    // refused the token". The sign-in routes keep the plugin's shape for its hooks.
    app.addHook("onSend", async (request, reply, payload) => {
      if (reply.statusCode !== 401 || typeof payload !== "string" || !isUnder(pathOf(request.url), "/api"))
        return payload;
      let body: unknown;
      try {
        body = JSON.parse(payload);
      } catch {
        return payload;
      }
      if (typeof body !== "object" || body === null || !("error" in body) || "code" in body) return payload;
      const reason = (body as { reason?: unknown }).reason;
      const refused: ErrorBody & { reason?: string } = {
        code: UNAUTHORIZED,
        message:
          reason === "read_only_session"
            ? "a signed-in browser only reads the board; writes need the CLI's token"
            : "sign in, or send the CLI's token as Authorization: Bearer <token>",
        ...(typeof reason === "string" ? { reason } : {}),
      };
      return JSON.stringify(refused);
    });
  },
  { name: "auth" },
);
