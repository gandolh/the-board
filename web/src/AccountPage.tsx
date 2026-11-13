import { useEffect } from "react";
import { useLogout, useSession, useWardLink, useWardResult, useWardSignOut } from "../vendor/ward/ward-auth-react.js";
import { BUTTON, FACTS, NOTICE } from "./looks";
import { cn } from "./lib/cn";
import { accountMessage } from "./messages";
import { navigate } from "./route";
import { ThemeSwitch } from "./ThemeSwitch";
import { BottomBar } from "./TopBar";

/**
 * The account page: who is signed in and how, "Link Ward" when the server
 * has Ward and this account has none, and sign-out. Nothing here changes the
 * board; the board only reads (decisions.md). A Ward link comes back here as
 * `?ward=linked` or `?ward_error=…`, which `useWardResult` reads.
 */
export function AccountPage() {
  const session = useSession();
  const link = useWardLink();
  const result = useWardResult();
  const logout = useLogout();
  const wardSignOut = useWardSignOut();

  useEffect(() => {
    document.title = "Account · brief-board";
  }, []);

  if (session.status !== "signed_in") return null;
  const { user, ward } = session;
  const viaWard = session.session.origin === "ward";
  const failure = link.error ?? result.error ?? logout.error ?? wardSignOut.error;

  return (
    <>
      <main className="mx-auto max-w-140 p-6 pb-10 phone:px-4 phone:pb-22">
        <p className="my-3.5">
          <a
            className="font-medium text-ink underline underline-offset-[3px]"
            href="."
            onClick={(event) => {
              event.preventDefault();
              navigate("board");
            }}
          >
            ← Back to the board
          </a>
        </p>
        <h2 className="my-4 text-display">Account</h2>
        <dl
          className={cn(
            FACTS,
            "items-baseline rounded-band border border-well-edge bg-surface-sunk px-4 py-3 dark:border-line",
          )}
        >
          <dt>Signed in as</dt>
          <dd>{user.username}</dd>
          <dt>Signed in with</dt>
          <dd>{viaWard ? "Ward" : "your brief-board password"}</dd>
          {ward.enabled && (
            <>
              <dt>Ward</dt>
              <dd>{ward.linked || link.linked || result.result === "linked" ? "Linked" : "Not linked"}</dd>
            </>
          )}
          <dt>Theme</dt>
          <dd>
            <ThemeSwitch />
          </dd>
        </dl>

        {result.result === "linked" && (
          <p className={cn("my-3.5", NOTICE)} role="status">
            Ward is linked. You can sign in with it from now on.
          </p>
        )}
        {failure && (
          <p className="my-3.5 font-medium text-danger" role="alert">
            {accountMessage(failure)}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {ward.enabled && !ward.linked && !link.linked && (
            <button type="button" className={BUTTON} disabled={link.pending} onClick={() => void link.link()}>
              {link.pending ? "Opening Ward…" : "Link Ward"}
            </button>
          )}
          <button type="button" className={BUTTON} disabled={logout.pending} onClick={() => void logout.logout()}>
            Sign out
          </button>
          {viaWard && (
            <button
              type="button"
              className={BUTTON}
              disabled={wardSignOut.pending}
              onClick={() => void wardSignOut.signOut()}
            >
              Sign out of Ward too
            </button>
          )}
        </div>
      </main>
      <BottomBar page="account" />
    </>
  );
}
