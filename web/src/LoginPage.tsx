import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLogin, useSession, useWardSignIn } from "../vendor/ward/ward-auth-react.js";
import { appBase } from "./base";
import { loginMessage, sessionReasonMessage, wardSignInMessage } from "./messages";

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
    <main className="gate" aria-busy={pending || ward.pending || undefined}>
      <div className="gate-card">
        <h1 className="brand">brief-board</h1>
        <p className="muted">Sign in to see the board.</p>
        {notice !== null && (
          <p className="gate-notice" role="status">
            {notice}
          </p>
        )}

        <form className="login-form" onSubmit={submit} noValidate aria-label="Sign in">
          <label className="field">
            <span>Username</span>
            <input
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
            {missing === "username" && <span className="field-error">Enter your username.</span>}
          </label>
          <label className="field">
            <span>Password</span>
            <input
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
            {missing === "password" && <span className="field-error">Enter your password.</span>}
          </label>
          {error !== null && (
            <p className="auth-error" role="alert">
              {loginMessage(error)}
            </p>
          )}
          <button type="submit" className="button button-primary" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {signedOut?.ward.enabled && (
          <div className="login-ward">
            <p className="login-or" aria-hidden="true">
              or
            </p>
            <button
              type="button"
              className="button"
              disabled={ward.pending}
              onClick={() => void ward.signIn({ returnTo: appBase() })}
            >
              {ward.pending ? "Opening Ward…" : "Sign in with Ward"}
            </button>
          </div>
        )}
        {ward.error !== null && (
          <p className="auth-error" role="alert">
            {wardSignInMessage(ward.error)}{" "}
            <button type="button" className="link-button" onClick={ward.reset}>
              Dismiss
            </button>
          </p>
        )}
      </div>
    </main>
  );
}
