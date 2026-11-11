import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLogin, useSession, useWardSignIn } from "../vendor/ward/ward-auth-react.js";
import { appBase } from "./base";
import { BRAND, BUTTON, BUTTON_PRIMARY, GATE, GATE_CARD, NOTICE } from "./looks";
import { loginMessage, sessionReasonMessage, wardSignInMessage } from "./messages";

/** A text field: the border turns red when the entry is missing. */
const INPUT = "rounded-box border border-line bg-surface px-2.5 py-2 text-ink aria-invalid:border-danger";

/**
 * The login page: username, password and "Sign in", and "Sign in with Ward"
 * under them when the server has Ward. No sign-up link: the owner's account
 * comes from the seed (`npm run seed`), and anyone else through Ward once
 * the owner grants them brief-board there. A Ward round trip that failed comes
 * back as `?ward_error=`, which the hooks turn into the message under the
 * Ward button.
 */
export function LoginPage() {
  const session = useSession();
  const { login, pending, error } = useLogin();
  const ward = useWardSignIn();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [missing, setMissing] = useState<"username" | "password" | null>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = "Sign in · brief-board";
  }, []);

  const signedOut = session.status === "signed_out" ? session : null;
  const notice = sessionReasonMessage(signedOut?.reason);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    const name = username.trim();
    const empty = name === "" ? "username" : password === "" ? "password" : null;
    setMissing(empty);
    if (empty !== null) {
      (empty === "username" ? usernameRef : passwordRef).current?.focus();
      return;
    }
    void login(name, password).then((signedIn) => {
      if (signedIn) {
        // A Ward failure the page was showing is moot now.
        ward.reset();
        return;
      }
      setPassword("");
      passwordRef.current?.focus();
    });
  };

  return (
    <main className={GATE} aria-busy={pending || ward.pending || undefined}>
      <div className={GATE_CARD}>
        <h1 className={BRAND}>brief-board</h1>
        <p className="text-ink-muted">Sign in to see the board.</p>
        {notice !== null && (
          <p className={NOTICE} role="status">
            {notice}
          </p>
        )}

        <form className="flex flex-col gap-3" onSubmit={submit} noValidate aria-label="Sign in">
          <label className="flex flex-col gap-1 text-ink-muted">
            <span>Username</span>
            <input
              className={INPUT}
              ref={usernameRef}
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
              value={username}
              aria-invalid={missing === "username" || undefined}
              onChange={(event) => {
                setUsername(event.target.value);
                if (missing === "username") setMissing(null);
              }}
            />
            {missing === "username" && <span className="text-danger">Enter your username.</span>}
          </label>
          <label className="flex flex-col gap-1 text-ink-muted">
            <span>Password</span>
            <input
              className={INPUT}
              ref={passwordRef}
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              aria-invalid={missing === "password" || undefined}
              onChange={(event) => {
                setPassword(event.target.value);
                if (missing === "password") setMissing(null);
              }}
            />
            {missing === "password" && <span className="text-danger">Enter your password.</span>}
          </label>
          {error !== null && (
            <p className="text-danger" role="alert">
              {loginMessage(error)}
            </p>
          )}
          <button type="submit" className={BUTTON_PRIMARY} disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {signedOut?.ward.enabled && (
          <div className="flex flex-col gap-2">
            <p className="text-center text-ink-muted" aria-hidden="true">
              or
            </p>
            <button
              type="button"
              className={BUTTON}
              disabled={ward.pending}
              onClick={() => void ward.signIn({ returnTo: appBase() })}
            >
              {ward.pending ? "Opening Ward…" : "Sign in with Ward"}
            </button>
          </div>
        )}
        {ward.error !== null && (
          <p className="text-danger" role="alert">
            {wardSignInMessage(ward.error)}{" "}
            <button type="button" className="cursor-pointer text-accent underline" onClick={ward.reset}>
              Dismiss
            </button>
          </p>
        )}
      </div>
    </main>
  );
}
