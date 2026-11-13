import { signInCodeLifetimeMinutes } from "@bardery/schemas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router";

import { useAuth } from "~/lib/auth";

import "./sign-in-form.scss";

/** A time of day in the reader's own locale and time zone, which only the browser knows. */
function timeOfDay(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Two steps: the Account's email, then the code that was emailed to it. */
export function SignInForm() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  // When the latest code was sent: an email can arrive minutes late, so the screen says how long the
  // code works, and that an earlier email's code doesn't.
  const [codeSentAt, setCodeSentAt] = useState<Date | null>(null);
  const codeSent = codeSentAt !== null;
  // So a resend that worked says so, and isn't clicked again for nothing.
  const [resent, setResent] = useState(false);

  const sendCode = useMutation({
    mutationFn: () => auth.sendCode(email),
    onSuccess: () => {
      setResent(codeSent);
      setCodeSentAt(new Date());
    },
  });
  const signIn = useMutation({
    mutationFn: () => auth.signIn(email, code),
    onSuccess: async () => {
      // Answers cached while signed out, such as `me` failing, would hold the new Account back.
      queryClient.clear();
      await navigate("/", { replace: true });
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (codeSent) signIn.mutate();
    else sendCode.mutate();
  }

  function sendNewCode() {
    setCode("");
    signIn.reset();
    sendCode.mutate();
  }

  function useAnotherEmail() {
    setCodeSentAt(null);
    setResent(false);
    setCode("");
    signIn.reset();
    sendCode.reset();
  }

  // One request at a time: a new code sent while signing in would replace the code being checked.
  const busy = sendCode.isPending || signIn.isPending;
  // What the busy button says, repeated in a live region so screen readers announce it too.
  let pendingLabel = "";
  if (signIn.isPending) pendingLabel = "Signing in…";
  else if (sendCode.isPending) pendingLabel = codeSent ? "Sending a new code…" : "Sending code…";

  // On the code step, sending a new code can fail too.
  const error = codeSent ? (signIn.error ?? sendCode.error) : sendCode.error;
  return (
    <form className="sign-in-form" onSubmit={submit}>
      <h1 className="sign-in-form__title">Sign in</h1>
      {codeSentAt !== null ? (
        <>
          {/* A live region: a resend changes this text, and screen readers should announce it. */}
          <p className="sign-in-form__hint" role="status">
            We emailed {resent ? "a new code" : "a code"} to {email} at {timeOfDay(codeSentAt)}. It
            works until{" "}
            {timeOfDay(new Date(codeSentAt.getTime() + signInCodeLifetimeMinutes * 60_000))}
            {resent ? ", and earlier codes no longer do." : "."}
          </p>
          <label className="sign-in-form__field">
            Code
            <input
              className="sign-in-form__input"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
            />
          </label>
          <button className="sign-in-form__submit" disabled={busy}>
            {signIn.isPending ? pendingLabel : "Sign in"}
          </button>
          <button
            className="sign-in-form__back"
            type="button"
            onClick={sendNewCode}
            disabled={busy}
          >
            {sendCode.isPending ? pendingLabel : "Send a new code"}
          </button>
          <button className="sign-in-form__back" type="button" onClick={useAnotherEmail}>
            Use another email
          </button>
        </>
      ) : (
        <>
          <label className="sign-in-form__field">
            Email
            <input
              className="sign-in-form__input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <button className="sign-in-form__submit" disabled={busy}>
            {sendCode.isPending ? pendingLabel : "Send code"}
          </button>
        </>
      )}
      <p className="visually-hidden" role="status">
        {pendingLabel}
      </p>
      {error !== null && (
        <p className="sign-in-form__error" role="alert">
          {error.message}
        </p>
      )}
    </form>
  );
}
