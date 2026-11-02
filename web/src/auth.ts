import { configureAuth, getAuthClient, type AuthClient } from "../vendor/ward/ward-auth-react.js";
import { onUnauthorized } from "./api";
import { API_BASE } from "./base";

/**
 * Signing in, from the browser. The board keeps its own accounts and its own
 * session: an opaque `brief_board_session` cookie, HttpOnly, scoped to
 * `/brief-board-api`. The vendored ward-auth hooks (`web/vendor/ward/`) talk
 * to the server's `/auth/*` routes and hold one shared session state, which
 * the gate (`AuthGate.tsx`) renders from; they draw nothing.
 *
 * The client is set up here, once, when the board loads: it reads the result
 * of a Ward round trip (`?ward=linked`, `?ward_error=…`) from the address and
 * takes it out of the address bar. Any API call answered 401 (`api.ts`) asks
 * the server about the session again, which flips the gate to the login page.
 */

/** The auth plugin's routes as the browser sees them. */
export const AUTH_BASE_PATH = `${API_BASE}/auth`;

configureAuth({ basePath: AUTH_BASE_PATH });

/** The client the hooks share. Import it from here, so it is set up before anything asks for it. */
export function authClient(): AuthClient {
  return getAuthClient();
}

onUnauthorized(() => {
  void authClient()
    .refresh()
    .catch(() => undefined);
});
