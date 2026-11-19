import { useRef, useState, type FormEvent } from "react";
import type { useWardLink } from "../vendor/ward/ward-auth-react.js";
import { BUTTON, FIELD } from "./looks";
import { accountMessage } from "./messages";

/**
 * "Link Ward": the account's password, typed again, and the button that
 * sends the browser to Ward with it. A refusal (a wrong password, too many
 * tries) stays here, beside the field, and the field keeps focus.
 */
export function LinkWard({ link }: { link: ReturnType<typeof useWardLink> }) {
  const [password, setPassword] = useState("");
  const [missing, setMissing] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password === "") {
      setMissing(true);
      input.current?.focus();
      return;
    }
    const started = await link.link(password);
    if (!started) input.current?.focus();
  }

  return (
    <form className="my-3.5 grid gap-2" onSubmit={(event) => void submit(event)} noValidate>
      <label className="grid gap-1.5 text-small font-medium">
        <span>Current password</span>
        <input
          className={FIELD}
          ref={input}
          name="current-password"
          type="password"
          autoComplete="current-password"
          value={password}
          aria-invalid={missing || link.error !== null || undefined}
          onChange={(event) => {
            setPassword(event.target.value);
            setMissing(false);
          }}
        />
      </label>
      {missing && (
        <p className="font-medium text-danger" role="alert">
          Enter your password to link Ward.
        </p>
      )}
      {link.error !== null && (
        <p className="font-medium text-danger" role="alert">
          {accountMessage(link.error)}
        </p>
      )}
      <div>
        <button type="submit" className={BUTTON} disabled={link.pending}>
          {link.pending ? "Opening Ward…" : "Link Ward"}
        </button>
      </div>
    </form>
  );
}
