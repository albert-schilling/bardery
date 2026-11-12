import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";

import { useAuth } from "~/lib/auth";

import "./sign-out.scss";

/** Who is signed in, and a button to sign out. */
export function SignOut({ email }: { email: string }) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const signOut = useMutation({
    mutationFn: () => auth.signOut(),
    onSuccess: async () => {
      // Nothing the signed-in Account saw stays in the cache for whoever signs in next.
      queryClient.clear();
      await navigate("/sign-in", { replace: true });
    },
  });

  return (
    <div className="sign-out">
      <p className="sign-out__email">Signed in as {email}</p>
      <button
        className="sign-out__button"
        type="button"
        onClick={() => signOut.mutate()}
        disabled={signOut.isPending}
      >
        Sign out
      </button>
      {signOut.isError && (
        <p className="sign-out__error" role="alert">
          {signOut.error.message}
        </p>
      )}
    </div>
  );
}
