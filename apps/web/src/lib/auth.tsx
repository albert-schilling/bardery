import { createAuthClient } from "better-auth/client";
import { emailOTPClient } from "better-auth/client/plugins";
import { createContext, type ReactNode, useContext } from "react";

import { resolveApiUrl } from "~/lib/trpc";

/** Signing in with an email code, and out. Each call rejects with a message for the reader. */
export interface Auth {
  sendCode(email: string): Promise<void>;
  signIn(email: string, code: string): Promise<void>;
  signOut(): Promise<void>;
}

/** What the reader reads when a call fails, by the api's error code or HTTP status. */
function messageFor(error: { code?: string | undefined; status: number }): string {
  if (error.status === 429) return "Too many tries. Wait a while, then try again.";
  switch (error.code) {
    case "INVALID_OTP":
      return "That code isn't right. Check it and try again.";
    case "OTP_EXPIRED":
    case "TOO_MANY_ATTEMPTS":
      return "That code no longer works. Ask for a new one.";
    default:
      return "Something went wrong. Try again.";
  }
}

/** Better Auth's client for the api's `/api/auth` endpoints; the session cookie goes along. */
export function createAuth(fetchImpl: typeof fetch = fetch): Auth {
  const client = createAuthClient({
    baseURL: resolveApiUrl(),
    plugins: [emailOTPClient()],
    fetchOptions: { customFetchImpl: fetchImpl },
  });
  async function call(
    request: Promise<{ error: { code?: string | undefined; status: number } | null }>,
  ) {
    const { error } = await request;
    if (error !== null) throw new Error(messageFor(error));
  }
  return {
    sendCode: (email) => call(client.emailOtp.sendVerificationOtp({ email, type: "sign-in" })),
    signIn: (email, code) => call(client.signIn.emailOtp({ email, otp: code })),
    signOut: () => call(client.signOut()),
  };
}

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ auth, children }: { auth: Auth; children: ReactNode }) {
  return <AuthContext value={auth}>{children}</AuthContext>;
}

export function useAuth(): Auth {
  const auth = useContext(AuthContext);
  if (auth === null) throw new Error("useAuth needs an AuthProvider");
  return auth;
}
