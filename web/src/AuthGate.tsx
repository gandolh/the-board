import { useEffect, type ReactNode } from "react";
import { useSession } from "../vendor/ward/ward-auth-react.js";
import { LoginPage } from "./LoginPage";
import { BRAND, BUTTON, GATE, GATE_CARD } from "./looks";
import { navigate, usePage } from "./route";

/**
 * The session gate around the board. The vendored hooks hold the session
 * (`useSession`: one shared state, asked of `GET /brief-board-api/auth/session`):
 *
 * - loading: a quiet "Loading…";
 * - signed out: the address becomes `/brief-board/login` and the login page
 *   shows, with the reason when a session just ended;
 * - signed in: the board, or the account page. On `/login` (just signed in,
 *   or a bookmark) it goes on to the board;
 * - the session question failing (the server is down): a line saying so, and
 *   Try again.
 *
 * Any API call answered 401 asks about the session again (`auth.ts`), so a
 * session that ends while the board is open lands on the login page too.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const session = useSession();
  switch (session.status) {
    case "loading":
      return (
        <main className={GATE} aria-busy="true">
          <p className="text-ink-muted">Loading…</p>
        </main>
      );
    case "error":
      return (
        <main className={GATE}>
          <div className={GATE_CARD}>
            <h1 className={BRAND}>brief-board</h1>
            <p role="alert">brief-board can't be reached. Check your connection and try again.</p>
            <button type="button" className={BUTTON} onClick={() => void session.refresh()}>
              Try again
            </button>
          </div>
        </main>
      );
    case "signed_out":
      return <SignedOut />;
    case "signed_in":
      return <SignedIn>{children}</SignedIn>;
  }
}

function SignedOut() {
  const atLogin = usePage() === "login";
  useEffect(() => {
    if (!atLogin) navigate("login", { replace: true });
  }, [atLogin]);
  return <LoginPage />;
}

function SignedIn({ children }: { children: ReactNode }) {
  const atLogin = usePage() === "login";
  useEffect(() => {
    if (atLogin) navigate("board", { replace: true });
  }, [atLogin]);
  // Nothing for the instant `/login` is replaced, so the board never mounts on it.
  return atLogin ? null : children;
}
