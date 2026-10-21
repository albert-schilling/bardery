import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router";

import { useAuth } from "~/lib/auth";

import "./sign-in-form.scss";

/** Two steps: the Account's email, then the code that was emailed to it. */
export function SignInForm() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  const sendCode = useMutation({
    mutationFn: () => auth.sendCode(email),
    onSuccess: () => setCodeSent(true),
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
    setCodeSent(false);
    setCode("");
    signIn.reset();
  }

  // On the code step, sending a new code can fail too.
  const error = codeSent ? (signIn.error ?? sendCode.error) : sendCode.error;
  return (
    <form className="sign-in-form" onSubmit={submit}>
      <h1 className="sign-in-form__title">Sign in</h1>
      {codeSent ? (
        <>
          <p className="sign-in-form__hint">We emailed a code to {email}.</p>
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
          <button className="sign-in-form__submit" disabled={signIn.isPending}>
            Sign in
          </button>
          <button
            className="sign-in-form__back"
            type="button"
            onClick={sendNewCode}
            disabled={sendCode.isPending}
          >
            Send a new code
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
          <button className="sign-in-form__submit" disabled={sendCode.isPending}>
            Send code
          </button>
        </>
      )}
      {error !== null && (
        <p className="sign-in-form__error" role="alert">
          {error.message}
        </p>
      )}
    </form>
  );
}
