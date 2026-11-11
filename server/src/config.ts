import { z } from "zod";
import { wardClientOptionsFromEnv, type WardClientOptions } from "../vendor/ward/ward-auth.js";
import { DEFAULT_STALE_HOURS } from "./store.js";

/** Where the auth plugin's routes sit as Fastify sees them; the browser reaches them under the API prefix. */
export const AUTH_ROUTE_PREFIX = "/auth";

/** The Ward callback, under the API prefix: `WARD_OIDC_REDIRECT_URI` is the origin, the prefix, then this. */
export const WARD_CALLBACK_PATH = `${AUTH_ROUTE_PREFIX}/ward/callback`;

/** The shortest `BRIEF_BOARD_TOKEN` the server accepts: `openssl rand -base64 32` makes 44 characters. */
export const MIN_TOKEN_LENGTH = 32;

/** The server's settings, read once at startup from the environment (and the repo's `.env`). */
export interface Config {
  host: string;
  port: number;
  /** `BRIEF_BOARD_DB` as given, or undefined for the repo's `data/brief-board.sqlite`. */
  dbPath: string | undefined;
  /** The board's own origin as the browser sees it, bare. Default is the Vite dev server. */
  publicOrigin: string;
  /** The API prefix as the browser sees it, and the session cookie's path. Default `/brief-board-api`. */
  apiPrefix: string;
  /** The board's base path, with a trailing slash. Default `/brief-board/` (the web build's `BRIEF_BOARD_BASE`). */
  webBase: string;
  /**
   * "Sign in with Ward": the five `WARD_OIDC_*` settings, or `undefined` when
   * `WARD_OIDC_ISSUER` is unset, and then only local accounts work and the
   * login page shows no Ward button. `clientKey` is a secret: never log it.
   */
  ward: WardClientOptions | undefined;
  /**
   * `AUTH_TRUSTED_PROXIES`, comma-separated: the peers besides loopback whose
   * `X-Forwarded-For` the login lockout believes. Empty is right locally; in a
   * container it is the network the host's proxy reaches it from.
   */
  trustedProxies: string[];
  /**
   * `BRIEF_BOARD_TOKEN`: the CLI's shared secret. Unset, the CLI is shut out
   * and only a signed-in browser reads the board. A secret: never log it.
   */
  token: string | undefined;
  /** `BRIEF_BOARD_STALE_HOURS`: hours without a write on its ticket before a run reads as stale. Default 4. */
  staleHours: number;
}

/** The environment cannot run the server. The message names every variable at fault. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/** An empty value (`KEY=` copied from `.env.example`) counts as not set. */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (typeof value === "string" && value.trim() === "" ? undefined : value), schema.optional());

const envSchema = z.object({
  HOST: optional(z.string()).transform((value) => value ?? "127.0.0.1"),
  PORT: optional(
    z.coerce.number<string>().int().min(1).max(65535, { message: "PORT must be a port number (1-65535)." }),
  ).transform((value) => value ?? 8806),
  BRIEF_BOARD_DB: optional(z.string()),
  PUBLIC_ORIGIN: optional(
    z.string().refine((value) => URL.canParse(value) && new URL(value).origin === value, {
      message: "PUBLIC_ORIGIN must be a bare origin such as https://example.com: no path and no trailing slash.",
    }),
  ).transform((value) => value ?? "http://localhost:5178"),
  BRIEF_BOARD_API_PREFIX: optional(
    z.string().regex(/^\/[^\s?#]*[^/\s?#]$/, {
      message: "BRIEF_BOARD_API_PREFIX must be a path such as /brief-board-api: a leading slash and no trailing slash.",
    }),
  ).transform((value) => value ?? "/brief-board-api"),
  BRIEF_BOARD_BASE: optional(
    z.string().regex(/^\/([^\s?#]*\/)?$/, {
      message: "BRIEF_BOARD_BASE must be a path such as /brief-board/: a leading and a trailing slash.",
    }),
  ).transform((value) => value ?? "/brief-board/"),
  BRIEF_BOARD_STALE_HOURS: optional(
    z.coerce
      .number<string>()
      .positive({ message: "BRIEF_BOARD_STALE_HOURS must be a number of hours above 0, such as 4." }),
  ).transform((value) => value ?? DEFAULT_STALE_HOURS),
  BRIEF_BOARD_TOKEN: optional(
    z
      .string()
      .transform((value) => value.trim())
      .refine((value) => value.length >= MIN_TOKEN_LENGTH, {
        message: `BRIEF_BOARD_TOKEN is shorter than ${MIN_TOKEN_LENGTH} characters, so it is most likely a placeholder. Make one with \`openssl rand -base64 32\`, or leave it empty.`,
      }),
  ),
});

function describe(issue: z.core.$ZodIssue): string {
  const key = String(issue.path[0] ?? "");
  return issue.message.startsWith(key) ? issue.message : `${key}: ${issue.message}`;
}

/**
 * The Ward settings, read by the library's own reader so the rules are its
 * (an empty `WARD_OIDC_ISSUER` means off; with it set, the client id, key and
 * redirect URI must be too). On top: the redirect URI must be the callback
 * under the API prefix, where the session cookie and the dev proxy are.
 * Messages never repeat the key.
 */
function wardSettings(
  env: NodeJS.ProcessEnv,
  apiPrefix: string | undefined,
  problems: string[],
): WardClientOptions | undefined {
  let ward: WardClientOptions | undefined;
  try {
    ward = wardClientOptionsFromEnv(env);
  } catch (error) {
    problems.push(
      `${error instanceof Error ? error.message : String(error)}. Set all of them, or leave WARD_OIDC_ISSUER empty for local accounts only.`,
    );
    return undefined;
  }
  if (ward === undefined || apiPrefix === undefined) return ward;
  const expected = `${apiPrefix}${WARD_CALLBACK_PATH}`;
  if (!URL.canParse(ward.redirectUri) || new URL(ward.redirectUri).pathname !== expected) {
    problems.push(
      `WARD_OIDC_REDIRECT_URI must be the callback as the browser reaches it: the board's origin, then ${expected}.`,
    );
  }
  return ward;
}

/** `AUTH_TRUSTED_PROXIES`, comma-separated, blanks dropped. The plugin checks each entry when it registers. */
function trustedProxies(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
}

/**
 * The settings from `env`, or a `ConfigError` naming every variable that is
 * wrong. Nothing here talks to Ward: the server starts while Ward is down.
 */
export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const problems: string[] = [];
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) problems.push(...parsed.error.issues.map(describe));
  const apiPrefix = parsed.success ? parsed.data.BRIEF_BOARD_API_PREFIX : undefined;
  const ward = wardSettings(env, apiPrefix, problems);
  if (!parsed.success || problems.length > 0) throw new ConfigError(problems.join("\n"));
  const values = parsed.data;
  return {
    host: values.HOST,
    port: values.PORT,
    dbPath: values.BRIEF_BOARD_DB,
    publicOrigin: values.PUBLIC_ORIGIN,
    apiPrefix: values.BRIEF_BOARD_API_PREFIX,
    webBase: values.BRIEF_BOARD_BASE,
    ward,
    trustedProxies: trustedProxies(env.AUTH_TRUSTED_PROXIES),
    token: values.BRIEF_BOARD_TOKEN,
    staleHours: values.BRIEF_BOARD_STALE_HOURS,
  };
}
